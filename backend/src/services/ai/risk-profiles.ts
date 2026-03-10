// ============================================================
// WEALTHCOACH: Risk Profile → Vault Strategy Mapping
// Maps user risk profiles to optimal vault allocation splits
// ============================================================

import type { RiskProfile } from '@wealthos/shared';

interface VaultStrategy {
    vaultId: string;
    percentage: number;
    rationale: string;
}

// WEALTHCOACH: These strategies align with the user's risk tolerance
// Conservative = capital preservation, Aggressive = maximum yield
const STRATEGIES: Record<RiskProfile, VaultStrategy[]> = {
    conservative: [
        {
            vaultId: 'yoUSD',
            percentage: 40,
            rationale: 'Stablecoin vault for capital preservation — your money stays safe with steady returns.',
        },
        {
            vaultId: 'yoUSDT',
            percentage: 35,
            rationale: 'Second stablecoin vault to diversify stablecoin risk across providers.',
        },
        {
            vaultId: 'yoEUR',
            percentage: 25,
            rationale: 'Euro-denominated vault adds currency diversification with low risk.',
        },
    ],
    moderate: [
        {
            vaultId: 'yoUSD',
            percentage: 20,
            rationale: 'Stablecoin base for liquidity — always have quick access to a portion.',
        },
        {
            vaultId: 'yoETH',
            percentage: 40,
            rationale: 'ETH vault offers strong growth potential with moderate volatility.',
        },
        {
            vaultId: 'yoGOLD',
            percentage: 20,
            rationale: 'Gold provides a hedge against crypto market swings.',
        },
        {
            vaultId: 'yoEUR',
            percentage: 20,
            rationale: 'Euro vault adds geographic and currency diversification.',
        },
    ],
    aggressive: [
        {
            vaultId: 'yoUSD',
            percentage: 10,
            rationale: 'Small stablecoin reserve for emergency liquidity.',
        },
        {
            vaultId: 'yoETH',
            percentage: 45,
            rationale: 'Heavy ETH allocation for maximum yield — higher risk, higher reward.',
        },
        {
            vaultId: 'yoBTC',
            percentage: 30,
            rationale: 'BTC vault captures Bitcoin yield with strong upside potential.',
        },
        {
            vaultId: 'yoGOLD',
            percentage: 15,
            rationale: 'Gold allocation provides a counterbalance during crypto downturns.',
        },
    ],
};

export function getStrategyForProfile(profile: RiskProfile): VaultStrategy[] {
    return STRATEGIES[profile];
}

export function getRecommendedProfile(
    targetAmount: number,
    deadline: string,
    liquidityNeeds: string
): RiskProfile {
    const monthsUntilDeadline = Math.max(
        1,
        (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)
    );

    // WEALTHCOACH: Simple heuristic — short timeline + high liquidity = conservative
    if (liquidityNeeds === 'instant' || monthsUntilDeadline < 3) {
        return 'conservative';
    }
    if (monthsUntilDeadline < 12 || liquidityNeeds === '24h') {
        return 'moderate';
    }
    if (targetAmount > 50000 && monthsUntilDeadline > 24) {
        return 'aggressive';
    }
    return 'moderate';
}
