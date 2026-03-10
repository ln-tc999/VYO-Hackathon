// ============================================================
// WEALTHCOACH: AI Rebalancing & Decision Engine
// Rule-based heuristics for yield optimization and risk management
// ============================================================

import { v4 as uuid } from 'uuid';
import type { AIDecision, Goal, VaultInfo } from '@wealthos/shared';
import { getStore } from '../../models/store.js';

/**
 * WEALTHCOACH: Main decision engine.
 * Runs the Sense → Plan → Act loop to generate actionable decisions.
 */
export class WealthCoachEngine {

    /** Run opportunity scan — find better yield opportunities */
    async scanOpportunities(
        goals: Goal[],
        vaults: VaultInfo[]
    ): Promise<AIDecision[]> {
        const decisions: AIDecision[] = [];

        for (const goal of goals) {
            if (goal.status !== 'active') continue;

            for (const allocation of goal.vaultAllocations) {
                const currentVault = vaults.find(v => v.id === allocation.vaultId);
                if (!currentVault) continue;

                // WEALTHCOACH: Look for vaults with >2% APY improvement at similar risk
                const betterVaults = vaults.filter(
                    v =>
                        v.id !== allocation.vaultId &&
                        v.apy > currentVault.apy + 2 &&
                        Math.abs(v.riskScore - currentVault.riskScore) <= 1
                );

                for (const better of betterVaults) {
                    const expectedGain =
                        (allocation.currentBalance * (better.apy - currentVault.apy)) / 100;
                    const gasCost = currentVault.chainId === 1 ? 12.5 : 0.8; // L1 vs L2

                    // WEALTHCOACH: Gas check — only suggest if gain > 2x gas cost
                    if (expectedGain > gasCost * 2) {
                        decisions.push({
                            id: uuid(),
                            goalId: goal.id,
                            goalName: goal.name,
                            type: 'rebalance',
                            action: `Move $${allocation.currentBalance.toFixed(0)} from ${currentVault.name} to ${better.name}`,
                            reasoning: `${better.name} is earning ${better.apy.toFixed(1)}% APY vs ${currentVault.apy.toFixed(1)}% in your current vault. That's ${(better.apy - currentVault.apy).toFixed(1)}% more yield with similar risk. After gas fees ($${gasCost.toFixed(2)}), you'd earn an extra $${(expectedGain - gasCost).toFixed(2)} per year.`,
                            expectedGain: expectedGain - gasCost,
                            gasCost,
                            status: 'pending_approval',
                            fromVault: currentVault.id,
                            toVault: better.id,
                            amount: allocation.currentBalance,
                            createdAt: new Date().toISOString(),
                        });
                    }
                }
            }
        }

        return decisions;
    }

    /** Run risk scan — alert on risk score changes */
    async scanRisks(
        goals: Goal[],
        vaults: VaultInfo[]
    ): Promise<AIDecision[]> {
        const decisions: AIDecision[] = [];

        for (const goal of goals) {
            if (goal.status !== 'active') continue;

            for (const allocation of goal.vaultAllocations) {
                const vault = vaults.find(v => v.id === allocation.vaultId);
                if (!vault) continue;

                // WEALTHCOACH: Alert if vault risk is too high for conservative goals
                if (
                    goal.riskProfile === 'conservative' &&
                    vault.riskScore > 4
                ) {
                    decisions.push({
                        id: uuid(),
                        goalId: goal.id,
                        goalName: goal.name,
                        type: 'risk_alert',
                        action: `Consider moving funds from ${vault.name} to a lower-risk vault`,
                        reasoning: `Your "${goal.name}" goal is set to conservative risk, but ${vault.name} has a risk score of ${vault.riskScore}/10. We recommend vaults with risk scores of 4 or lower for conservative goals.`,
                        expectedGain: 0,
                        gasCost: 0,
                        status: 'pending_approval',
                        fromVault: vault.id,
                        createdAt: new Date().toISOString(),
                    });
                }
            }
        }

        return decisions;
    }

    /** Run goal tracking — check if goals are on track */
    async trackGoals(goals: Goal[]): Promise<AIDecision[]> {
        const decisions: AIDecision[] = [];

        for (const goal of goals) {
            if (goal.status !== 'active') continue;

            const progress = goal.currentAmount / goal.targetAmount;
            const timeElapsed =
                (Date.now() - new Date(goal.createdAt).getTime()) /
                (new Date(goal.deadline).getTime() - new Date(goal.createdAt).getTime());

            // WEALTHCOACH: If progress is >10% behind schedule, suggest adjustment
            if (timeElapsed > 0.1 && progress < timeElapsed - 0.1) {
                const shortfall = goal.targetAmount * timeElapsed - goal.currentAmount;
                const monthsLeft = Math.max(
                    1,
                    (new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)
                );
                const monthlyNeeded = (goal.targetAmount - goal.currentAmount) / monthsLeft;

                decisions.push({
                    id: uuid(),
                    goalId: goal.id,
                    goalName: goal.name,
                    type: 'goal_forecast',
                    action: `Increase monthly deposits to $${monthlyNeeded.toFixed(0)} to stay on track`,
                    reasoning: `Your "${goal.name}" goal is about $${shortfall.toFixed(0)} behind schedule. To reach $${goal.targetAmount.toLocaleString()} by ${new Date(goal.deadline).toLocaleDateString()}, you'd need to save about $${monthlyNeeded.toFixed(0)} per month.`,
                    expectedGain: 0,
                    gasCost: 0,
                    status: 'pending_approval',
                    createdAt: new Date().toISOString(),
                });
            }
        }

        return decisions;
    }

    /** Generate all decisions for a user */
    async generateDecisions(
        goals: Goal[],
        vaults: VaultInfo[]
    ): Promise<AIDecision[]> {
        const [opportunities, risks, forecasts] = await Promise.all([
            this.scanOpportunities(goals, vaults),
            this.scanRisks(goals, vaults),
            this.trackGoals(goals),
        ]);

        return [...opportunities, ...risks, ...forecasts];
    }
}

export const wealthCoach = new WealthCoachEngine();
