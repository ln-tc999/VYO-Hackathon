// ============================================================
// Transactions API — deposit & redeem flows via YO SDK
// ============================================================

import { Router } from 'express';
import { getStore, getDemoUserId } from '../models/store.js';
import { yoService } from '../services/yo-sdk/client.js';
import type { Transaction, VaultAllocation } from '../../../shared/types/index.js';

// Simple ID generator (no uuid package needed)
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const transactionsRouter = Router();

// GET /api/transactions
transactionsRouter.get('/', (_req, res) => {
    const store = getStore();
    const userId = getDemoUserId();
    const txs = Array.from(store.transactions.values())
        .filter(t => t.userId === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, data: txs });
});

// POST /api/deposit — multi-vault deposit to a goal
transactionsRouter.post('/deposit', async (req, res) => {
    const store = getStore();
    const userId = getDemoUserId();
    const { goalId, amount } = req.body;

    if (!goalId || !amount || amount <= 0) {
        res.status(400).json({ success: false, error: 'Please provide a valid goal and amount.' });
        return;
    }

    const goal = store.goals.get(goalId);
    if (!goal) {
        res.status(404).json({ success: false, error: 'Goal not found.' });
        return;
    }

    const user = store.users.get(userId);
    const userAddress = user?.walletAddress || '0x0';

    // WEALTHCOACH: Split deposit across vaults per AI allocation
    const depositResults: Transaction[] = [];
    const errors: string[] = [];

    const depositPromises = goal.vaultAllocations.map(async (allocation: VaultAllocation) => {
        const depositAmount = (allocation.percentage / 100) * amount;

        try {
            const result = await yoService.deposit(
                allocation.vaultId,
                depositAmount,
                userAddress
            );

            const tx: Transaction = {
                id: generateId(),
                userId,
                goalId,
                type: 'deposit',
                vaultId: allocation.vaultId,
                vaultName: allocation.vaultName,
                amount: depositAmount,
                txHash: result.hash,
                status: 'confirmed',
                createdAt: new Date().toISOString(),
            };

            store.transactions.set(tx.id, tx);
            depositResults.push(tx);

            // Update allocation balance
            allocation.currentBalance += depositAmount;
        } catch (error) {
            errors.push(`Failed to deposit $${depositAmount.toFixed(2)} to ${allocation.vaultName}`);
        }
    });

    await Promise.allSettled(depositPromises);

    // Update goal current amount
    goal.currentAmount += amount - errors.length * (amount / goal.vaultAllocations.length);

    // WEALTHCOACH: Check milestone achievements
    const progress = goal.currentAmount / goal.targetAmount;
    const milestones = [0.25, 0.5, 0.75, 1.0];
    const previousProgress = (goal.currentAmount - amount) / goal.targetAmount;
    const newMilestone = milestones.find(m => previousProgress < m && progress >= m);

    store.goals.set(goal.id, goal);

    res.json({
        success: true,
        data: {
            transactions: depositResults,
            errors,
            goalProgress: {
                currentAmount: goal.currentAmount,
                targetAmount: goal.targetAmount,
                progressPercent: Math.min(100, Math.round(progress * 100)),
                milestone: newMilestone ? Math.round(newMilestone * 100) : null,
            },
        },
    });
});

// POST /api/redeem — withdraw from a specific vault in a goal
transactionsRouter.post('/redeem', async (req, res) => {
    const store = getStore();
    const userId = getDemoUserId();
    const { goalId, vaultId, amount } = req.body;

    if (!goalId || !vaultId || !amount || amount <= 0) {
        res.status(400).json({ success: false, error: 'Please provide goal, vault, and amount.' });
        return;
    }

    const goal = store.goals.get(goalId);
    if (!goal) {
        res.status(404).json({ success: false, error: 'Goal not found.' });
        return;
    }

    const allocation = goal.vaultAllocations.find(a => a.vaultId === vaultId);
    if (!allocation) {
        res.status(404).json({ success: false, error: 'Vault allocation not found in this goal.' });
        return;
    }

    if (amount > allocation.currentBalance) {
        res.status(400).json({
            success: false,
            error: `You only have $${allocation.currentBalance.toFixed(2)} in this vault.`,
        });
        return;
    }

    const user = store.users.get(userId);
    const userAddress = user?.walletAddress || '0x0';

    try {
        const result = await yoService.redeem(vaultId, amount, userAddress);

        const tx: Transaction = {
            id: generateId(),
            userId,
            goalId,
            type: 'redeem',
            vaultId,
            vaultName: allocation.vaultName,
            amount,
            txHash: result.hash,
            status: 'confirmed',
            createdAt: new Date().toISOString(),
        };

        store.transactions.set(tx.id, tx);

        allocation.currentBalance -= amount;
        goal.currentAmount -= amount;
        store.goals.set(goal.id, goal);

        res.json({ success: true, data: { transaction: tx } });
    } catch {
        res.status(500).json({
            success: false,
            error: 'Something went wrong with your withdrawal. Please try again shortly.',
        });
    }
});
