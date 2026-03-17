// ============================================================
// VyoRouter Contract Wrapper
// Interacts with VyoRouter smart contract on-chain
// ============================================================

import { ethers } from 'ethers';
import { parseUnits, formatUnits } from 'viem';

const VYOROUTER_ABI = [
    // Goal Management
    "function createGoal(string name, uint256 targetAmount, uint256 deadline, uint8 riskLevel, address[] vaults, uint256[] percentages) external returns (bytes32)",
    "function getUserGoals(address user) external view returns (tuple(bytes32 id, address owner, string name, uint256 targetAmount, uint256 currentAmount, uint256 deadline, uint8 riskLevel, bool active, bytes32[] vaultAllocations)[])",
    "function getGoalAllocations(bytes32 goalId) external view returns (tuple(bytes32 goalId, address vault, uint256 percentage, uint256 depositedAmount, uint256 shares)[])",
    "function getGoalCount(address user) external view returns (uint256)",
    
    // Deposits
    "function batchDeposit(bytes32 goalId, address[] vaults, uint256[] amounts, uint256 totalAmount) external",
    "function depositToVault(address vault, uint256 amount, bytes32 goalId) external",
    
    // Withdrawals
    "function batchRedeem(bytes32 goalId, address[] vaults, uint256[] shares) external",
    "function emergencyExit(bytes32 goalId) external",
    
    // AI Agent
    "function approveAgent(address agent, uint256 spendLimit, uint256 maxDailySpend) external",
    "function revokeAgent(address agent) external",
    "function isAgentApproved(address user, address agent) external view returns (bool)",
    "function getAgentPermission(address user) external view returns (tuple(bool approved, uint256 spendLimit, uint256 spentToday, uint256 lastResetTime, uint256 maxDailySpend))",
    "function agentRebalance(address user, bytes32 goalId, address fromVault, address toVault, uint256 shares) external",
    
    // Automation
    "function setAutomationConfig(bytes32 goalId, bool autoCompound, bool autoRebalance, uint256 compoundIntervalDays, uint256 rebalanceThresholdBps, uint256 minCompoundAmount) external",
    "function disableAutomation(bytes32 goalId) external",
    "function getAutomationConfig(bytes32 goalId) external view returns (tuple(bool enabled, bool autoCompound, bool autoRebalance, uint256 compoundIntervalDays, uint256 rebalanceThresholdBps, uint256 minCompoundAmount))",
    "function compoundYield(bytes32 goalId) external",
    "function keeperCompound(bytes32 goalId) external",
    "function lastCompoundTime(bytes32 goalId) external view returns (uint256)",
    "function setKeeperRegistry(address registry) external",
    "function setUpkeepInterval(uint256 interval) external",
    "function keeperRegistry() external view returns (address)",
    "function lastUpkeepTime() external view returns (uint256)",
    "function upkeepInterval() external view returns (uint256)",
    
    // View Functions
    "function getUserVaultPosition(address user, address vault) external view returns (uint256 shares, uint256 assets)",
    "function getUserDeposits(address user) external view returns (tuple(uint256 timestamp, address vault, uint256 amount, uint256 sharesReceived, bytes32 goalId)[])",
    "function calculateGoalYield(bytes32 goalId) external view returns (uint256)",
    "function getApprovedAgents() external view returns (address[])",
    
    // Events
    "event GoalCreated(bytes32 indexed goalId, address indexed owner, string name, uint256 targetAmount, uint256 deadline)",
    "event BatchDeposit(address indexed user, bytes32 indexed goalId, uint256 totalAmount, uint256 vaultCount)",
    "event SingleDeposit(address indexed user, address indexed vault, uint256 amount, uint256 shares, bytes32 indexed goalId)",
    "event BatchRedeem(address indexed user, bytes32 indexed goalId, uint256 totalShares, uint256 vaultCount)",
    "event EmergencyExit(address indexed user, uint256 totalAmount, uint256 vaultCount)",
    "event AgentApproved(address indexed agent, uint256 spendLimit, uint256 maxDailySpend)",
    "event AgentRevoked(address indexed agent)",
    "event AgentAction(address indexed agent, address indexed user, address indexed fromVault, address toVault, uint256 amount, bytes32 goalId)",
    "event AutomationConfigured(bytes32 indexed goalId, bool autoCompound, bool autoRebalance, uint256 compoundIntervalDays)",
    "event AutomationDisabled(bytes32 indexed goalId)",
    "event YieldCompounded(bytes32 indexed goalId, uint256 yieldAmount, uint256 newTotalShares)",
    "event UpkeepExecuted(bytes32 indexed goalId, string action)",
];

interface Goal {
    id: string;
    owner: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    deadline: number;
    riskLevel: number;
    active: boolean;
    vaultAllocations: string[];
}

interface VaultAllocation {
    goalId: string;
    vault: string;
    percentage: number;
    depositedAmount: number;
    shares: number;
}

