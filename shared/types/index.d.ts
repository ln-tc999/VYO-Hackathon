export interface User {
    id: string;
    walletAddress: string;
    displayName: string;
    riskProfile: RiskProfile;
    bankBalance: number;
    autoDepositThreshold: number;
    createdAt: string;
}
export type RiskProfile = 'conservative' | 'moderate' | 'aggressive';
export interface Goal {
    id: string;
    userId: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    deadline: string;
    priority: 'low' | 'medium' | 'high';
    liquidityNeeds: 'instant' | '24h' | '1week' | 'flexible';
    riskProfile: RiskProfile;
    status: 'active' | 'completed' | 'paused';
    vaultAllocations: VaultAllocation[];
    autoDeposit?: AutoDepositConfig;
    createdAt: string;
}
export interface VaultAllocation {
    vaultId: string;
    vaultName: string;
    percentage: number;
    currentBalance: number;
    rationale: string;
}
export interface AutoDepositConfig {
    enabled: boolean;
    amount: number;
    frequency: 'daily' | 'weekly' | 'monthly';
}
export interface VaultInfo {
    id: string;
    name: string;
    symbol: string;
    address: string;
    chain: string;
    chainId: number;
    underlyingAsset: string;
    underlyingSymbol: string;
    apy: number;
    tvl: number;
    riskScore: number;
    lockupPeriod: string;
    auditUrl: string;
    logoUrl: string;
}
export interface Transaction {
    id: string;
    userId: string;
    goalId: string;
    type: 'deposit' | 'redeem';
    vaultId: string;
    vaultName: string;
    amount: number;
    txHash: string;
    status: 'pending' | 'confirmed' | 'failed';
    createdAt: string;
}
export interface AIDecision {
    id: string;
    goalId: string;
    goalName: string;
    type: 'rebalance' | 'risk_alert' | 'deposit_suggestion' | 'goal_forecast';
    action: string;
    reasoning: string;
    expectedGain: number;
    gasCost: number;
    status: 'pending_approval' | 'approved' | 'rejected' | 'executed';
    fromVault?: string;
    toVault?: string;
    amount?: number;
    createdAt: string;
}
export interface DashboardSummary {
    totalNetWorth: number;
    defiBalance: number;
    tradFiBalance: number;
    totalYieldEarned: number;
    yieldToday: number;
    yieldWeek: number;
    yieldMonth: number;
    goalCount: number;
    goalsOnTrack: number;
    activeVaults: number;
    recentDecisions: AIDecision[];
    goalSummaries: GoalSummary[];
}
export interface GoalSummary {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    progressPercent: number;
    deadline: string;
    status: 'active' | 'completed' | 'paused';
}
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}
//# sourceMappingURL=index.d.ts.map