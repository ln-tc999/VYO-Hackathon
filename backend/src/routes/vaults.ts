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
