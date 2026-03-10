// ============================================================
// Vyo Apps Backend — Express Server Entry Point
// Stateless blockchain-native backend
// ============================================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { goalsRouter } from './routes/goals.js';
import { vaultsRouter } from './routes/vaults.js';
import { transactionsRouter } from './routes/transactions.js';
import { dashboardRouter } from './routes/dashboard.js';
import { aiRouter } from './routes/ai.js';
import { yieldRouter } from './routes/yield.js';
import { initCronJobs } from './jobs/vioLoop.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/goals', goalsRouter);
app.use('/api/vaults', vaultsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/ai', aiRouter);
app.use('/api/yield', yieldRouter);

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'vyo-backend', 
        timestamp: new Date().toISOString(),
        stateless: true,
        blockchain: true,
    });
});

// Initialize cron jobs
initCronJobs();

app.listen(PORT, () => {
    console.log(`\n🏦 Vyo Apps Backend running on http://localhost:${PORT}`);
    console.log(`   Mode: Stateless (no database) - All data on blockchain`);
    console.log(`   Dashboard: GET  /api/dashboard`);
    console.log(`   Goals:     GET  /api/goals`);
    console.log(`   Vaults:    GET  /api/vaults`);
    console.log(`   AI:        GET  /api/ai/decisions`);
    console.log(`   Health:    GET  /api/health\n`);
});
