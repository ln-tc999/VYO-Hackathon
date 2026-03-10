// ============================================================
// WEALTHCOACH: In-Memory Data Store
// Pre-seeded with demo data — replace with DB in production
// ============================================================

import { v4 as uuid } from 'uuid';
import type {
    User,
    Goal,
    AIDecision,
    Transaction,
} from '../../../shared/types/index.js';

interface Store {
    users: Map<string, User>;
    goals: Map<string, Goal>;
    decisions: Map<string, AIDecision>;
    transactions: Map<string, Transaction>;
}

const DEMO_USER_ID = 'user-demo-001';

function createDemoData(): Store {
    const users = new Map<string, User>();
    const goals = new Map<string, Goal>();
    const decisions = new Map<string, AIDecision>();
    const transactions = new Map<string, Transaction>();

    // Demo user
    users.set(DEMO_USER_ID, {
        id: DEMO_USER_ID,
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
        displayName: 'Sarah',
        riskProfile: 'moderate',
        bankBalance: 12_450,
        autoDepositThreshold: 1000,
        createdAt: new Date('2025-01-15').toISOString(),
    });

    // Demo goals
    const goal1Id = 'goal-001';
    const goal2Id = 'goal-002';
    const goal3Id = 'goal-003';

    goals.set(goal1Id, {
        id: goal1Id,
        userId: DEMO_USER_ID,
        name: 'New Car Fund',
        targetAmount: 15_000,
        currentAmount: 6_750,
        deadline: new Date('2026-06-01').toISOString(),
        priority: 'high',
        liquidityNeeds: '1week',
        riskProfile: 'moderate',
        status: 'active',
        vaultAllocations: [
            {
                vaultId: 'yoUSD',
                vaultName: 'YO USD Vault',
                percentage: 30,
                currentBalance: 2_025,
                rationale: 'Stablecoin base for quick access when you find the right car.',
            },
            {
                vaultId: 'yoETH',
                vaultName: 'YO ETH Vault',
                percentage: 50,
                currentBalance: 3_375,
                rationale: 'ETH vault for growth potential — your timeline gives room for volatility.',
            },
            {
                vaultId: 'yoGOLD',
                vaultName: 'YO Gold Vault',
                percentage: 20,
                currentBalance: 1_350,
                rationale: 'Gold hedge to protect against market dips.',
            },
        ],
        autoDeposit: { enabled: true, amount: 500, frequency: 'monthly' },
        createdAt: new Date('2025-02-01').toISOString(),
    });

    goals.set(goal2Id, {
        id: goal2Id,
        userId: DEMO_USER_ID,
        name: 'Emergency Fund',
        targetAmount: 10_000,
        currentAmount: 8_200,
        deadline: new Date('2025-12-31').toISOString(),
        priority: 'high',
        liquidityNeeds: 'instant',
        riskProfile: 'conservative',
        status: 'active',
        vaultAllocations: [
            {
                vaultId: 'yoUSD',
                vaultName: 'YO USD Vault',
                percentage: 50,
                currentBalance: 4_100,
                rationale: 'Instant liquidity — this is your safety net.',
            },
            {
                vaultId: 'yoUSDT',
                vaultName: 'YO USDT Vault',
                percentage: 30,
                currentBalance: 2_460,
                rationale: 'Diversified across stablecoin providers for safety.',
            },
            {
                vaultId: 'yoEUR',
                vaultName: 'YO EUR Vault',
                percentage: 20,
                currentBalance: 1_640,
                rationale: 'Euro exposure adds a layer of currency diversification.',
            },
        ],
        createdAt: new Date('2025-01-20').toISOString(),
    });

    goals.set(goal3Id, {
        id: goal3Id,
        userId: DEMO_USER_ID,
        name: 'House Down Payment',
        targetAmount: 50_000,
        currentAmount: 12_300,
        deadline: new Date('2028-01-01').toISOString(),
        priority: 'medium',
        liquidityNeeds: 'flexible',
        riskProfile: 'aggressive',
        status: 'active',
        vaultAllocations: [
            {
                vaultId: 'yoUSD',
                vaultName: 'YO USD Vault',
                percentage: 10,
                currentBalance: 1_230,
                rationale: 'Small stablecoin reserve for rebalancing flexibility.',
            },
            {
                vaultId: 'yoETH',
                vaultName: 'YO ETH Vault',
                percentage: 45,
                currentBalance: 5_535,
                rationale: 'Aggressive ETH allocation — long timeline allows risk-taking.',
            },
            {
                vaultId: 'yoBTC',
                vaultName: 'YO BTC Vault',
                percentage: 30,
                currentBalance: 3_690,
                rationale: 'Bitcoin for long-term appreciation.',
            },
            {
                vaultId: 'yoGOLD',
                vaultName: 'YO Gold Vault',
                percentage: 15,
                currentBalance: 1_845,
                rationale: 'Gold counterbalance during crypto bear markets.',
            },
        ],
        autoDeposit: { enabled: true, amount: 800, frequency: 'monthly' },
        createdAt: new Date('2025-03-01').toISOString(),
    });

    // Demo AI decisions
    const dec1Id = 'dec-001';
    const dec2Id = 'dec-002';
    const dec3Id = 'dec-003';

    decisions.set(dec1Id, {
        id: dec1Id,
        goalId: goal1Id,
        goalName: 'New Car Fund',
        type: 'rebalance',
        action: 'Move $500 from YO USD Vault to YO ETH Vault',
        reasoning:
            'YO ETH Vault is earning 5.2% APY compared to 8.4% in YO USD. However, your car fund has a 15-month runway, and increasing ETH exposure could boost returns by $45/year. The move costs about $0.80 in gas on Base.',
        expectedGain: 44.2,
        gasCost: 0.8,
        status: 'pending_approval',
        fromVault: 'yoUSD',
        toVault: 'yoETH',
        amount: 500,
        createdAt: new Date().toISOString(),
    });

    decisions.set(dec2Id, {
        id: dec2Id,
        goalId: goal2Id,
        goalName: 'Emergency Fund',
        type: 'goal_forecast',
        action: 'You\'re 82% to your Emergency Fund goal!',
        reasoning:
            'At your current rate, you\'ll reach your $10,000 emergency fund target by October — 2 months ahead of schedule. Great progress!',
        expectedGain: 0,
        gasCost: 0,
        status: 'executed',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
    });

    decisions.set(dec3Id, {
        id: dec3Id,
        goalId: goal3Id,
        goalName: 'House Down Payment',
        type: 'deposit_suggestion',
        action: 'Increase monthly deposit to $1,200 to stay on track',
        reasoning:
            'Your House Down Payment goal needs about $37,700 more over the next 34 months. At $800/month, you\'d fall about $4,500 short. Bumping to $1,200/month gets you there with a comfortable cushion.',
        expectedGain: 0,
        gasCost: 0,
        status: 'pending_approval',
        createdAt: new Date(Date.now() - 43200000).toISOString(),
    });

    return { users, goals, decisions, transactions };
}

let store: Store | null = null;

export function getStore(): Store {
    if (!store) {
        store = createDemoData();
    }
    return store;
}

export function getDemoUserId(): string {
    return DEMO_USER_ID;
}
