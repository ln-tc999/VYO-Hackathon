// ============================================================
// VIO_AGENT: Yield Tracker Service
// Track yoVault token positions, yield earned, and user balances
// ============================================================

import { yoService } from './yo-sdk/client.js';
import type { VaultInfo } from '../../../shared/types/index.js';

export interface YieldData {
    vaultId: string;
    vaultAddress: string;
    vaultName: string;
    vaultSymbol: string;
    currentApy: number;
    totalDeposited: number;
    currentValue: number;
    realizedYield: number;
    projectedYield: number;
    profit: number;
    shares: number;
    underlyingAsset: string;
    underlyingSymbol: string;
}

export interface UserYieldSummary {
    totalDeposited: number;
    currentValue: number;
    totalProfit: number;
    avgApy: number;
    vaultCount: number;
    vaults: YieldData[];
}

export interface VaultTokenPosition {
    vaultAddress: string;
    vaultName: string;
    vaultSymbol: string;
    shares: number;
    assets: number;
    apy: number;
    tvl: number;
    lastUpdated: string;
}

/**
 * Yield Tracker Service
 * 
 * Tracks user positions in YO vaults and calculates yield earned
 * Using ERC-4626 share appreciation mechanism
 */
export class YieldTracker {
    
    /**
     * Get user's yield data for a specific vault
     * Calculates realized yield based on shares appreciation
     */
    async getUserVaultYield(
        userAddress: string,
        vaultAddress: string
    ): Promise<YieldData | null> {
        try {
            // 1. Get current position from YO SDK
            const position = await yoService.getUserPosition(vaultAddress, userAddress);
            
            // Skip if no position
            if (position.shares === 0) {
                return null;
            }
            
            // 2. Get vault details
            const vault = await yoService.getVaultDetails(vaultAddress);
            if (!vault) {
                console.warn(`[YIELD] Vault not found: ${vaultAddress}`);
                return null;
            }
            
            // 3. Get deposit history for this vault
            const depositHistory = await this.getVaultDepositHistory(userAddress, vaultAddress);
            
            // 4. Calculate total deposited
            const totalDeposited = depositHistory
                .filter(tx => tx.type === 'deposit')
                .reduce((sum, tx) => sum + tx.amount, 0);
            
            const totalWithdrawn = depositHistory
                .filter(tx => tx.type === 'redeem')
                .reduce((sum, tx) => sum + tx.amount, 0);
            
            // 5. Calculate yield using ERC-4626 share appreciation
            const netDeposited = totalDeposited - totalWithdrawn;
            const currentValue = position.assets;
            const profit = currentValue - netDeposited;
            
            // 6. Calculate projected annual yield
            const projectedYield = currentValue * (vault.apy / 100);
            
            return {
                vaultId: vault.id,
                vaultAddress: vault.address,
                vaultName: vault.name,
                vaultSymbol: vault.symbol,
                currentApy: vault.apy,
                totalDeposited: netDeposited,
                currentValue: currentValue,
                realizedYield: profit,
                projectedYield: projectedYield,
                profit: profit,
                shares: position.shares,
                underlyingAsset: vault.underlyingAsset,
                underlyingSymbol: vault.underlyingSymbol,
            };
        } catch (error) {
            console.error(`[YIELD] Error getting yield for vault ${vaultAddress}:`, error);
            return null;
        }
    }
    
    /**
     * Get total yield summary across all user vaults
     */
    async getUserTotalYield(userAddress: string): Promise<UserYieldSummary> {
        try {
            // 1. Get all vaults
            const vaults = await yoService.getVaults();
            const userVaults: YieldData[] = [];
            
            // 2. Check each vault for user position
            for (const vault of vaults) {
                const yieldData = await this.getUserVaultYield(userAddress, vault.address);
                if (yieldData && yieldData.shares > 0) {
                    userVaults.push(yieldData);
                }
            }
            
            // 3. Calculate totals
            const totalDeposited = userVaults.reduce((sum: number, v: YieldData) => sum + v.totalDeposited, 0);
            const currentValue = userVaults.reduce((sum: number, v: YieldData) => sum + v.currentValue, 0);
            const totalProfit = currentValue - totalDeposited;
            
            // 4. Calculate weighted average APY
            const weightedApy = userVaults.length > 0
                ? userVaults.reduce((sum: number, v: YieldData) => sum + (v.currentApy * v.currentValue), 0) / currentValue
                : 0;
            
            return {
                totalDeposited,
                currentValue,
                totalProfit,
                avgApy: weightedApy,
                vaultCount: userVaults.length,
                vaults: userVaults,
            };
        } catch (error) {
            console.error('[YIELD] Error getting total yield:', error);
            return {
                totalDeposited: 0,
                currentValue: 0,
                totalProfit: 0,
                avgApy: 0,
                vaultCount: 0,
                vaults: [],
            };
        }
    }
    
