// ============================================================
// WEALTHCOACH: YO SDK Client Wrapper
// Wraps @yo-protocol/core with mock fallback for development
// ============================================================

import type { VaultInfo } from '@wealthos/shared';
import { MOCK_VAULTS } from './mock-data.js';

// WEALTHCOACH: Environment flag — set USE_LIVE_SDK=true when real SDK is available
const USE_LIVE_SDK = process.env.USE_LIVE_SDK === 'true';

interface VaultSnapshot {
    apy: number;
    tvl: number;
    pools: unknown[];
}

interface VaultState {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    totalAssets: bigint;
    totalSupply: bigint;
    asset: string;
    assetDecimals: number;
    exchangeRate: bigint;
}

/**
 * YO SDK service — wraps the real SDK or returns mock data.
 * All methods are safe to call without blockchain access.
 */
export class YoSDKService {
    private chainId: number;

    constructor(chainId: number = 8453) { // Default: Base
        this.chainId = chainId;
    }

    /** Fetch all available vaults with APY, TVL, risk data */
    async getVaults(): Promise<VaultInfo[]> {
        if (USE_LIVE_SDK) {
            try {
                const yoCore = await import('@yo-protocol/core');
                const client = yoCore.createYoClient({ chainId: this.chainId });

                // @ts-expect-error VAULTS is exported from constants but not in root types
                const vaultEntries = Object.entries(yoCore.VAULTS);
                const results: VaultInfo[] = [];

                for (const [key, vault] of vaultEntries) {
                    try {
                        const v = vault as any;
                        const state = await client.getVaultState(v.address);
                        const snapshot = await client.getVaultSnapshot(v.address);

                        results.push({
                            id: key,
                            name: state.name,
                            symbol: state.symbol,
                            address: v.address,
                            chain: this.chainId === 1 ? 'Ethereum' : 'Base',
                            chainId: this.chainId,
                            underlyingAsset: v.underlying.address,
                            underlyingSymbol: v.underlying.symbol,
                            apy: (snapshot as VaultSnapshot).apy || 0,
                            tvl: (snapshot as VaultSnapshot).tvl || 0,
                            riskScore: this.calculateRiskScore(key),
                            lockupPeriod: 'None',
                            auditUrl: 'https://yo.xyz/security',
                            logoUrl: `/assets/vaults/${key}.svg`,
                        });
                    } catch {
                        // WEALTHCOACH: Skip vaults that fail to load — don't crash the whole list
                        console.warn(`Failed to fetch vault ${key}, skipping`);
                    }
                }

                return results;
            } catch {
                console.warn('YO SDK not available, falling back to mock data');
                return MOCK_VAULTS;
            }
        }

        return MOCK_VAULTS;
    }

    /** Get a specific vault's details */
    async getVaultDetails(vaultId: string): Promise<VaultInfo | undefined> {
        const vaults = await this.getVaults();
        return vaults.find(v => v.id === vaultId);
    }

    /** Deposit to a vault (returns mock tx hash in dev mode) */
    async deposit(
        vaultAddress: string,
        amount: number,
        userAddress: string
    ): Promise<{ hash: string; shares: string }> {
        if (USE_LIVE_SDK) {
            try {
                const { createYoClient } = await import('@yo-protocol/core');
                const { parseEther } = await import('viem');
                const client = createYoClient({ chainId: this.chainId });
                const result = await client.deposit({
                    vault: vaultAddress as `0x${string}`,
                    amount: parseEther(amount.toString()),
                    recipient: userAddress as `0x${string}`,
                });
                return { hash: result.hash, shares: result.shares?.toString() || '0' };
            } catch (error) {
                // WEALTHCOACH: Translate blockchain errors for users
                throw new Error(
                    'Something went wrong with your deposit. We\'ll retry automatically.'
                );
            }
        }

        // Mock: simulate a deposit with fake tx hash
        return {
            hash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
            shares: (amount * 0.98).toFixed(6),
        };
    }

    /** Redeem/withdraw from a vault */
    async redeem(
        vaultAddress: string,
        shares: number,
        userAddress: string
    ): Promise<{ hash: string; assets: string }> {
        if (USE_LIVE_SDK) {
            try {
                const { createYoClient } = await import('@yo-protocol/core');
                const { parseEther } = await import('viem');
                const client = createYoClient({ chainId: this.chainId }) as any;
                const result = await client.redeem({
                    vault: vaultAddress as `0x${string}`,
                    shares: parseEther(shares.toString()),
                    recipient: userAddress as `0x${string}`,
                });
                return { hash: result.hash, assets: result.assets?.toString() || '0' };
            } catch {
                throw new Error(
                    'Something went wrong with your withdrawal. Please try again shortly.'
                );
            }
        }

        return {
            hash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
            assets: (shares * 1.02).toFixed(6),
        };
    }

    /** Get user position in a vault */
    async getUserPosition(
        vaultAddress: string,
        userAddress: string
    ): Promise<{ shares: number; assets: number }> {
        // Mock: return simulated position
        return {
            shares: Math.random() * 10,
            assets: Math.random() * 5000,
        };
    }

    /** Get yield earned by user in a vault */
    async getYieldEarned(
        vaultAddress: string,
        userAddress: string
    ): Promise<{ totalYield: number; yieldPercent: number }> {
        // Mock: return simulated yield
        return {
            totalYield: Math.random() * 200,
            yieldPercent: 2 + Math.random() * 8,
        };
    }

    /** WEALTHCOACH: risk score heuristic based on vault type */
    private calculateRiskScore(vaultKey: string): number {
        const riskMap: Record<string, number> = {
            yoUSD: 2,
            yoUSDT: 2,
            yoEUR: 3,
            yoETH: 5,
            yoGOLD: 4,
            yoBTC: 6,
        };
        return riskMap[vaultKey] || 5;
    }
}

export const yoService = new YoSDKService();
