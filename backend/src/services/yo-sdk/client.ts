// ============================================================
// VIO_AGENT: YO SDK Client Wrapper
// Hybrid: Real reads from YO, Mock writes for dev
// ============================================================

import type { VaultInfo } from '../../../../shared/types/index.js';
import { MOCK_VAULTS } from './mock-data.js';

// VIO_AGENT: Mode configuration
const DEV_MODE = process.env.DEV_MODE || 'mock';
const IS_LIVE_MODE = DEV_MODE === 'live';

// Using Base Sepolia Testnet (chain ID: 84532)
// Change to 8453 for Base Mainnet
const YO_CHAIN_ID = parseInt(process.env.YO_CHAIN_ID || '84532');

// Cache vault data to reduce API calls
let vaultCache: VaultInfo[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * YO SDK Service
 * 
 * READ operations: Always try real YO API first, fallback to mock
 * WRITE operations: Mock in dev mode, real in live mode
 * USER data: Mock in dev, real in live
 */
export class YoSDKService {
    private chainId: number = YO_CHAIN_ID;
    
    /**
     * Get current chain ID
     */
    getChainId(): number {
        return this.chainId;
    }
    
    /**
     * Get all vaults - ALWAYS tries real YO API first
     * This shows real APY, TVL from YO Protocol
     */
    async getVaults(): Promise<VaultInfo[]> {
        // Check cache first
        if (vaultCache && Date.now() - cacheTimestamp < CACHE_TTL) {
            console.log('[YO_SDK] Returning cached vaults');
            return vaultCache;
        }

        try {
            // Try real YO Protocol API
            const response = await fetch(`https://api.yo.xyz/api/v1/vaults?chain=${YO_CHAIN_ID}`);
            if (!response.ok) throw new Error('YO API error');
            
            const data = await response.json();
            if (data.vaults && data.vaults.length > 0) {
                vaultCache = this.transformVaultData(data.vaults);
                cacheTimestamp = Date.now();
                console.log('[YO_SDK] Real vault data fetched from YO API');
                return vaultCache;
            }
        } catch (error) {
            console.warn('[YO_SDK] Failed to fetch real data, using mock:', error);
        }

        // Fallback to mock data
        console.log('[YO_SDK] Using mock vault data');
        return MOCK_VAULTS;
    }

    /**
     * Get specific vault details
     */
    async getVaultDetails(vaultId: string): Promise<VaultInfo | undefined> {
        const vaults = await this.getVaults();
        return vaults.find(v => v.id === vaultId);
    }

    /**
     * Get vault snapshot (real-time data)
     */
    async getVaultSnapshot(vaultAddress: string): Promise<{apy: number; tvl: number}> {
        try {
            const response = await fetch(
                `https://api.yo.xyz/api/v1/vault/${YO_CHAIN_ID}/${vaultAddress}`
            );
            if (!response.ok) throw new Error('YO API error');
            
            const data = await response.json();
            return {
                apy: data.apy || 0,
                tvl: data.tvl || 0,
            };
        } catch {
            // Return mock data for this vault
            const vault = MOCK_VAULTS.find(v => v.address === vaultAddress);
            return {
                apy: vault?.apy || 5.0,
                tvl: vault?.tvl || 1000000,
            };
        }
    }

    /**
     * DEPOSIT: Mock in dev, Real in live
     * 
     * DEV: Returns fake tx hash (no real crypto needed)
     * LIVE: Real on-chain transaction
     */
    async deposit(
        vaultAddress: string,
        amount: number,
        userAddress: string
    ): Promise<{ hash: string; shares: string; status: string }> {
        if (IS_LIVE_MODE) {
            try {
                const { createYoClient } = await import('@yo-protocol/core');
                const { parseUnits } = await import('viem');
                const client = createYoClient({ chainId: YO_CHAIN_ID });
                
                const result = await client.deposit({
                    vault: vaultAddress as `0x${string}`,
                    amount: parseUnits(amount.toString(), 6), // USDC = 6 decimals
                    recipient: userAddress as `0x${string}`,
                    slippageBps: 50,
                });
                
                return { 
                    hash: result.hash, 
                    shares: result.shares?.toString() || '0',
                    status: 'confirmed'
                };
            } catch (error) {
                console.error('[YO_SDK] Real deposit failed:', error);
                throw new Error('Deposit failed. Please check your balance and try again.');
            }
        }

        // DEV MODE: Mock deposit
        console.log(`[YO_SDK] MOCK deposit: ${amount} to ${vaultAddress}`);
        await this.simulateDelay(2000);
        
        return {
            hash: `0x${this.generateFakeHash()}`,
            shares: (amount * 0.98).toFixed(6), // 2% entry fee simulation
            status: 'confirmed',
        };
    }

    /**
     * REDEEM: Mock in dev, Real in live
     */
    async redeem(
        vaultAddress: string,
        shares: number,
        userAddress: string
    ): Promise<{ hash: string; assets: string; status: string }> {
        if (IS_LIVE_MODE) {
            try {
                const { createYoClient } = await import('@yo-protocol/core');
                const { parseUnits } = await import('viem');
                const client = createYoClient({ chainId: YO_CHAIN_ID });
                
                const result = await client.redeem({
                    vault: vaultAddress as `0x${string}`,
                    shares: parseUnits(shares.toString(), 6),
                    recipient: userAddress as `0x${string}`,
                });
                
                return {
                    hash: result.hash,
                    assets: result.assets?.toString() || '0',
                    status: 'confirmed',
                };
            } catch (error) {
                console.error('[YO_SDK] Real redeem failed:', error);
                throw new Error('Redeem failed. Please try again.');
            }
        }

        // DEV MODE: Mock redeem
        console.log(`[YO_SDK] MOCK redeem: ${shares} from ${vaultAddress}`);
        await this.simulateDelay(2000);
        
        return {
            hash: `0x${this.generateFakeHash()}`,
            assets: (shares * 1.02).toFixed(6), // 2% exit bonus simulation
            status: 'confirmed',
        };
    }

    /**
     * Get user position in vault
     * DEV: Mock/simulated
     * LIVE: Real blockchain query
     */
    async getUserPosition(
        vaultAddress: string,
        userAddress: string
    ): Promise<{ shares: number; assets: number }> {
        if (IS_LIVE_MODE) {
            try {
                const { createYoClient } = await import('@yo-protocol/core');
                const client = createYoClient({ chainId: YO_CHAIN_ID });
                const position = await client.getUserPosition(vaultAddress, userAddress);
                return {
                    shares: Number(position.shares) / 1e6,
                    assets: Number(position.assets) / 1e6,
                };
            } catch {
                return { shares: 0, assets: 0 };
            }
        }

        // DEV: Generate deterministic mock based on address
        const mockShares = this.hashToNumber(userAddress + vaultAddress) % 10000;
        const mockAssets = mockShares * 1.01; // Slight appreciation
        return { shares: mockShares, assets: mockAssets };
    }

    /**
     * Get yield earned by user
     * DEV: Mock
     * LIVE: Real calculation
     */
    async getYieldEarned(
        vaultAddress: string,
        userAddress: string
    ): Promise<{ totalYield: number; yieldPercent: number }> {
        if (IS_LIVE_MODE) {
            // In production, calculate from deposit events and current value
            return { totalYield: 0, yieldPercent: 0 }; // TODO: Implement
        }

        // DEV: Mock yield
        const baseYield = this.hashToNumber(userAddress) % 500;
        return {
            totalYield: baseYield,
            yieldPercent: 2 + (baseYield % 8), // 2-10%
        };
    }

    // ============================================================
    // PRIVATE HELPERS
    // ============================================================

    private async simulateDelay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private generateFakeHash(): string {
        return Array.from({ length: 64 }, () => 
            Math.floor(Math.random() * 16).toString(16)
        ).join('');
    }

    private hashToNumber(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    private transformVaultData(yoVaults: any[]): VaultInfo[] {
        return yoVaults.map((v, i) => ({
            id: v.symbol?.toLowerCase() || `vault-${i}`,
            name: v.name || 'YO Vault',
            symbol: v.symbol || 'yoVAULT',
            address: v.address,
            chain: YO_CHAIN_ID === 8453 ? 'Base' : 'Ethereum',
            chainId: YO_CHAIN_ID,
            underlyingAsset: v.asset?.address || '',
            underlyingSymbol: v.asset?.symbol || 'USD',
            apy: v.apy || 5.0,
            tvl: v.tvl || 1000000,
            riskScore: this.calculateRiskScore(v.symbol),
            lockupPeriod: 'None',
            auditUrl: 'https://yo.xyz/security',
            logoUrl: `/assets/vaults/${v.symbol?.toLowerCase()}.svg`,
        }));
    }

    private calculateRiskScore(symbol?: string): number {
        const riskMap: Record<string, number> = {
            yoUSD: 2, yoUSDT: 2, yoUSDC: 2,
            yoEUR: 3,
            yoGOLD: 4,
            yoETH: 5,
            yoBTC: 6,
        };
        return riskMap[symbol || ''] || 5;
    }
}

export const yoService = new YoSDKService();