    /**
     * Get user's yoVault token positions
     * Returns all positions where user has shares
     */
    async getUserVaultPositions(userAddress: string): Promise<VaultTokenPosition[]> {
        try {
            const vaults = await yoService.getVaults();
            const positions: VaultTokenPosition[] = [];
            
            for (const vault of vaults) {
                const position = await yoService.getUserPosition(vault.address, userAddress);
                
                if (position.shares > 0) {
                    positions.push({
                        vaultAddress: vault.address,
                        vaultName: vault.name,
                        vaultSymbol: vault.symbol,
                        shares: position.shares,
                        assets: position.assets,
                        apy: vault.apy,
                        tvl: vault.tvl,
                        lastUpdated: new Date().toISOString(),
                    });
                }
            }
            
            return positions;
        } catch (error) {
            console.error('[YIELD] Error getting vault positions:', error);
            return [];
        }
    }
    
    /**
     * Get yield history for charts
     */
    async getYieldHistory(
        vaultAddress: string,
        days: number = 30
    ): Promise<Array<{date: string; apy: number; tvl: number}>> {
        try {
            const response = await fetch(
                `https://api.yo.xyz/api/v1/vault/yield/timeseries/${yoService.getChainId()}/${vaultAddress}?days=${days}`
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch yield history');
            }
            
            const data = await response.json();
            return data.data.map((point: any) => ({
                date: point.date,
                apy: point.apy,
                tvl: point.tvl || 0,
            }));
        } catch (error) {
            console.error('[YIELD] Error getting yield history:', error);
            return [];
        }
    }
    
    /**
     * Get user's deposit/withdrawal history for a vault
     * Note: In production, this should come from The Graph or similar
     */
    private async getVaultDepositHistory(
        userAddress: string,
        vaultAddress: string
    ): Promise<Array<{type: 'deposit' | 'redeem'; amount: number; timestamp: string}>> {
        // TODO: Implement using The Graph or YO API history endpoint
        // For now, return empty array - in production, fetch from blockchain
        try {
            const response = await fetch(
                `https://api.yo.xyz/api/v1/history/user/${yoService.getChainId()}/${vaultAddress}/${userAddress}?limit=50`
            );
            
            if (!response.ok) {
                return [];
            }
            
            const data = await response.json();
            return data.data.map((tx: any) => ({
                type: tx.type,
                amount: parseFloat(tx.amount?.formatted || '0'),
                timestamp: tx.timestamp,
            }));
        } catch {
            return [];
        }
    }
    
    /**
     * Calculate yield earned between two dates
     */
    calculateYieldEarned(
        initialValue: number,
        currentValue: number,
        days: number
    ): { absolute: number; percentage: number; apr: number } {
        const absoluteYield = currentValue - initialValue;
        const percentageYield = initialValue > 0 ? (absoluteYield / initialValue) * 100 : 0;
        
        // Annualize the yield (APR)
        const apr = days > 0 ? (percentageYield / days) * 365 : 0;
        
        return {
            absolute: absoluteYield,
            percentage: percentageYield,
            apr: apr,
        };
    }
    
    /**
     * Get yield optimization suggestions
     * Compare current vault APY with other available vaults
     */
    async getYieldOptimizationSuggestions(
        userAddress: string,
        riskProfile: 'conservative' | 'moderate' | 'aggressive'
    ): Promise<Array<{
        currentVault: string;
        suggestedVault: string;
        currentApy: number;
        suggestedApy: number;
        potentialGain: number;
        reasoning: string;
    }>> {
        try {
            const suggestions = [];
            const vaults = await yoService.getVaults();
            const userPositions = await this.getUserVaultPositions(userAddress);
            
            // Risk level mapping
            const riskThresholds: Record<string, number> = {
                'conservative': 3,
                'moderate': 5,
                'aggressive': 10,
            };
            const maxRisk = riskThresholds[riskProfile] || 5;
            
            for (const position of userPositions) {
                const currentVault = vaults.find(v => v.address === position.vaultAddress);
                if (!currentVault) continue;
                
                // Find better yielding vaults with similar or lower risk
                const betterVaults = vaults.filter(v => 
                    v.riskScore <= maxRisk &&
                    v.riskScore <= currentVault.riskScore + 1 &&
                    v.apy > currentVault.apy + 1.5 // At least 1.5% better
                );
                
                if (betterVaults.length === 0) continue;
                
                // Pick the best one
                const bestVault = betterVaults.reduce((best: VaultInfo, v: VaultInfo) => 
                    v.apy > best.apy ? v : best
                );
                
                const apyDiff = bestVault.apy - currentVault.apy;
                const potentialAnnualGain = position.assets * (apyDiff / 100);
                
                suggestions.push({
                    currentVault: currentVault.name,
                    suggestedVault: bestVault.name,
                    currentApy: currentVault.apy,
                    suggestedApy: bestVault.apy,
                    potentialGain: potentialAnnualGain,
                    reasoning: `${bestVault.name} offers ${apyDiff.toFixed(2)}% higher APY with similar risk level`,
                });
            }
            
            return suggestions;
        } catch (error) {
            console.error('[YIELD] Error getting optimization suggestions:', error);
            return [];
        }
    }
}

export const yieldTracker = new YieldTracker();