interface AgentPermission {
    approved: boolean;
    spendLimit: number;
    spentToday: number;
    lastResetTime: number;
    maxDailySpend: number;
}

interface AutomationConfig {
    enabled: boolean;
    autoCompound: boolean;
    autoRebalance: boolean;
    compoundIntervalDays: number;
    rebalanceThresholdBps: number;
    minCompoundAmount: number;
}

export class VyoRouterService {
    private contract: any;
    private signer: any = null;

    constructor(
        private routerAddress: string,
        private chainId: number = 84532 // Base Sepolia default
    ) {
        this.contract = new ethers.Contract(
            routerAddress,
            VYOROUTER_ABI,
            // Use a default provider - signer can be set later
            new ethers.JsonRpcProvider(
                chainId === 84532 
                    ? 'https://sepolia.base.org' 
                    : 'https://mainnet.base.org'
            )
        );
    }

    /**
     * Set signer for write operations
     */
    setSigner(signer: ethers.Signer): void {
        this.signer = signer;
        this.contract = this.contract.connect(signer);
    }

    /**
     * Set signer from private key
     */
    setSignerFromPrivateKey(privateKey: string): void {
        const wallet = new ethers.Wallet(privateKey);
        this.setSigner(wallet);
    }

    // ============ GOAL MANAGEMENT ============

    /**
     * Create a new savings goal
     */
    async createGoal(
        name: string,
        targetAmount: number,
        deadline: number,
        riskLevel: number,
        vaults: string[],
        percentages: number[]
    ): Promise<string> {
        const tx = await this.contract.createGoal(
            name,
            parseUnits(targetAmount.toString(), 6),
            deadline,
            riskLevel,
            vaults,
            percentages
        );
        
        const receipt = await tx.wait();
        const goalCreatedEvent = receipt.logs.find(
            (log: any) => log.eventName === 'GoalCreated'
        );
        
        return goalCreatedEvent?.args.goalId || '';
    }

    /**
     * Get user's goals
     */
    async getUserGoals(userAddress: string): Promise<Goal[]> {
        const goals = await this.contract.getUserGoals(userAddress);
        
        return goals.map((g: any) => ({
            id: g.id,
            owner: g.owner,
            name: g.name,
            targetAmount: Number(formatUnits(g.targetAmount, 6)),
            currentAmount: Number(formatUnits(g.currentAmount, 6)),
            deadline: Number(g.deadline),
            riskLevel: Number(g.riskLevel),
            active: g.active,
            vaultAllocations: g.vaultAllocations,
        }));
    }

    /**
     * Get goal allocations
     */
    async getGoalAllocations(goalId: string): Promise<VaultAllocation[]> {
        const allocations = await this.contract.getGoalAllocations(goalId);
        
        return allocations.map((a: any) => ({
            goalId: a.goalId,
            vault: a.vault,
            percentage: Number(a.percentage),
            depositedAmount: Number(formatUnits(a.depositedAmount, 6)),
            shares: Number(formatUnits(a.shares, 6)),
        }));
    }

    /**
     * Get goal count for user
     */
    async getGoalCount(userAddress: string): Promise<number> {
        return await this.contract.getGoalCount(userAddress);
    }

    // ============ DEPOSITS ============

    /**
     * Batch deposit to multiple vaults
     */
    async batchDeposit(
        goalId: string,
        vaults: string[],
        amounts: number[],
        totalAmount: number
    ): Promise<string> {
        const amountsWei = amounts.map(a => parseUnits(a.toString(), 6));
        const totalWei = parseUnits(totalAmount.toString(), 6);
        
        const tx = await this.contract.batchDeposit(goalId, vaults, amountsWei, totalWei);
        const receipt = await tx.wait();
        
        return tx.hash;
    }

    /**
     * Deposit to single vault
     */
    async depositToVault(
        vault: string,
        amount: number,
        goalId: string
    ): Promise<string> {
        const amountWei = parseUnits(amount.toString(), 6);
        const tx = await this.contract.depositToVault(vault, amountWei, goalId);
        await tx.wait();
        
        return tx.hash;
    }

    // ============ WITHDRAWALS ============

    /**
     * Batch redeem from multiple vaults
     */
    async batchRedeem(
        goalId: string,
        vaults: string[],
        shares: number[]
    ): Promise<string> {
        const sharesWei = shares.map(s => parseUnits(s.toString(), 6));
        
        const tx = await this.contract.batchRedeem(goalId, vaults, sharesWei);
        await tx.wait();
        
        return tx.hash;
    }

    /**
     * Emergency exit - withdraw all
     */
    async emergencyExit(goalId: string): Promise<string> {
        const tx = await this.contract.emergencyExit(goalId);
        await tx.wait();
        
        return tx.hash;
    }

    // ============ AI AGENT ============

    /**
     * Approve an AI agent
     */
    async approveAgent(
        agentAddress: string,
        spendLimit: number,
        maxDailySpend: number
    ): Promise<string> {
        const spendLimitWei = parseUnits(spendLimit.toString(), 6);
        const maxDailyWei = parseUnits(maxDailySpend.toString(), 6);
        
        const tx = await this.contract.approveAgent(agentAddress, spendLimitWei, maxDailyWei);
        await tx.wait();
        
        return tx.hash;
    }

