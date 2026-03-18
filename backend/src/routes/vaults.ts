// ============================================================
// Vaults API — proxy to YO SDK service
// ============================================================

import { Router } from 'express';
import { yoService } from '../services/yo-sdk/client.js';

export const vaultsRouter = Router();

// GET /api/vaults
vaultsRouter.get('/', async (_req, res) => {
    try {
        const vaults = await yoService.getVaults();
        res.json({ success: true, data: vaults });
    } catch {
        res.status(500).json({ success: false, error: 'Failed to load vaults. Please try again.' });
    }
});

// GET /api/vaults/:id
vaultsRouter.get('/:id', async (req, res) => {
    try {
        const vault = await yoService.getVaultDetails(req.params.id);
        if (!vault) {
            res.status(404).json({ success: false, error: 'Vault not found' });
            return;
        }
        res.json({ success: true, data: vault });
    } catch {
        res.status(500).json({ success: false, error: 'Failed to load vault details.' });
    }
});

// GET /api/vaults/positions/:userAddress
vaultsRouter.get('/positions/:userAddress', async (req, res) => {
    try {
        const userAddress = req.params.userAddress;
        if (!userAddress || userAddress === 'undefined') {
            res.status(400).json({ success: false, error: 'Invalid user address' });
            return;
        }

        const vaults = await yoService.getVaults();
        const positions = await yoService.getUserAllPositions(userAddress);

        // Enrich positions with vault details
        const enrichedPositions = positions.map(pos => {
            const vault = vaults.find(v => v.address === pos.vaultId || v.id === pos.vaultId);
            return {
                vaultId: pos.vaultId,
                vaultName: vault?.name || pos.vaultId,
                symbol: vault?.symbol || 'UNKNOWN',
                underlyingSymbol: vault?.underlyingSymbol || 'UNKNOWN',
                logoUrl: vault?.logoUrl || '/assets/yoUSD.png',
                chain: vault?.chain || 'Base',
                shares: pos.shares,
                assets: pos.assets,
                yieldEarned: pos.yieldEarned,
                apy: vault?.apy || 0,
            };
        });

        res.json({ success: true, data: enrichedPositions });
    } catch (error) {
        console.error('[VAULT_POSITIONS] Error:', error);
        res.status(500).json({ success: false, error: 'Failed to load positions.' });
    }
});
