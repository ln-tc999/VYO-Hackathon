// ============================================================
// Automation Monitor Service
// Runs in background to monitor goals and trigger automation
// ============================================================

import { createVyoRouterService, type VyoRouterService } from '../contracts/vyoRouter.js';
import { yoService } from '../yo-sdk/client.js';

interface GoalState {
    id: string;
    owner: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    deadline: number;
    riskLevel: number;
    active: boolean;
    lastCompoundTime?: number;
    automationConfig?: AutomationConfig;
}

interface AutomationConfig {
    enabled: boolean;
    autoCompound: boolean;
    autoRebalance: boolean;
    compoundIntervalDays: number;
    rebalanceThresholdBps: number;
    minCompoundAmount: number;
}

interface AutomationDecision {
    goalId: string;
    action: 'compound' | 'rebalance' | 'alert';
    reason: string;
    priority: 'high' | 'medium' | 'low';
    estimatedYield?: number;
    gasCost?: number;
    autoExecutable: boolean;
}

class AutomationMonitorService {
    private vyoRouter: VyoRouterService;
    private checkInterval: number = 15 * 60 * 1000; // 15 minutes
    private isRunning: boolean = false;
    private intervalId: NodeJS.Timeout | null = null;

    // In-memory storage for goals (in production, would fetch from chain)
    private goalsCache: Map<string, GoalState[]> = new Map();

    // Decision callbacks
    private onDecision?: (decision: AutomationDecision) => void;
    private onExecution?: (goalId: string, action: string, success: boolean) => void;

    constructor(routerAddress: string, private chainId: number = 84532) {
        this.vyoRouter = createVyoRouterService(routerAddress, chainId);
    }

    /**
     * Set signer for on-chain interactions
     */
    setSigner(privateKey: string): void {
        this.vyoRouter.setSignerFromPrivateKey(privateKey);
    }

    /**
     * Start monitoring loop
     */
    startMonitoring(): void {
        if (this.isRunning) {
            console.log('[AUTOMATION_MONITOR] Already running');
            return;
        }

        this.isRunning = true;
        console.log('[AUTOMATION_MONITOR] Starting automation monitor...');

        this.intervalId = setInterval(async () => {
            try {
                await this.checkAllGoals();
            } catch (error) {
                console.error('[AUTOMATION_MONITOR] Error in check loop:', error);
            }
        }, this.checkInterval);

        // Run immediately
        this.checkAllGoals();
    }

    /**
     * Stop monitoring
     */
    stopMonitoring(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        console.log('[AUTOMATION_MONITOR] Stopped');
    }

    /**
     * Set callback for decisions (e.g., to notify user)
     */
    setDecisionCallback(callback: (decision: AutomationDecision) => void): void {
        this.onDecision = callback;
    }

    /**
     * Set callback for execution results
     */
    setExecutionCallback(callback: (goalId: string, action: string, success: boolean) => void): void {
        this.onExecution = callback;
    }

    /**
     * Manually trigger check for a specific goal
     */
    async checkGoal(goalId: string): Promise<AutomationDecision[]> {
        const decisions: AutomationDecision[] = [];

        try {
            // Get automation config
            const config = await this.vyoRouter.getAutomationConfig(goalId);
            
            if (!config.enabled) {
                return decisions;
            }

            // Check compound eligibility
            if (config.autoCompound) {
                const compoundDecision = await this.evaluateCompound(goalId, config);
                if (compoundDecision) {
                    decisions.push(compoundDecision);
                }
            }

            // Check rebalance eligibility
            if (config.autoRebalance) {
                const rebalanceDecision = await this.evaluateRebalance(goalId, config);
                if (rebalanceDecision) {
                    decisions.push(rebalanceDecision);
                }
            }

            // Check goal progress
            const progressDecision = await this.evaluateGoalProgress(goalId);
            if (progressDecision) {
                decisions.push(progressDecision);
            }

        } catch (error) {
            console.error(`[AUTOMATION_MONITOR] Error checking goal ${goalId}:`, error);
        }

        return decisions;
    }

