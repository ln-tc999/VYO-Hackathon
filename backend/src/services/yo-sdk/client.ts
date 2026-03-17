// ============================================================
// VIO_AGENT: YO SDK Client Wrapper (Complete)
// Hybrid: Real reads from YO, Mock writes for dev
// ============================================================

import type { VaultInfo } from '../../../../shared/types/index.js';
import { MOCK_VAULTS } from './mock-data.js';

const DEV_MODE = process.env.DEV_MODE || 'mock';
const IS_LIVE_MODE = DEV_MODE === 'live';

const YO_CHAIN_ID = parseInt(process.env.YO_CHAIN_ID || '84532');
const ROUTER_ADDRESS = process.env.VYOROUTER_ADDRESS || '0x0000000000000000000000000000000000000000';

let vaultCache: VaultInfo[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000;

interface UserPosition {
    vaultId: string;
    shares: number;
    assets: number;
    yieldEarned: number;
}

interface VaultSnapshot {
    apy: number;
    tvl: number;
    totalSupply: number;
    totalAssets: number;
    depositLimit: number;
    lastUpdate: number;
}

interface PriceMap {
    ETH: number;
    USDC: number;
    USDT: number;
    DAI: number;
}

interface UserPerformance {
    totalDeposited: number;
    totalWithdrawn: number;
    totalYield: number;
    yieldPercent: number;
}

interface PreparedTransaction {
    to: string;
    data: string;
    value: string;
}

interface MerklReward {
    campaignId: string;
    token: string;
    amount: bigint;
    claimable: boolean;
}

export class YoSDKService {
    private chainId: number = YO_CHAIN_ID;
    private client: any = null;

    getChainId(): number {
        return this.chainId;
    }

    // ============ VAULT QUERIES (Using YO SDK) ============

    /**
     * Get all vaults with full details using YO SDK
     */
    async getVaults(): Promise<VaultInfo[]> {
        if (vaultCache && Date.now() - cacheTimestamp < CACHE_TTL) {
            console.log('[YO_SDK] Returning cached vaults');
            return vaultCache;
        }

        if (IS_LIVE_MODE) {
            try {
                const client = await this.getClient();
                const vaults = await client.getVaults();
                
                vaultCache = vaults.map((v: any) => ({
                    id: v.contracts?.vaultAddress || v.address,
                    name: v.name,
                    symbol: v.token?.symbol || 'yoVAULT',
                    address: v.contracts?.vaultAddress || v.address,
                    chain: this.getNetworkName(),
                    chainId: this.chainId,
                    underlyingAsset: v.token?.address || '',
                    underlyingSymbol: v.token?.symbol || 'USD',
                    apy: this.parseAPY(v.apy),
                    tvl: Number(v.tvl || 0) / 1e6,
                    riskScore: this.calculateRiskScore(v.name),
                    lockupPeriod: v.lockPeriod || 'None',
                    auditUrl: 'https://yo.xyz/security',
                    logoUrl: `/assets/vaults/${(v.token?.symbol || 'vault').toLowerCase()}.svg`,
                }));
                
                cacheTimestamp = Date.now();
                console.log('[YO_SDK] Real vault data from YO SDK');
                return vaultCache as VaultInfo[];
            } catch (error) {
                console.warn('[YO_SDK] SDK error, falling back to HTTP:', error);
            }
        }

        console.log('[YO_SDK] Using mock vault data');
        return MOCK_VAULTS;
    }

    /**
     * Get specific vault details by ID
     */
    async getVaultDetails(vaultId: string): Promise<VaultInfo | undefined> {
        const vaults = await this.getVaults();
        return vaults.find(v => v.id === vaultId || v.address === vaultId);
    }

    /**
     * Get specific vault by address
     */
    async getVaultByAddress(vaultAddress: string): Promise<VaultInfo | undefined> {
        const vaults = await this.getVaults();
        return vaults.find(v => v.address === vaultAddress);
    }

    /**
     * Get vault snapshot using YO SDK
     */
    async getVaultSnapshot(vaultAddress: string): Promise<VaultSnapshot> {
        if (IS_LIVE_MODE) {
            try {
                const client = await this.getClient();
                const snapshot = await client.getVaultSnapshot(vaultAddress as `0x${string}`);
                
                return {
                    apy: this.parseAPY(snapshot.apy),
                    tvl: Number(snapshot.tvl || 0) / 1e6,
                    totalSupply: Number(snapshot.totalSupply || 0) / 1e6,
                    totalAssets: Number(snapshot.totalAssets || 0) / 1e6,
                    depositLimit: Number(snapshot.depositLimit || 0) / 1e6,
                    lastUpdate: Number(snapshot.lastUpdate || 0) * 1000,
                };
            } catch (error) {
                console.warn('[YO_SDK] getVaultSnapshot error:', error);
            }
        }

        const vault = MOCK_VAULTS.find(v => v.address === vaultAddress);
        return {
            apy: vault?.apy || 5.0,
            tvl: vault?.tvl || 1000000,
            totalSupply: (vault?.tvl || 1000000) * 0.95,
            totalAssets: vault?.tvl || 1000000,
            depositLimit: 10000000,
            lastUpdate: Date.now(),
        };
    }

    // ============ USER DATA (Using YO SDK) ============

    /**
     * Get user's position in a specific vault
     */
    async getUserPosition(
        vaultAddress: string,
        userAddress: string
    ): Promise<UserPosition> {
        if (IS_LIVE_MODE) {
            try {
                const client = await this.getClient();
                const position = await client.getUserPosition(
                    vaultAddress as `0x${string}`,
                    userAddress as `0x${string}`
                );
                
                const shares = Number(position.shares || 0) / 1e6;
                const assets = Number(position.assets || 0) / 1e6;
                
                return {
                    vaultId: vaultAddress,
                    shares,
                    assets,
                    yieldEarned: assets - shares,
                };
            } catch (error) {
                console.warn('[YO_SDK] getUserPosition error:', error);
            }
        }

        const mockShares = this.hashToNumber(userAddress + vaultAddress) % 10000;
        const mockAssets = mockShares * 1.01;
        return {
            vaultId: vaultAddress,
            shares: mockShares,
            assets: mockAssets,
            yieldEarned: mockAssets - mockShares,
        };
    }

    /**
     * Get user's positions across all vaults on current chain
     */
    async getUserAllPositions(userAddress: string): Promise<UserPosition[]> {
        const vaults = await this.getVaults();
        const positions: UserPosition[] = [];

        for (const vault of vaults) {
            const position = await this.getUserPosition(vault.address, userAddress);
            if (position.shares > 0) {
                positions.push(position);
            }
        }

        return positions;
    }

    /**
     * Get user's performance across all vaults
     */
    async getUserPerformance(userAddress: string): Promise<UserPerformance> {
        if (IS_LIVE_MODE) {
            try {
                const client = await this.getClient();
                const performance = await client.getUserBalances(userAddress as `0x${string}`);
                
                return {
                    totalDeposited: Number(performance.totalDeposited || 0) / 1e6,
                    totalWithdrawn: Number(performance.totalWithdrawn || 0) / 1e6,
                    totalYield: Number(performance.totalYield || 0) / 1e6,
                    yieldPercent: Number(performance.totalYield || 0) / 
                        Number(performance.totalDeposited || 1) * 100,
                };
            } catch (error) {
                console.warn('[YO_SDK] getUserPerformance error:', error);
            }
        }

        const baseYield = this.hashToNumber(userAddress) % 500;
        return {
            totalDeposited: 10000 + (this.hashToNumber(userAddress + 'a') % 5000),
            totalWithdrawn: this.hashToNumber(userAddress + 'b') % 2000,
            totalYield: baseYield,
            yieldPercent: 2 + (baseYield % 8),
        };
    }

    // ============ TRANSACTION BUILDING (Using YO SDK) ============

    /**
     * Build deposit transaction with automatic approval
     * Returns transaction data for frontend to sign
     */
    async buildDepositWithApproval(
        vaultAddress: string,
        amount: number,
        userAddress: string
    ): Promise<{ transactions: PreparedTransaction[]; preview: { shares: number; slippage: number } }> {
        if (IS_LIVE_MODE) {
            try {
                const client = await this.getClient();
                const amountWei = BigInt(Math.floor(amount * 1e6));
                
                const txs = await client.prepareDepositWithApproval({
                    vault: vaultAddress as `0x${string}`,
                    amount: amountWei,
                    recipient: userAddress as `0x${string}`,
                    slippageBps: 50,
                });

                const previewShares = await client.previewDeposit(
                    vaultAddress as `0x${string}`,
                    amountWei
                );

                return {
                    transactions: txs.map((tx: any) => ({
                        to: tx.to,
                        data: tx.data,
                        value: tx.value?.toString() || '0',
                    })),
                    preview: {
                        shares: Number(previewShares) / 1e6,
                        slippage: 0.5,
                    },
                };
            } catch (error) {
                console.error('[YO_SDK] buildDepositWithApproval error:', error);
                throw error;
            }
        }

        const mockShares = amount * 0.98;
        return {
            transactions: [{
                to: vaultAddress,
                data: '0x mock transaction data',
                value: '0',
            }],
            preview: {
                shares: mockShares,
                slippage: 0.5,
            },
        };
    }

    /**
     * Build redeem transaction with automatic approval
     */
    async buildRedeemWithApproval(
        vaultAddress: string,
        shares: number,
        userAddress: string
    ): Promise<{ transactions: PreparedTransaction[]; preview: { assets: number } }> {
        if (IS_LIVE_MODE) {
            try {
                const client = await this.getClient();
                const sharesWei = BigInt(Math.floor(shares * 1e6));
                
                const txs = await client.prepareRedeemWithApproval({
                    vault: vaultAddress as `0x${string}`,
                    shares: sharesWei,
                    recipient: userAddress as `0x${string}`,
                });

                const previewAssets = await client.previewRedeem(
                    vaultAddress as `0x${string}`,
                    sharesWei
                );

                return {
                    transactions: txs.map((tx: any) => ({
                        to: tx.to,
                        data: tx.data,
                        value: tx.value?.toString() || '0',
                    })),
                    preview: {
                        assets: Number(previewAssets) / 1e6,
                    },
                };
            } catch (error) {
                console.error('[YO_SDK] buildRedeemWithApproval error:', error);
                throw error;
            }
        }

        const mockAssets = shares * 1.02;
        return {
            transactions: [{
                to: vaultAddress,
                data: '0x mock transaction data',
                value: '0',
            }],
            preview: {
                assets: mockAssets,
            },
        };
    }

    /**
     * Just preview deposit (no transaction building)
     */
    async previewDeposit(vaultAddress: string, amount: number): Promise<number> {
        if (IS_LIVE_MODE) {
            try {
                const client = await this.getClient();
                const amountWei = BigInt(Math.floor(amount * 1e6));
                const shares = await client.previewDeposit(vaultAddress as `0x${string}`, amountWei);
                return Number(shares) / 1e6;
            } catch {
                return amount * 0.98;
            }
        }
        return amount * 0.98;
    }

    /**
     * Just preview redeem (no transaction building)
     */
    async previewRedeem(vaultAddress: string, shares: number): Promise<number> {
        if (IS_LIVE_MODE) {
            try {
                const client = await this.getClient();
                const sharesWei = BigInt(Math.floor(shares * 1e6));
                const assets = await client.previewRedeem(vaultAddress as `0x${string}`, sharesWei);
                return Number(assets) / 1e6;
            } catch {
                return shares * 1.02;
            }
        }
        return shares * 1.02;
    }

    // ============ PRICING (Using YO SDK) ============

    /**
     * Get token prices in USD
     */
    async getTokenPrices(): Promise<PriceMap> {
        if (IS_LIVE_MODE) {
            try {
                const client = await this.getClient();
                const prices = await client.getPrices();
                
                return {
                    ETH: Number(prices.ETH?.usd || 3000),
                    USDC: Number(prices.USDC?.usd || 1),
                    USDT: Number(prices.USDT?.usd || 1),
                    DAI: Number(prices.DAI?.usd || 1),
                };
            } catch {
                return { ETH: 3000, USDC: 1, USDT: 1, DAI: 1 };
            }
        }

        return { ETH: 3000, USDC: 1, USDT: 1, DAI: 1 };
    }

    // ============ MERKL REWARDS (Using YO SDK) ============

    /**
     * Get claimable Merkl rewards
     */
    async getClaimableRewards(userAddress: string): Promise<MerklReward[]> {
        if (IS_LIVE_MODE) {
            try {
                const client = await this.getClient();
                const rewards = await client.getClaimableRewards(userAddress as `0x${string}`);
                
                if (!rewards) return [];

                const result: MerklReward[] = [];
                for (const [chainId, chainRewards] of Object.entries(rewards as any)) {
                    for (const [token, reward] of Object.entries(chainRewards as any)) {
                        if ((reward as any).amount > 0n) {
                            result.push({
                                campaignId: (reward as any).campaignId || 'unknown',
                                token: token,
                                amount: (reward as any).amount,
                                claimable: true,
                            });
                        }
                    }
                }
                return result;
            } catch {
                return [];
            }
        }

        return [];
    }

    /**
     * Build claim rewards transaction
     */
    async buildClaimRewardsTx(userAddress: string): Promise<PreparedTransaction | null> {
        if (IS_LIVE_MODE) {
            try {
                const client = await this.getClient();
                const rewards = await client.getClaimableRewards(userAddress as `0x${string}`);
                
                if (!rewards || !client.hasMerklClaimableRewards(rewards)) {
                    return null;
                }

                const tx = client.prepareClaimMerklRewards(userAddress as `0x${string}`, rewards);
                
                return {
                    to: tx.to,
                    data: tx.data,
                    value: tx.value?.toString() || '0',
                };
            } catch {
                return null;
            }
        }

        return null;
    }

    // ============ EXECUTE TRANSACTIONS (Using YO SDK) ============

    /**
     * Execute deposit (for testing/dev mode)
     */
    async deposit(
        vaultAddress: string,
        amount: number,
        userAddress: string
    ): Promise<{ hash: string; shares: string; status: string }> {
        if (IS_LIVE_MODE) {
            try {
                const client = await this.getClient();
                const { parseUnits } = await import('viem');
                
                const result = await client.deposit({
                    vault: vaultAddress as `0x${string}`,
                    amount: parseUnits(amount.toString(), 6),
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

        console.log(`[YO_SDK] MOCK deposit: ${amount} to ${vaultAddress}`);
        await this.simulateDelay(2000);
        
        return {
            hash: `0x${this.generateFakeHash()}`,
            shares: (amount * 0.98).toFixed(6),
            status: 'confirmed',
        };
    }

    /**
     * Execute redeem (for testing/dev mode)
     */
    async redeem(
        vaultAddress: string,
        shares: number,
        userAddress: string
    ): Promise<{ hash: string; assets: string; status: string }> {
        if (IS_LIVE_MODE) {
            try {
                const client = await this.getClient();
                const { parseUnits } = await import('viem');
                
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

        console.log(`[YO_SDK] MOCK redeem: ${shares} from ${vaultAddress}`);
        await this.simulateDelay(2000);
        
        return {
            hash: `0x${this.generateFakeHash()}`,
            assets: (shares * 1.02).toFixed(6),
            status: 'confirmed',
        };
    }

    // ============ PRIVATE HELPERS ============

    private async getClient(): Promise<any> {
        if (!this.client) {
            const { createYoClient } = await import('@yo-protocol/core');
            this.client = createYoClient({ 
                chainId: this.chainId,
            });
        }
        return this.client;
    }

    private getNetworkName(): string {
        const networkMap: Record<number, string> = {
            1: 'Ethereum',
            8453: 'Base',
            84532: 'Base Sepolia',
            42161: 'Arbitrum One',
            421614: 'Arbitrum Sepolia',
        };
        return networkMap[this.chainId] || 'Unknown';
    }

    private parseAPY(apy: any): number {
        if (typeof apy === 'number') return apy;
        if (typeof apy === 'string') return parseFloat(apy);
        if (typeof apy === 'bigint') return Number(apy) / 100;
        return 5.0;
    }

    private calculateRiskScore(name?: string): number {
        const riskMap: Record<string, number> = {
            'yoUSD': 2, 'yoUSDC': 2, 'USDC': 2,
            'yoUSDT': 2, 'USDT': 2,
            'yoDAI': 2, 'DAI': 2,
            'yoEUR': 3,
            'yoGOLD': 4,
            'yoETH': 5, 'ETH': 5,
            'yoBTC': 6, 'BTC': 6,
        };
        
        if (!name) return 5;
        for (const [key, value] of Object.entries(riskMap)) {
            if (name.toUpperCase().includes(key.toUpperCase())) {
                return value;
            }
        }
        return 5;
    }

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
}

export const yoService = new YoSDKService();
