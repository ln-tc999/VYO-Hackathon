// ============================================================
// VIO_AGENT: Decision Engine
// Rule-based AI for yield optimization and goal tracking
// ============================================================

import { type VaultInfo, type Goal, type AIDecision } from '../../../../shared/types/index.js';

export interface UserState {
  walletAddress: string;
  goals: Goal[];
  vaults: VaultInfo[];
  gasPrice: number;
}

export interface Decision {
  type: 'REBALANCE' | 'RISK_ALERT' | 'DEPOSIT_SUGGESTION' | 'GOAL_FORECAST';
  goalId?: string;
  action: string;
  reasoning: string;
  expectedGain: number;
  gasCost: number;
  requiresApproval: boolean;
}

/**
 * VIO_AGENT: Main decision engine
 * Rule-based for hackathon - no ML required
 */
export async function decisionEngine(state: UserState): Promise<Decision[]> {
  const decisions: Decision[] = [];

  // Skip if no goals
  if (state.goals.length === 0) {
    return decisions;
  }

  for (const goal of state.goals) {
    // VIO_AGENT: 1. OPPORTUNITY SCAN - check for better vaults
    const opportunityDecision = await scanForOpportunities(goal, state);
    if (opportunityDecision) {
      decisions.push(opportunityDecision);
    }

    // VIO_AGENT: 2. GOAL TRACKING - check if off track
    const trackingDecision = await checkGoalProgress(goal);
    if (trackingDecision) {
      decisions.push(trackingDecision);
    }
  }

  return decisions;
}

/**
 * VIO_AGENT: Scan for better yield opportunities
 */
async function scanForOpportunities(goal: Goal, state: UserState): Promise<Decision | null> {
  // Get current vault allocations
  const allocations = goal.vaultAllocations;
  if (allocations.length === 0) return null;

  // Find best vault for this risk profile
  const currentVault = allocations[0]; // Simplified: check first allocation
  const currentVaultInfo = state.vaults.find(v => v.id === currentVault.vaultId);
  
  if (!currentVaultInfo) return null;

  // Look for better vault with same or lower risk
  const eligibleVaults = state.vaults.filter(v => 
    v.riskScore <= currentVaultInfo.riskScore + 1 && // Similar or lower risk
    v.apy > currentVaultInfo.apy + 2 // At least 2% better
  );

  if (eligibleVaults.length === 0) return null;

  // Find best option
  const bestVault = eligibleVaults.reduce((best, v) => 
    v.apy > best.apy ? v : best
  );

  // Calculate gas cost vs gain
  const gasCost = estimateGas(state.gasPrice, 'rebalance');
  const apyDiff = bestVault.apy - currentVaultInfo.apy;
  const annualGain = (goal.currentAmount * apyDiff) / 100;

  // VIO_AGENT: Only suggest if gas < 50% of annual gain
  if (gasCost > annualGain * 0.5) {
    return null;
  }

  return {
    type: 'REBALANCE',
    goalId: goal.id,
    action: `Move $${goal.currentAmount.toFixed(2)} from ${currentVaultInfo.name} to ${bestVault.name}`,
    reasoning: `${bestVault.name} offers ${apyDiff.toFixed(2)}% higher APY (${bestVault.apy}% vs ${currentVaultInfo.apy}%) with similar risk (${bestVault.riskScore}/10). Estimated annual gain: $${annualGain.toFixed(2)}.`,
    expectedGain: annualGain,
    gasCost,
    requiresApproval: goal.currentAmount > 500, // Auto if < $500
  };
}

/**
 * VIO_AGENT: Check if goal is on track
 */
function checkGoalProgress(goal: Goal): Decision | null {
  const progress = goal.currentAmount / goal.targetAmount;
  const daysToDeadline = (new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  const totalDays = (new Date(goal.deadline).getTime() - new Date(goal.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  
  // Expected progress based on time elapsed
  const timeElapsed = totalDays - daysToDeadline;
  const expectedProgress = timeElapsed / totalDays;

  // VIO_AGENT: If more than 10% behind schedule
  if (progress < expectedProgress - 0.1) {
    const shortfall = goal.targetAmount * (expectedProgress - progress);
    const monthlyIncrease = shortfall / Math.max(1, daysToDeadline / 30);

    return {
      type: 'DEPOSIT_SUGGESTION',
      goalId: goal.id,
      action: `Increase monthly deposit by $${monthlyIncrease.toFixed(0)}`,
      reasoning: `Goal "${goal.name}" is ${Math.round((expectedProgress - progress) * 100)}% behind schedule. You're at ${Math.round(progress * 100)}% but should be at ${Math.round(expectedProgress * 100)}%. Increasing deposits by $${monthlyIncrease.toFixed(0)}/month will get you back on track.`,
      expectedGain: 0,
      gasCost: 0,
      requiresApproval: true, // Always require approval for deposit suggestions
    };
  }

  return null;
}

/**
 * VIO_AGENT: Estimate gas cost in USD
 */
function estimateGas(gasPriceGwei: number, operation: 'deposit' | 'redeem' | 'rebalance'): number {
  const gasUnits = {
    deposit: 150000,
    redeem: 120000,
    rebalance: 280000,
  };

  // Convert gwei to ETH, then to USD (assume $3000 ETH)
  const ethPrice = 3000;
  const gasCostEth = (gasUnits[operation] * gasPriceGwei) / 1e9;
  return gasCostEth * ethPrice;
}

/**
 * Get current APY for a vault
 */
function currentApy(goal: Goal, vaults: VaultInfo[]): number {
  const allocation = goal.vaultAllocations[0];
  if (!allocation) return 0;
  
  const vault = vaults.find(v => v.id === allocation.vaultId);
  return vault?.apy || 0;
}

/**
 * VIO_AGENT: Generate decision ID
 */
export function generateDecisionId(): string {
  return `dec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * VIO_AGENT: Calculate risk level from vault mix
 */
export function calculateRiskLevel(vaults: VaultInfo[], allocations: { vaultId: string; percentage: number }[]): string {
  let weightedRisk = 0;
  let totalPct = 0;

  for (const alloc of allocations) {
    const vault = vaults.find(v => v.id === alloc.vaultId);
    if (vault) {
      weightedRisk += vault.riskScore * alloc.percentage;
      totalPct += alloc.percentage;
    }
  }

  if (totalPct === 0) return 'moderate';

  const avgRisk = weightedRisk / totalPct;
  if (avgRisk <= 3) return 'conservative';
  if (avgRisk <= 5) return 'moderate';
  return 'aggressive';
}