    /**
     * Check all active goals
     */
    private async checkAllGoals(): Promise<void> {
        console.log(`[AUTOMATION_MONITOR] Checking all goals at ${new Date().toISOString()}`);

        // Get all tracked user addresses
        const users = Array.from(this.goalsCache.keys());

        for (const user of users) {
            try {
                const goals = await this.vyoRouter.getUserGoals(user);
                
                for (const goal of goals) {
                    if (!goal.active) continue;

                    // Cache goal state
                    const cached = this.goalsCache.get(user) || [];
                    const existingIndex = cached.findIndex(g => g.id === goal.id);
                    
                    const goalState: GoalState = {
                        id: goal.id,
                        owner: goal.owner,
                        name: goal.name,
                        targetAmount: goal.targetAmount,
                        currentAmount: goal.currentAmount,
                        deadline: goal.deadline,
                        riskLevel: goal.riskLevel,
                        active: goal.active,
                    };

                    if (existingIndex >= 0) {
                        cached[existingIndex] = goalState;
                    } else {
                        cached.push(goalState);
                    }
                    
                    this.goalsCache.set(user, cached);

                    // Check for automation
                    const decisions = await this.checkGoal(goal.id);
                    
                    for (const decision of decisions) {
                        console.log(`[AUTOMATION_MONITOR] Decision for ${goal.name}: ${decision.action} - ${decision.reason}`);
                        
                        // Notify via callback
                        if (this.onDecision) {
                            this.onDecision(decision);
                        }

                        // Auto-execute if allowed
                        if (decision.autoExecutable) {
                            await this.executeDecision(goal.id, decision);
                        }
                    }
                }
            } catch (error) {
                console.error(`[AUTOMATION_MONITOR] Error checking user ${user}:`, error);
            }
        }
    }

    /**
     * Evaluate compound eligibility
     */
    private async evaluateCompound(
        goalId: string,
        config: AutomationConfig
    ): Promise<AutomationDecision | null> {
        const lastCompound = await this.vyoRouter.getLastCompoundTime(goalId);
        const now = Math.floor(Date.now() / 1000);
        const secondsSinceCompound = now - Number(lastCompound);
        const daysSinceCompound = secondsSinceCompound / 86400;

        // Check if enough time has passed
        if (daysSinceCompound < config.compoundIntervalDays) {
            return null;
        }

        // Calculate yield
        const yieldAmount = await this.vyoRouter.calculateGoalYield(goalId);

        // Check if yield exceeds minimum
        if (yieldAmount < config.minCompoundAmount) {
            return {
                goalId,
                action: 'compound',
                reason: `Yield ${yieldAmount} below minimum ${config.minCompoundAmount}`,
                priority: 'low',
                estimatedYield: yieldAmount,
                autoExecutable: false,
            };
        }

        // Estimate gas cost (rough)
        const gasCost = await this.estimateGas('compound');

        return {
            goalId,
            action: 'compound',
            reason: `Ready to compound ${yieldAmount} yield`,
            priority: 'high',
            estimatedYield: yieldAmount,
            gasCost,
            autoExecutable: true,
        };
    }

    /**
     * Evaluate rebalance eligibility
     */
    private async evaluateRebalance(
        goalId: string,
        config: AutomationConfig
    ): Promise<AutomationDecision | null> {
        const allocations = await this.vyoRouter.getGoalAllocations(goalId);
        
        if (allocations.length === 0) {
            return null;
        }

        // Get current vault info
        const vaults = await yoService.getVaults();

        for (const alloc of allocations) {
            const currentVault = vaults.find(v => v.address === alloc.vault);
            
            if (!currentVault) continue;

            // Find better vault with similar risk
            const betterVault = vaults.find(
                v => v.address !== alloc.vault &&
                     v.riskScore <= currentVault.riskScore + 1 &&
                     (v.apy - currentVault.apy) * 100 >= config.rebalanceThresholdBps / 100
            );

            if (betterVault) {
                const apyDiff = betterVault.apy - currentVault.apy;
                const gasCost = await this.estimateGas('rebalance');

                return {
                    goalId,
                    action: 'rebalance',
                    reason: `${betterVault.name} offers ${apyDiff.toFixed(2)}% higher APY`,
                    priority: apyDiff > 1 ? 'high' : 'medium',
                    estimatedYield: (alloc.depositedAmount * apyDiff) / 100,
                    gasCost,
                    autoExecutable: false, // Always require approval for rebalancing
                };
            }
        }

        return null;
    }

