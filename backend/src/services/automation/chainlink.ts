// ============================================================
// Chainlink Automation Service
// Handles upkeep registration and management
// ============================================================

import { createVyoRouterService, type VyoRouterService } from '../contracts/vyoRouter.js';
import { yoService } from '../yo-sdk/client.js';

const CHAINLINK_REGISTRY_ABI = [
    "function registerUpkeep(string name, bytes32 encryptedEmail, address upkeepContract, uint32 gasLimit, address adminAddress, uint8 triggerType, bytes checkData, bytes triggerConfig, bytes offchainConfig) external returns (uint256 id)",
    "function cancelUpkeep(uint256 id) external",
    "function pauseUpkeep(uint256 id) external",
    "function unpauseUpkeep(uint256 id) external",
    "function addFunds(uint256 id, uint96 amount) external",
    "function getUpkeepInfo(uint256 id) external view returns ((address target, uint32 executeGas, address admin, address currency, uint96 balance, bool paused, uint64 lastRun, uint64 nextRound, uint96 amountSpent, uint256 numUpkeeps))",
    "function getMinBalance(uint256 id) external view returns (uint256)",
];

const LINK_TOKEN_ABI = [
    "function transfer(address to, uint256 amount) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
];

interface UpkeepInfo {
    target: string;
    executeGas: number;
    admin: string;
    currency: string;
    balance: string;
    paused: boolean;
    lastRun: number;
    nextRound: number;
    amountSpent: string;
    numUpkeeps: number;
}

interface RegisteredUpkeep {
    upkeepId: string;
    goalId: string;
    automationType: 'compound' | 'rebalance' | 'check';
    registeredAt: number;
    lastRun: number;
    balance: string;
    paused: boolean;
}

interface AutomationTrigger {
    goalId: string;
    action: 'compound' | 'rebalance' | 'check';
    reason: string;
    shouldExecute: boolean;
    metadata?: {
        yieldAmount?: number;
        apyDiff?: number;
        gasCost?: number;
    };
}

class ChainlinkAutomationService {
    private vyoRouter: VyoRouterService;
    private registry: any = null;
    private linkToken: any = null;
    
    // In-memory tracking of registered upkeeps
    private registeredUpkeeps: Map<string, RegisteredUpkeep> = new Map();

    // Chainlink addresses (Base Sepolia)
    private readonly REGISTRY_ADDRESS = process.env.CHAINLINK_REGISTRY_ADDRESS || '0x';
    private readonly LINK_TOKEN_ADDRESS = '0xE4aB69F9778dA6FB41D87d28E9D5f2A3cF9E0E8F'; // Base Sepolia LINK
    private readonly LINK_ADDRESSES: Record<number, string> = {
        84532: '0xE4aB69F9778dA6FB41D87d28E9D5f2A3cF9E0E8F', // Base Sepolia
        8453: '0x50b62d5a42bC8E73F88c9E1eB4C4D4a1B8e9D5C',   // Base Mainnet
    };

    constructor(routerAddress: string, private chainId: number = 84532) {
        this.vyoRouter = createVyoRouterService(routerAddress, chainId);
    }

    /**
     * Initialize Chainlink contracts
     */
    private async initializeContracts(): Promise<void> {
        if (this.registry) return;

        const { ethers } = await import('ethers');
        
        const provider = new ethers.JsonRpcProvider(
            this.chainId === 84532 
                ? 'https://sepolia.base.org' 
                : 'https://mainnet.base.org'
        );

        this.registry = new ethers.Contract(
            this.REGISTRY_ADDRESS,
            CHAINLINK_REGISTRY_ABI,
            provider
        );

        this.linkToken = new ethers.Contract(
            this.LINK_ADDRESSES[this.chainId] || this.LINK_TOKEN_ADDRESS,
            LINK_TOKEN_ABI,
            provider
        );
    }

    /**
     * Set signer for write operations
     */
    async setSigner(privateKey: string): Promise<void> {
        const { ethers } = await import('ethers');
        const wallet = new ethers.Wallet(privateKey);
        
        this.vyoRouter.setSigner(wallet);
        
        if (this.registry) {
            this.registry = this.registry.connect(wallet);
            this.linkToken = this.linkToken.connect(wallet);
        }
    }

    // ============ UPKEEP REGISTRATION ============

