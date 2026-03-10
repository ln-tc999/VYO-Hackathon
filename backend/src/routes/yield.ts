// ============================================================
// API Routes: Yield & Vault Positions
// Endpoints for yoVault tokens, yield data, and user positions
// ============================================================

import { Router } from 'express';
import { walletAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { yieldTracker } from '../services/yield-tracker.js';
import { yoService } from '../services/yo-sdk/client.js';

export const yieldRouter = Router();

/**
 * GET /api/yield/total
 * Get total yield summary across all vaults for authenticated user
 */
yieldRouter.get('/total', walletAuth, async (req: AuthenticatedRequest, res) => {
    try {
        const userAddress = req.user!.walletAddress;
        const data = await yieldTracker.getUserTotalYield(userAddress);
        
        res.json({
            success: true,
            data,
        });
    } catch (error) {
        console.error('[API] Error getting total yield:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get yield data',
        });
    }
});

/**
 * GET /api/yield/positions
 * Get user's yoVault token positions (all vaults with shares > 0)
 */
yieldRouter.get('/positions', walletAuth, async (req: AuthenticatedRequest, res) => {
    try {
        const userAddress = req.user!.walletAddress;
        const positions = await yieldTracker.getUserVaultPositions(userAddress);
        
        res.json({
            success: true,
            data: positions,
        });
    } catch (error) {
        console.error('[API] Error getting vault positions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get vault positions',
        });
    }
});

/**
 * GET /api/yield/vault/:vaultAddress
 * Get yield data for a specific vault
 */
yieldRouter.get('/vault/:vaultAddress', walletAuth, async (req: AuthenticatedRequest, res) => {
    try {
        const userAddress = req.user!.walletAddress;
        const vaultAddress = req.params.vaultAddress as string;
        
        const data = await yieldTracker.getUserVaultYield(userAddress, vaultAddress);
        
        if (!data) {
            return res.json({
                success: true,
                data: null,
                message: 'No position found in this vault',
            });
        }
        
        res.json({
            success: true,
            data,
        });
    } catch (error) {
        console.error('[API] Error getting vault yield:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get vault yield',
        });
    }
});

/**
 * GET /api/yield/history/:vaultAddress
 * Get yield/APY history for a vault
 */
yieldRouter.get('/history/:vaultAddress', walletAuth, async (req: AuthenticatedRequest, res) => {
    try {
        const vaultAddress = req.params.vaultAddress as string;
        const days = parseInt(req.query.days as string) || 30;
        
        const data = await yieldTracker.getYieldHistory(vaultAddress, days);
        
        res.json({
            success: true,
            data,
        });
    } catch (error) {
        console.error('[API] Error getting yield history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get yield history',
        });
    }
});

/**
 * GET /api/yield/optimize
 * Get yield optimization suggestions from Vio Agent
 */
yieldRouter.get('/optimize', walletAuth, async (req: AuthenticatedRequest, res) => {
    try {
        const userAddress = req.user!.walletAddress;
        const riskProfile = (req.query.risk as 'conservative' | 'moderate' | 'aggressive') || 'moderate';
        
        const suggestions = await yieldTracker.getYieldOptimizationSuggestions(
            userAddress,
            riskProfile
        );
        
        res.json({
            success: true,
            data: suggestions,
        });
    } catch (error) {
        console.error('[API] Error getting optimization suggestions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get optimization suggestions',
        });
    }
});

/**
 * GET /api/yield/vaults/available
 * Get all available YO vaults with real-time data
 */
yieldRouter.get('/vaults/available', async (req, res) => {
    try {
        const vaults = await yoService.getVaults();
        
        res.json({
            success: true,
            data: vaults,
        });
    } catch (error) {
        console.error('[API] Error getting vaults:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get vaults',
        });
    }
});

/**
 * GET /api/yield/vaults/:address/snapshot
 * Get real-time snapshot of a vault (APY, TVL)
 */
yieldRouter.get('/vaults/:address/snapshot', async (req, res) => {
    try {
        const { address } = req.params;
        const data = await yoService.getVaultSnapshot(address);
        
        res.json({
            success: true,
            data,
        });
    } catch (error) {
        console.error('[API] Error getting vault snapshot:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get vault snapshot',
        });
    }
});

// ============================================================
// Legacy endpoints (for backward compatibility)
// ============================================================

/**
 * GET /api/yield/user
 * Legacy endpoint - Get user yield summary
 */
yieldRouter.get('/user', walletAuth, async (req: AuthenticatedRequest, res) => {
    try {
        const userAddress = req.user!.walletAddress;
        const data = await yieldTracker.getUserTotalYield(userAddress);
        
        res.json({
            success: true,
            data,
        });
    } catch (error) {
        console.error('[API] Error getting user yield:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user yield',
        });
    }
});
