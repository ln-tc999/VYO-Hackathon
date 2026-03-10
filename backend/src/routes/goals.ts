// ============================================================
// Goals API — CRUD + natural language goal creation
// ============================================================

import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { getStore, getDemoUserId } from '../models/store.js';
import { getStrategyForProfile, getRecommendedProfile } from '../services/ai/risk-profiles.js';
import type { Goal, VaultAllocation } from '../../../shared/types/index.js';
import { MOCK_VAULTS } from '../services/yo-sdk/mock-data.js';

export const goalsRouter = Router();

// GET /api/goals
goalsRouter.get('/', (_req, res) => {
    const store = getStore();
    const userId = getDemoUserId();
    const goals = Array.from(store.goals.values()).filter(g => g.userId === userId);
    res.json({ success: true, data: goals });
});

// GET /api/goals/:id
goalsRouter.get('/:id', (req, res) => {
    const store = getStore();
    const goal = store.goals.get(req.params.id);
    if (!goal) {
        res.status(404).json({ success: false, error: 'Goal not found' });
        return;
    }
    res.json({ success: true, data: goal });
});

// POST /api/goals — create from natural language or structured input
goalsRouter.post('/', (req, res) => {
    const store = getStore();
    const userId = getDemoUserId();

    const { input, name, targetAmount, deadline, priority, liquidityNeeds, riskProfile } = req.body;

    let goalName: string;
    let goalTarget: number;
    let goalDeadline: string;
    let goalPriority: 'low' | 'medium' | 'high';
    let goalLiquidity: 'instant' | '24h' | '1week' | 'flexible';
    let goalRisk: 'conservative' | 'moderate' | 'aggressive';

    if (input) {
        // WEALTHCOACH: Parse natural language input
        const parsed = parseNaturalLanguageGoal(input);
        goalName = parsed.name;
        goalTarget = parsed.targetAmount;
        goalDeadline = parsed.deadline;
        goalPriority = parsed.priority;
        goalLiquidity = parsed.liquidityNeeds;
        goalRisk = getRecommendedProfile(parsed.targetAmount, parsed.deadline, parsed.liquidityNeeds);
    } else {
        goalName = name || 'My Savings Goal';
        goalTarget = targetAmount || 5000;
        goalDeadline = deadline || new Date(Date.now() + 365 * 86400000).toISOString();
        goalPriority = priority || 'medium';
        goalLiquidity = liquidityNeeds || 'flexible';
        goalRisk = riskProfile || 'moderate';
    }

    // WEALTHCOACH: Generate vault allocations based on risk profile
    const strategy = getStrategyForProfile(goalRisk);
    const allocations: VaultAllocation[] = strategy.map(s => {
        const vault = MOCK_VAULTS.find(v => v.id === s.vaultId);
        return {
            vaultId: s.vaultId,
            vaultName: vault?.name || s.vaultId,
            percentage: s.percentage,
            currentBalance: 0,
            rationale: s.rationale,
        };
    });

    const goal: Goal = {
        id: uuid(),
        userId,
        name: goalName,
        targetAmount: goalTarget,
        currentAmount: 0,
        deadline: goalDeadline,
        priority: goalPriority,
        liquidityNeeds: goalLiquidity,
        riskProfile: goalRisk,
        status: 'active',
        vaultAllocations: allocations,
        createdAt: new Date().toISOString(),
    };

    store.goals.set(goal.id, goal);
    res.status(201).json({ success: true, data: goal });
});

// PUT /api/goals/:id
goalsRouter.put('/:id', (req, res) => {
    const store = getStore();
    const goal = store.goals.get(req.params.id);
    if (!goal) {
        res.status(404).json({ success: false, error: 'Goal not found' });
        return;
    }
    const updated = { ...goal, ...req.body, id: goal.id, userId: goal.userId };
    store.goals.set(goal.id, updated);
    res.json({ success: true, data: updated });
});

// DELETE /api/goals/:id
goalsRouter.delete('/:id', (req, res) => {
    const store = getStore();
    if (!store.goals.has(req.params.id)) {
        res.status(404).json({ success: false, error: 'Goal not found' });
        return;
    }
    store.goals.delete(req.params.id);
    res.json({ success: true, data: { deleted: req.params.id } });
});

// ---- Natural Language Parser ----
function parseNaturalLanguageGoal(input: string): {
    name: string;
    targetAmount: number;
    deadline: string;
    priority: 'low' | 'medium' | 'high';
    liquidityNeeds: 'instant' | '24h' | '1week' | 'flexible';
} {
    // WEALTHCOACH: Simple regex-based NLP — extract dollar amounts, dates, and goal names
    const amountMatch = input.match(/\$?([\d,]+(?:\.\d{2})?)/);
    const targetAmount = amountMatch
        ? parseFloat(amountMatch[1].replace(/,/g, ''))
        : 5000;

    // Try to extract date references
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    let deadline: string = new Date(Date.now() + 365 * 86400000).toISOString();

    // Check for "by December", "by June 2026", etc.
    const byDateMatch = input.match(/by\s+(\w+)\s*(\d{4})?/i);
    if (byDateMatch) {
        const monthIdx = monthNames.indexOf(byDateMatch[1].toLowerCase());
        if (monthIdx !== -1) {
            const year = byDateMatch[2] ? parseInt(byDateMatch[2]) : new Date().getFullYear();
            deadline = new Date(year, monthIdx + 1, 0).toISOString();
        }
    }

    // Check for "in X months/years"
    const inTimeMatch = input.match(/in\s+(\d+)\s+(month|year)s?/i);
    if (inTimeMatch) {
        const num = parseInt(inTimeMatch[1]);
        const unit = inTimeMatch[2].toLowerCase();
        const ms = unit === 'year' ? num * 365 * 86400000 : num * 30 * 86400000;
        deadline = new Date(Date.now() + ms).toISOString();
    }

    // Extract goal name — remove amount and date parts
    let name = input
        .replace(/\$?[\d,]+(?:\.\d{2})?/g, '')
        .replace(/by\s+\w+\s*\d*/gi, '')
        .replace(/in\s+\d+\s+\w+/gi, '')
        .replace(/\b(save|saving|for|want|need|to|i|my|a|an|the)\b/gi, '')
        .trim()
        .replace(/\s+/g, ' ');

    if (!name || name.length < 2) name = 'My Savings Goal';
    // Capitalize first letter of each word
    name = name.replace(/\b\w/g, c => c.toUpperCase());

    // Determine priority from keywords
    let priority: 'low' | 'medium' | 'high' = 'medium';
    if (/urgent|asap|emergency|important/i.test(input)) priority = 'high';
    if (/someday|eventually|whenever/i.test(input)) priority = 'low';

    // Determine liquidity needs
    let liquidityNeeds: 'instant' | '24h' | '1week' | 'flexible' = 'flexible';
    if (/emergency|instant|quick/i.test(input)) liquidityNeeds = 'instant';

    return { name, targetAmount, deadline, priority, liquidityNeeds };
}
