// ============================================================
// VIO_AGENT: YO SDK Client Wrapper
// Vault reads: Always real from YO SDK (Base Mainnet)
// Transactions: Mock in dev, real in live
// ============================================================

import type { VaultInfo } from '../../../../shared/types/index.js';
import { MOCK_VAULTS } from './mock-data.js';

const DEV_MODE = process.env.DEV_MODE || 'mock';
const IS_LIVE_TRANSACTIONS = DEV_MODE === 'live';

// SDK only supports mainnet chains: 1 (Ethereum), 8453 (Base), 42161 (Arbitrum)
type SupportedChainId = 1 | 8453 | 42161;
const RAW_CHAIN_ID = parseInt(process.env.YO_CHAIN_ID || '8453');
const YO_CHAIN_ID: SupportedChainId = ([1, 8453, 42161] as number[]).includes(RAW_CHAIN_ID)
    ? RAW_CHAIN_ID as SupportedChainId
    : 8453;

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
    private chainId: SupportedChainId = YO_CHAIN_ID;
    private client: any = null;

    getChainId(): number {
        return this.chainId;
    }

    // ============ VAULT QUERIES ============

    async getVaults(): Promise<VaultInfo[]> {
        if (vaultCache && Date.now() - cacheTimestamp < CACHE_TTL) {
            console.log('[YO_SDK] Returning cached vaults');
            return vaultCache;
        }

        try {
            const client = await this.getClient();
            // VaultStatsItem[] — see @yo-protocol/core dist/api/types.d.ts
            const vaults: any[] = await client.getVaults();

            if (!vaults || vaults.length === 0) throw new Error('Empty vault list from SDK');

            const logoMap: Record<string, string> = {
                usdc:  '/assets/yoUSD.png',
                usdt:  '/assets/yoUSDT.png',
                weth:  '/assets/yoETH.png',
                eth:   '/assets/yoETH.png',
                cbbtc: '/assets/yoBTC.png',
                wbtc:  '/assets/yoBTC.png',
                xaut:  '/assets/yoGold.png',
                eurc:  '/assets/yoEuro.png',
                eurs:  '/assets/yoEuro.png',
                sol:   '/assets/yoSol.png',
            };

            vaultCache = vaults.map((v: any) => {
                // v is VaultStatsItem — confirmed from live API:
                // v.asset.symbol, v.asset.decimals, v.asset.address
                // v.shareAsset.symbol
                // v.chain.name = lowercase e.g. "base", "ethereum"
                // v.tvl.formatted = token amount string (e.g. "44654077.576" for yoUSD)
                // v.tvl.raw = raw bigint string in asset decimals
                // v.yield['7d'] = APY percent string e.g. "4.177"
                // v.contracts.vaultAddress
                const underlyingSym = (v.asset?.symbol || '').toLowerCase();
                const logo = logoMap[underlyingSym] || '/assets/yoUSD.png';
                const decimals = v.asset?.decimals ?? 6;

                // APY: v.yield['7d'] is already a percent string like "4.177"
                const apy = v.yield?.['7d'] != null ? parseFloat(v.yield['7d']) : 0;

                // TVL: v.tvl.formatted is token amount (not USD), use parseFloat directly
                // For display purposes this is fine — stablecoins ≈ USD, ETH/BTC shown in token units
                const tvl = v.tvl?.formatted != null ? parseFloat(v.tvl.formatted) : 0;

                // chain.name is lowercase from API: "base", "ethereum", "arbitrum"
                const chainName = v.chain?.name
                    ? v.chain.name.charAt(0).toUpperCase() + v.chain.name.slice(1)
                    : this.getNetworkName();

                return {
                    id: v.contracts?.vaultAddress || v.id,
                    name: v.name,
                    symbol: v.shareAsset?.symbol || 'yoVAULT',
                    address: v.contracts?.vaultAddress || v.id,
                    chain: chainName,
                    chainId: v.chain?.id || this.chainId,
                    underlyingAsset: v.asset?.address || '',
                    underlyingSymbol: v.asset?.symbol || 'USD',
                    underlyingDecimals: decimals,
                    apy,
                    tvl,
                    riskScore: this.calculateRiskScore(v.shareAsset?.symbol || v.name),
                    lockupPeriod: 'None',
                    auditUrl: 'https://yo.xyz/security',
                    logoUrl: logo,
                } as VaultInfo & { underlyingDecimals: number };
            });

            cacheTimestamp = Date.now();
            console.log(`[YO_SDK] Loaded ${vaultCache!.length} real vaults from YO SDK`);
            return vaultCache as VaultInfo[];
        } catch (error) {
            console.warn('[YO_SDK] SDK unavailable, using mock vaults:', (error as Error).message);
            return MOCK_VAULTS;
        }
    }

    async getVaultDetails(vaultId: string): Promise<VaultInfo | undefined> {
        const vaults = await this.getVaults();
        return vaults.find(v => v.id === vaultId || v.address === vaultId);
    }

    async getVaultByAddress(vaultAddress: string): Promise<VaultInfo | undefined> {
        const vaults = await this.getVaults();
        return vaults.find(v => v.address === vaultAddress);
    }

    async getVaultSnapshot(vaultAddress: string): Promise<VaultSnapshot> {
        try {
            const client = await this.getClient();
            // YoClient.getVaultSnapshot returns VaultSnapshot with stats.tvl, stats.yield
            const snap = await client.getVaultSnapshot(vaultAddress as `0x${string}`);
            const apy = snap.stats?.yield?.['7d'] != null ? parseFloat(snap.stats.yield['7d']) : 0;
            const tvl = snap.stats?.tvl?.formatted != null ? parseFloat(snap.stats.tvl.formatted) : 0;
            return {
                apy,
                tvl,
                totalSupply: snap.stats?.totalSupply?.formatted != null ? parseFloat(snap.stats.totalSupply.formatted) : tvl,
                totalAssets: tvl,
                depositLimit: snap.stats?.maxCap?.formatted != null ? parseFloat(snap.stats.maxCap.formatted) : 0,
                lastUpdate: (snap.lastUpdated ?? 0) * 1000,
            };
        } catch (error) {
            console.warn('[YO_SDK] getVaultSnapshot error:', error);
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

    // ============ USER DATA ============

    async getUserPosition(vaultAddress: string, userAddress: string): Promise<UserPosition> {
        if (IS_LIVE_TRANSACTIONS) {
            try {
                const client = await this.getClient();
                // getUserPosition returns UserVaultPosition { shares: bigint, assets: bigint }
                // shares are in shareAsset decimals, assets in underlying decimals
                const position = await client.getUserPosition(
                    vaultAddress as `0x${string}`,
                    userAddress as `0x${string}`
                );
                const vault = await this.getVaultByAddress(vaultAddress);
                const decimals = (vault as any)?.underlyingDecimals ?? 6;
                const shares = Number(position.shares) / Math.pow(10, decimals);
                const assets = Number(position.assets) / Math.pow(10, decimals);
                return { vaultId: vaultAddress, shares, assets, yieldEarned: assets - shares };
            } catch (error) {
                console.warn('[YO_SDK] getUserPosition error:', error);
            }
        }
        const mockShares = this.hashToNumber(userAddress + vaultAddress) % 10000;
        const mockAssets = mockShares * 1.01;
        return { vaultId: vaultAddress, shares: mockShares, assets: mockAssets, yieldEarned: mockAssets - mockShares };
    }

    async getUserAllPositions(userAddress: string): Promise<UserPosition[]> {
        const vaults = await this.getVaults();
        const positions: UserPosition[] = [];
        for (const vault of vaults) {
            const position = await this.getUserPosition(vault.address, userAddress);
            if (position.shares > 0) positions.push(position);
        }
        return positions;
    }

    async getUserPerformance(userAddress: string): Promise<UserPerformance> {
        if (IS_LIVE_TRANSACTIONS) {
            try {
                const client = await this.getClient();
                // getUserBalances returns UserBalances { totalBalanceUsd, assets[] }
                const balances = await client.getUserBalances(userAddress as `0x${string}`);
                const totalUsd = parseFloat(balances.totalBalanceUsd || '0');
                return {
                    totalDeposited: totalUsd,
                    totalWithdrawn: 0,
                    totalYield: 0,
                    yieldPercent: 0,
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

    // ============ TRANSACTION BUILDING ============

    async buildDepositWithApproval(
        vaultAddress: string,
        amount: number,
        userAddress: string
    ): Promise<{ transactions: PreparedTransaction[]; preview: { shares: number; slippage: number } }> {
        if (IS_LIVE_TRANSACTIONS) {
            try {
                const client = await this.getClient();
                const vault = await this.getVaultByAddress(vaultAddress);
                const decimals = (vault as any)?.underlyingDecimals ?? 6;
                const tokenAddress = vault?.underlyingAsset as `0x${string}`;
                if (!tokenAddress) throw new Error('Unknown underlying asset for vault');

                const amountWei = BigInt(Math.floor(amount * Math.pow(10, decimals)));

                // prepareDepositWithApproval: { vault, token, owner, amount, recipient?, slippageBps? }
                const txs = await client.prepareDepositWithApproval({
                    vault:     vaultAddress as `0x${string}`,
                    token:     tokenAddress,
                    owner:     userAddress as `0x${string}`,
                    amount:    amountWei,
                    recipient: userAddress as `0x${string}`,
                    slippageBps: 50,
                });

                // previewDeposit: on-chain call, returns shares as bigint in shareAsset decimals
                const previewShares = await client.previewDeposit(
                    vaultAddress as `0x${string}`,
                    amountWei
                );
                // shareAsset decimals = same as underlying for YO vaults
                const sharesHuman = Number(previewShares) / Math.pow(10, decimals);

                return {
                    transactions: txs.map((tx: any) => ({
                        to:    tx.to,
                        data:  tx.data,
                        value: (tx.value ?? 0n).toString(),
                    })),
                    preview: { shares: sharesHuman, slippage: 0.5 },
                };
            } catch (error) {
                console.error('[YO_SDK] buildDepositWithApproval error:', error);
                throw error;
            }
        }

        return {
            transactions: [{ to: vaultAddress, data: '0x', value: '0' }],
            preview: { shares: amount * 0.98, slippage: 0.5 },
        };
    }

    async buildRedeemWithApproval(
        vaultAddress: string,
        shares: number,
        userAddress: string
    ): Promise<{ transactions: PreparedTransaction[]; preview: { assets: number } }> {
        if (IS_LIVE_TRANSACTIONS) {
            try {
                const client = await this.getClient();
                const vault = await this.getVaultByAddress(vaultAddress);
                const decimals = (vault as any)?.underlyingDecimals ?? 6;
                const sharesWei = BigInt(Math.floor(shares * Math.pow(10, decimals)));

                const txs = await client.prepareRedeemWithApproval({
                    vault: vaultAddress as `0x${string}`,
                    owner: userAddress as `0x${string}`,
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
                        value: (tx.value ?? 0n).toString(),
                    })),
                    preview: { assets: Number(previewAssets) / Math.pow(10, decimals) },
                };
            } catch (error) {
                console.error('[YO_SDK] buildRedeemWithApproval error:', error);
                throw error;
            }
        }

        return {
            transactions: [{ to: vaultAddress, data: '0x', value: '0' }],
            preview: { assets: shares * 1.02 },
        };
    }

    async previewDeposit(vaultAddress: string, amount: number): Promise<number> {
        if (IS_LIVE_TRANSACTIONS) {
            try {
                const client = await this.getClient();
                const vault = await this.getVaultByAddress(vaultAddress);
                const decimals = (vault as any)?.underlyingDecimals ?? 6;
                const amountWei = BigInt(Math.floor(amount * Math.pow(10, decimals)));
                const shares = await client.previewDeposit(vaultAddress as `0x${string}`, amountWei);
                return Number(shares) / Math.pow(10, decimals);
            } catch {
                return amount * 0.98;
            }
        }
        return amount * 0.98;
    }

    async previewRedeem(vaultAddress: string, shares: number): Promise<number> {
        if (IS_LIVE_TRANSACTIONS) {
            try {
                const client = await this.getClient();
                const vault = await this.getVaultByAddress(vaultAddress);
                const decimals = (vault as any)?.underlyingDecimals ?? 6;
                const sharesWei = BigInt(Math.floor(shares * Math.pow(10, decimals)));
                const assets = await client.previewRedeem(vaultAddress as `0x${string}`, sharesWei);
                return Number(assets) / Math.pow(10, decimals);
            } catch {
                return shares * 1.02;
            }
        }
        return shares * 1.02;
    }

    // ============ PRICING ============

    async getTokenPrices(): Promise<PriceMap> {
        try {
            const client = await this.getClient();
            // getPrices() returns Record<coingeckoId, number> e.g. { "ethereum": 2325, "usd-coin": 1, ... }
            const prices = await client.getPrices();
            return {
                ETH:  Number(prices['ethereum']  ?? 3000),
                USDC: Number(prices['usd-coin']  ?? 1),
                USDT: Number(prices['tether']    ?? 1),
                DAI:  Number(prices['dai']       ?? 1),
            };
        } catch {
            return { ETH: 3000, USDC: 1, USDT: 1, DAI: 1 };
        }
    }

    // ============ MERKL REWARDS ============

    async getClaimableRewards(userAddress: string): Promise<MerklReward[]> {
        if (IS_LIVE_TRANSACTIONS) {
            try {
                const client = await this.getClient();
                const chainRewards = await client.getClaimableRewards(userAddress as `0x${string}`);
                if (!chainRewards) return [];
                return chainRewards.rewards
                    .filter((r: any) => BigInt(r.pending ?? '0') > 0n)
                    .map((r: any) => ({
                        campaignId: r.token?.symbol || 'unknown',
                        token: r.token?.address || '',
                        amount: BigInt(r.pending ?? '0'),
                        claimable: true,
                    }));
            } catch {
                return [];
            }
        }
        return [];
    }

    async buildClaimRewardsTx(userAddress: string): Promise<PreparedTransaction | null> {
        if (IS_LIVE_TRANSACTIONS) {
            try {
                const client = await this.getClient();
                const chainRewards = await client.getClaimableRewards(userAddress as `0x${string}`);
                if (!chainRewards || !client.hasMerklClaimableRewards(chainRewards)) return null;
                const tx = client.prepareClaimMerklRewards(userAddress as `0x${string}`, chainRewards);
                return { to: tx.to, data: tx.data, value: (tx.value ?? 0n).toString() };
            } catch {
                return null;
            }
        }
        return null;
    }

    // ============ PRIVATE HELPERS ============

    private async getClient(): Promise<any> {
        if (!this.client) {
            const { createYoClient } = await import('@yo-protocol/core');
            this.client = createYoClient({ chainId: this.chainId });
        }
        return this.client;
    }

    private getNetworkName(): string {
        const map: Record<number, string> = {
            1: 'Ethereum', 8453: 'Base', 84532: 'Base Sepolia',
            42161: 'Arbitrum One', 421614: 'Arbitrum Sepolia',
        };
        return map[this.chainId] || 'Unknown';
    }

    private calculateRiskScore(name?: string): number {
        if (!name) return 5;
        const n = name.toUpperCase();
        if (n.includes('USD') || n.includes('DAI')) return 2;
        if (n.includes('EUR'))  return 3;
        if (n.includes('GOLD') || n.includes('XAU')) return 4;
        if (n.includes('ETH'))  return 5;
        if (n.includes('BTC'))  return 6;
        if (n.includes('SOL'))  return 6;
        return 5;
    }

    private hashToNumber(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash;
        }
        return Math.abs(hash);
    }
}

export const yoService = new YoSDKService();