    /**
     * Revoke AI agent
     */
    async revokeAgent(agentAddress: string): Promise<string> {
        const tx = await this.contract.revokeAgent(agentAddress);
        await tx.wait();
        
        return tx.hash;
    }

    /**
     * Check if agent is approved
     */
    async isAgentApproved(userAddress: string, agentAddress: string): Promise<boolean> {
        return await this.contract.isAgentApproved(userAddress, agentAddress);
    }

    /**
     * Get agent permission details
     */
    async getAgentPermission(userAddress: string): Promise<AgentPermission> {
        const perm = await this.contract.getAgentPermission(userAddress);
        
        return {
            approved: perm.approved,
            spendLimit: Number(formatUnits(perm.spendLimit, 6)),
            spentToday: Number(formatUnits(perm.spentToday, 6)),
            lastResetTime: Number(perm.lastResetTime),
            maxDailySpend: Number(formatUnits(perm.maxDailySpend, 6)),
        };
    }

    /**
     * Agent rebalance funds
     */
    async agentRebalance(
        userAddress: string,
        goalId: string,
        fromVault: string,
        toVault: string,
        shares: number
    ): Promise<string> {
        const sharesWei = parseUnits(shares.toString(), 6);
        
        const tx = await this.contract.agentRebalance(userAddress, goalId, fromVault, toVault, sharesWei);
        await tx.wait();
        
        return tx.hash;
    }

    // ============ AUTOMATION ============

    /**
     * Set automation config for a goal
     */
    async setAutomationConfig(
        goalId: string,
        autoCompound: boolean,
        autoRebalance: boolean,
        compoundIntervalDays: number,
        rebalanceThresholdBps: number,
        minCompoundAmount: number
    ): Promise<string> {
        const minCompoundWei = parseUnits(minCompoundAmount.toString(), 6);
        
        const tx = await this.contract.setAutomationConfig(
            goalId,
            autoCompound,
            autoRebalance,
            compoundIntervalDays,
            rebalanceThresholdBps,
            minCompoundWei
        );
        await tx.wait();
        
        return tx.hash;
    }

    /**
     * Disable automation for a goal
     */
    async disableAutomation(goalId: string): Promise<string> {
        const tx = await this.contract.disableAutomation(goalId);
        await tx.wait();
        
        return tx.hash;
    }

    /**
     * Get automation config
     */
    async getAutomationConfig(goalId: string): Promise<AutomationConfig> {
        const config = await this.contract.getAutomationConfig(goalId);
        
        return {
            enabled: config.enabled,
            autoCompound: config.autoCompound,
            autoRebalance: config.autoRebalance,
            compoundIntervalDays: Number(config.compoundIntervalDays),
            rebalanceThresholdBps: Number(config.rebalanceThresholdBps),
            minCompoundAmount: Number(formatUnits(config.minCompoundAmount, 6)),
        };
    }

    /**
     * Trigger yield compounding
     */
    async compoundYield(goalId: string): Promise<string> {
        const tx = await this.contract.compoundYield(goalId);
        await tx.wait();
        
        return tx.hash;
    }

    /**
     * Get last compound time for a goal
     */
    async getLastCompoundTime(goalId: string): Promise<number> {
        return await this.contract.lastCompoundTime(goalId);
    }

    /**
     * Get keeper registry address
     */
    async getKeeperRegistry(): Promise<string> {
        return await this.contract.keeperRegistry();
    }

    /**
     * Get last upkeep time
     */
    async getLastUpkeepTime(): Promise<number> {
        return await this.contract.lastUpkeepTime();
    }

    /**
     * Get upkeep interval
     */
    async getUpkeepInterval(): Promise<number> {
        return await this.contract.upkeepInterval();
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * Get user's vault position
     */
    async getUserVaultPosition(
        userAddress: string,
        vaultAddress: string
    ): Promise<{ shares: number; assets: number }> {
        const [shares, assets] = await this.contract.getUserVaultPosition(userAddress, vaultAddress);
        
        return {
            shares: Number(formatUnits(shares, 6)),
            assets: Number(formatUnits(assets, 6)),
        };
    }

    /**
     * Calculate yield for a goal
     */
    async calculateGoalYield(goalId: string): Promise<number> {
        const yieldWei = await this.contract.calculateGoalYield(goalId);
        return Number(formatUnits(yieldWei, 6));
    }

    /**
     * Get approved agents list
     */
    async getApprovedAgents(): Promise<string[]> {
        return await this.contract.getApprovedAgents();
    }

    /**
     * Get contract address
     */
    getAddress(): string {
        return this.routerAddress;
    }
}

// Factory function
export function createVyoRouterService(
    routerAddress: string,
    chainId?: number
): VyoRouterService {
    return new VyoRouterService(routerAddress, chainId);
}