    /**
     * Register an upkeep for a goal
     */
    async registerGoalUpkeep(
        goalId: string,
        automationType: 'compound' | 'rebalance' | 'check'
    ): Promise<{ upkeepId: string; txHash: string }> {
        await this.initializeContracts();

        const upkeepContract = this.vyoRouter.getAddress();
        
        // Build checkData with goalId
        const checkData = this.encodeCheckData(goalId, automationType);
        
        // Build trigger config
        const triggerConfig = this.encodeTriggerConfig(goalId, automationType);
        
        // Build offchain config
        const offchainConfig = this.encodeOffchainConfig(goalId, automationType);

        try {
            const tx = await this.registry.registerUpkeep(
                `Vyo-${automationType}-${goalId.slice(0, 8)}`,
                '0x',
                upkeepContract,
                500000, // gasLimit
                await this.getSignerAddress(),
                0, // triggerType - conditional
                checkData,
                triggerConfig,
                offchainConfig
            );

            const receipt = await tx.wait();
            const upkeepId = this.extractUpkeepId(receipt);

            // Track registered upkeep
            this.registeredUpkeeps.set(upkeepId, {
                upkeepId,
                goalId,
                automationType,
                registeredAt: Date.now(),
                lastRun: 0,
                balance: '0',
                paused: false,
            });

            console.log(`[CHAINLINK] Registered upkeep ${upkeepId} for goal ${goalId}`);

            return { upkeepId, txHash: tx.hash };
        } catch (error) {
            console.error('[CHAINLINK] Failed to register upkeep:', error);
            throw error;
        }
    }

    /**
     * Cancel an upkeep
     */
    async cancelUpkeep(upkeepId: string): Promise<string> {
        await this.initializeContracts();

        const tx = await this.registry.cancelUpkeep(upkeepId);
        await tx.wait();

        this.registeredUpkeeps.delete(upkeepId);

        console.log(`[CHAINLINK] Cancelled upkeep ${upkeepId}`);
        return tx.hash;
    }

    /**
     * Pause an upkeep
     */
    async pauseUpkeep(upkeepId: string): Promise<string> {
        await this.initializeContracts();

        const tx = await this.registry.pauseUpkeep(upkeepId);
        await tx.wait();

        const upkeep = this.registeredUpkeeps.get(upkeepId);
        if (upkeep) {
            upkeep.paused = true;
        }

        console.log(`[CHAINLINK] Paused upkeep ${upkeepId}`);
        return tx.hash;
    }

    /**
     * Unpause an upkeep
     */
    async unpauseUpkeep(upkeepId: string): Promise<string> {
        await this.initializeContracts();

        const tx = await this.registry.unpauseUpkeep(upkeepId);
        await tx.wait();

        const upkeep = this.registeredUpkeeps.get(upkeepId);
        if (upkeep) {
            upkeep.paused = false;
        }

        console.log(`[CHAINLINK] Unpaused upkeep ${upkeepId}`);
        return tx.hash;
    }

    // ============ FUNDING ============

    /**
     * Fund an upkeep with LINK tokens
     */
    async fundUpkeep(upkeepId: string, amountLink: number): Promise<string> {
        await this.initializeContracts();

        const amountWei = BigInt(amountLink * 1e18); // LINK has 18 decimals

        // Transfer LINK to registry
        const linkAmount = amountWei + BigInt(5000000000000000000); // Extra for gas
        
        const tx = await this.linkToken.transfer(this.REGISTRY_ADDRESS, linkAmount);
        await tx.wait();

        // Add funds to upkeep
        const fundTx = await this.registry.addFunds(upkeepId, amountWei);
        await fundTx.wait();

        console.log(`[CHAINLINK] Funded upkeep ${upkeepId} with ${amountLink} LINK`);

        return fundTx.hash;
    }

    /**
     * Check upkeep balance
     */
    async getUpkeepBalance(upkeepId: string): Promise<string> {
        await this.initializeContracts();

        const info = await this.registry.getUpkeepInfo(upkeepId);
        return info.balance.toString();
    }

    /**
     * Get upkeep info
     */
    async getUpkeepInfo(upkeepId: string): Promise<UpkeepInfo> {
        await this.initializeContracts();

        const info = await this.registry.getUpkeepInfo(upkeepId);
        
        return {
            target: info.target,
            executeGas: Number(info.executeGas),
            admin: info.admin,
            currency: info.currency,
            balance: info.balance.toString(),
            paused: info.paused,
            lastRun: Number(info.lastRun),
            nextRound: Number(info.nextRound),
            amountSpent: info.amountSpent.toString(),
            numUpkeeps: Number(info.numUpkeeps),
        };
    }

    // ============ AUTOMATION LOGIC ============

    /**
     * Check if automation should trigger for a goal
     */
    async checkAutomationNeeded(goalId: string): Promise<AutomationTrigger> {
        const config = await this.vyoRouter.getAutomationConfig(goalId);

        if (!config.enabled) {
            return {
                goalId,
                action: 'check',
                reason: 'Automation disabled',
                shouldExecute: false,
            };
        }

        // Check compound eligibility
        if (config.autoCompound) {
            const trigger = await this.checkCompoundEligibility(goalId, config);
            if (trigger.shouldExecute) {
                return trigger;
            }
        }

        // Check rebalance eligibility
        if (config.autoRebalance) {
            const trigger = await this.checkRebalanceEligibility(goalId, config);
            if (trigger.shouldExecute) {
                return trigger;
            }
        }

        return {
            goalId,
            action: 'check',
            reason: 'No automation triggers met',
            shouldExecute: false,
        };
    }

