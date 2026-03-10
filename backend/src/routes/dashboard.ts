// ============================================================
// Dashboard API — aggregated net worth & yield data
// ============================================================

import { Router } from 'express';
import { getStore, getDemoUserId } from '../models/store.js';
import type { DashboardSummary, GoalSummary, VaultAllocation } from '../../../shared/types/index.js';

export const dashboardRouter = Router();

// GET /api/dashboard
dashboardRouter.get('/', (_req, res) => {
    const store = getStore();
    const userId = getDemoUserId();
    const user = store.users.get(userId);

    if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
    }

    const goals = Array.from(store.goals.values()).filter(g => g.userId === userId);
    const decisions = Array.from(store.decisions.values())
        .filter(d => goals.some(g => g.id === d.goalId))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Calculate DeFi balance from all vault allocations
    const defiBalance = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
    const totalNetWorth = defiBalance + user.bankBalance;

    // WEALTHCOACH: Simulate yield calculations based on vault APYs
    const avgApy = 6.2; // weighted average across allocations
    const totalYieldEarned = defiBalance * 0.038; // ~3.8% earned so far
    const yieldMonth = defiBalance * (avgApy / 100 / 12);
    const yieldWeek = yieldMonth / 4.33;
    const yieldToday = yieldMonth / 30;

    const goalSummaries: GoalSummary[] = goals.map(g => ({
        id: g.id,
        name: g.name,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount,
        progressPercent: Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)),
        deadline: g.deadline,
        status: g.status,
    }));

    const summary: DashboardSummary = {
        totalNetWorth,
        defiBalance,
        tradFiBalance: user.bankBalance,
        totalYieldEarned,
        yieldToday,
        yieldWeek,
        yieldMonth,
        goalCount: goals.length,
        goalsOnTrack: goals.filter(g => g.status === 'active').length,
        activeVaults: new Set(goals.flatMap(g => g.vaultAllocations.map((a: VaultAllocation) => a.vaultId))).size,
        recentDecisions: decisions.slice(0, 5),
        goalSummaries,
    };

    res.json({ success: true, data: summary });
});
