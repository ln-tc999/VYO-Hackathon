// ============================================================
// AI API — decision transparency log & approval flow
// ============================================================

import { Router } from 'express';
import { getStore, getDemoUserId } from '../models/store.js';
import { wealthCoach } from '../services/ai/wealth-coach.js';
import { yoService } from '../services/yo-sdk/client.js';

export const aiRouter = Router();

// GET /api/ai/decisions — transparency log
aiRouter.get('/decisions', (_req, res) => {
    const store = getStore();
    const userId = getDemoUserId();
    const goals = Array.from(store.goals.values()).filter(g => g.userId === userId);
    const goalIds = new Set(goals.map(g => g.id));

    const decisions = Array.from(store.decisions.values())
        .filter(d => goalIds.has(d.goalId))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ success: true, data: decisions });
});

// POST /api/ai/rebalance — trigger WealthCoach scan
aiRouter.post('/rebalance', async (_req, res) => {
    try {
        const store = getStore();
        const userId = getDemoUserId();
        const goals = Array.from(store.goals.values()).filter(g => g.userId === userId);
        const vaults = await yoService.getVaults();

        const newDecisions = await wealthCoach.generateDecisions(goals, vaults);

        // Store new decisions
        for (const decision of newDecisions) {
            store.decisions.set(decision.id, decision);
        }

        res.json({ success: true, data: newDecisions });
    } catch {
        res.status(500).json({
            success: false,
            error: 'WealthCoach encountered an issue. No actions were taken.',
        });
    }
});

// POST /api/ai/decisions/:id/approve
aiRouter.post('/decisions/:id/approve', (req, res) => {
    const store = getStore();
    const decision = store.decisions.get(req.params.id);

    if (!decision) {
        res.status(404).json({ success: false, error: 'Decision not found' });
        return;
    }

    if (decision.status !== 'pending_approval') {
        res.status(400).json({ success: false, error: 'This decision has already been processed.' });
        return;
    }

    decision.status = 'approved';
    store.decisions.set(decision.id, decision);

    // WEALTHCOACH: In production, this would trigger the actual rebalance transaction
    // For hackathon, we mark it as executed after approval
    setTimeout(() => {
        decision.status = 'executed';
        store.decisions.set(decision.id, decision);
    }, 2000);

    res.json({ success: true, data: decision });
});

// POST /api/ai/decisions/:id/reject
aiRouter.post('/decisions/:id/reject', (req, res) => {
    const store = getStore();
    const decision = store.decisions.get(req.params.id);

    if (!decision) {
        res.status(404).json({ success: false, error: 'Decision not found' });
        return;
    }

    decision.status = 'rejected';
    store.decisions.set(decision.id, decision);

    res.json({ success: true, data: decision });
});