    /**
     * Check if yield compounding is needed
     */
    private async checkCompoundEligibility(
        goalId: string,
        config: any
    ): Promise<AutomationTrigger> {
        const lastCompound = await this.vyoRouter.getLastCompoundTime(goalId);
        const now = Date.now() / 1000;
        const secondsSinceCompound = now - Number(lastCompound);
        const daysSinceCompound = secondsSinceCompound / 86400;

        if (daysSinceCompound < config.compoundIntervalDays) {
            return {
                goalId,
                action: 'compound',
                reason: `Only ${daysSinceCompound.toFixed(1)} days since last compound`,
                shouldExecute: false,
            };
        }

        // Check if there's enough yield to compound
        const yieldAmount = await this.vyoRouter.calculateGoalYield(goalId);

        if (yieldAmount < config.minCompoundAmount) {
            return {
                goalId,
                action: 'compound',
                reason: `Yield ${yieldAmount} below minimum ${config.minCompoundAmount}`,
                shouldExecute: false,
                metadata: { yieldAmount },
            };
        }

        return {
            goalId,
            action: 'compound',
            reason: `Ready to compound ${yieldAmount} yield`,
            shouldExecute: true,
            metadata: { yieldAmount },
        };
    }

    /**
     * Check if rebalancing is needed
     */
    private async checkRebalanceEligibility(
        goalId: string,
        config: any
    ): Promise<AutomationTrigger> {
        const allocations = await this.vyoRouter.getGoalAllocations(goalId);
        
        // Get current vault APYs
        for (const alloc of allocations) {
            const snapshot = await yoService.getVaultSnapshot(alloc.vault);
            
            // Find better vault
            const vaults = await yoService.getVaults();
            const currentVault = vaults.find(v => v.address === alloc.vault);
            
            if (!currentVault) continue;

            const betterVault = vaults.find(
                v => v.address !== alloc.vault &&
                     v.riskScore <= currentVault.riskScore + 1 &&
                     (v.apy - currentVault.apy) * 100 >= config.rebalanceThresholdBps / 100
            );

            if (betterVault) {
                return {
                    goalId,
                    action: 'rebalance',
                    reason: `${betterVault.name} APY ${betterVault.apy}% > ${currentVault.name} ${currentVault.apy}%`,
                    shouldExecute: true,
                    metadata: {
                        apyDiff: betterVault.apy - currentVault.apy,
                    },
                };
            }
        }

        return {
            goalId,
            action: 'rebalance',
            reason: 'No rebalance opportunity found',
            shouldExecute: false,
        };
    }

    /**
     * Execute compound yield (called by Chainlink)
     */
    async executeCompound(goalId: string): Promise<string> {
        console.log(`[CHAINLINK] Executing compound for goal ${goalId}`);
        
        try {
            const txHash = await this.vyoRouter.compoundYield(goalId);
            console.log(`[CHAINLINK] Compound successful: ${txHash}`);
            
            return txHash;
        } catch (error) {
            console.error(`[CHAINLINK] Compound failed:`, error);
            throw error;
        }
    }

    // ============ HELPERS ============

    private encodeCheckData(goalId: string, type: string): string {
        return '0x' + Buffer.from(JSON.stringify({ goalId, type })).toString('hex');
    }

    private encodeTriggerConfig(goalId: string, type: string): string {
        // Minimal trigger config
        return '0x';
    }

    private encodeOffchainConfig(goalId: string, type: string): string {
        return '0x' + Buffer.from(
            JSON.stringify({ goalId, type, version: '1.0' })
        ).toString('hex');
    }

    private decodeCheckData(checkData: string): { goalId: string; type: string } {
        const decoded = Buffer.from(checkData.slice(2), 'hex').toString();
        return JSON.parse(decoded);
    }

    private extractUpkeepId(receipt: any): string {
        // Extract upkeep ID from logs
        const log = receipt.logs.find((l: any) => 
            l.topics && l.topics[0] === '0x'
        );
        return log ? '1' : '1'; // Simplified - in production, parse actual log
    }

    private async getSignerAddress(): Promise<string> {
        // This would need a signer to be set
        return '0x0000000000000000000000000000000000000000';
    }

    /**
     * Get all registered upkeeps
     */
    getRegisteredUpkeeps(): RegisteredUpkeep[] {
        return Array.from(this.registeredUpkeeps.values());
    }

    /**
     * Get VyoRouter service for direct interactions
     */
    getVyoRouter(): VyoRouterService {
        return this.vyoRouter;
    }
}

// Factory function
export function createChainlinkAutomationService(
    routerAddress: string,
    chainId?: number
): ChainlinkAutomationService {
    return new ChainlinkAutomationService(routerAddress, chainId);
}

export type { AutomationTrigger, RegisteredUpkeep, UpkeepInfo };