    /**
     * Evaluate goal progress
     */
    private async evaluateGoalProgress(goalId: string): Promise<AutomationDecision | null> {
        const goals = Array.from(this.goalsCache.values()).flat();
        const goal = goals.find(g => g.id === goalId);

        if (!goal) {
            return null;
        }

        const now = Date.now();
        const deadline = goal.deadline * 1000;
        const totalDays = (deadline - now) / (1000 * 60 * 60 * 24);
        
        // Expected progress based on time
        const daysElapsed = 0; // Would calculate from creation
        const expectedProgress = daysElapsed / totalDays;
        const actualProgress = goal.currentAmount / goal.targetAmount;

        // If more than 15% behind schedule
        if (actualProgress < expectedProgress - 0.15) {
            const shortfall = goal.targetAmount * (expectedProgress - actualProgress);
            const monthlyNeeded = shortfall / Math.max(1, totalDays / 30);

            return {
                goalId,
                action: 'alert',
                reason: `${((expectedProgress - actualProgress) * 100).toFixed(0)}% behind schedule. Need $${monthlyNeeded.toFixed(0)}/month more to reach goal.`,
                priority: 'medium',
                autoExecutable: false,
            };
        }

        return null;
    }

    /**
     * Execute a decision
     */
    private async executeDecision(goalId: string, decision: AutomationDecision): Promise<void> {
        if (decision.action !== 'compound') {
            return;
        }

        console.log(`[AUTOMATION_MONITOR] Executing ${decision.action} for goal ${goalId}`);

        try {
            const txHash = await this.vyoRouter.compoundYield(goalId);
            console.log(`[AUTOMATION_MONITOR] Success: ${txHash}`);

            if (this.onExecution) {
                this.onExecution(goalId, decision.action, true);
            }
        } catch (error) {
            console.error(`[AUTOMATION_MONITOR] Execution failed:`, error);

            if (this.onExecution) {
                this.onExecution(goalId, decision.action, false);
            }
        }
    }

    /**
     * Estimate gas cost for an action
     */
    private async estimateGas(action: 'compound' | 'rebalance'): Promise<number> {
        // Rough estimates in USD
        const gasEstimates = {
            compound: 2,      // $2 for compound
            rebalance: 5,     // $5 for rebalance
        };

        // In production, would fetch real gas price
        return gasEstimates[action];
    }

    /**
     * Add a user to monitor
     */
    addUser(userAddress: string): void {
        this.goalsCache.set(userAddress, []);
        console.log(`[AUTOMATION_MONITOR] Added user ${userAddress} to monitoring`);
    }

    /**
     * Remove a user from monitoring
     */
    removeUser(userAddress: string): void {
        this.goalsCache.delete(userAddress);
        console.log(`[AUTOMATION_MONITOR] Removed user ${userAddress} from monitoring`);
    }

    /**
     * Get monitoring status
     */
    getStatus(): { isRunning: boolean; usersMonitored: number; checkInterval: number } {
        return {
            isRunning: this.isRunning,
            usersMonitored: this.goalsCache.size,
            checkInterval: this.checkInterval,
        };
    }

    /**
     * Get VyoRouter service
     */
    getVyoRouter(): VyoRouterService {
        return this.vyoRouter;
    }
}

// Factory function
export function createAutomationMonitorService(
    routerAddress: string,
    chainId?: number
): AutomationMonitorService {
    return new AutomationMonitorService(routerAddress, chainId);
}

export type { AutomationDecision, GoalState, AutomationConfig };
