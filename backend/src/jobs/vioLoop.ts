// ============================================================
// VIO_AGENT: Cron Job Runner
// Runs the autonomous agent loop every 15 minutes
// ============================================================

import cron from 'node-cron';
import { runVioAgentForAllUsers } from '../services/ai/vioAgent.js';

// Track if already running to prevent overlaps
let isRunning = false;

/**
 * VIO_AGENT: Initialize cron jobs
 * Call this once at app startup
 */
export function initCronJobs(): void {
  console.log('[VIO_AGENT] Initializing cron jobs...');

  // Run every 15 minutes
  // Pattern: minute hour day month day-of-week
  cron.schedule('*/15 * * * *', async () => {
    if (isRunning) {
      console.log('[VIO_AGENT] Previous run still in progress, skipping...');
      return;
    }

    isRunning = true;
    console.log(`[VIO_AGENT] Cron triggered at ${new Date().toISOString()}`);

    try {
      await runVioAgentForAllUsers();
    } catch (error) {
      console.error('[VIO_AGENT] Error in cron job:', error);
    } finally {
      isRunning = false;
    }
  }, {
    scheduled: true,
    timezone: 'UTC',
  });

  console.log('[VIO_AGENT] Cron job scheduled: every 15 minutes');
}

/**
 * VIO_AGENT: Manual trigger (for testing)
 */
export async function manualTrigger(): Promise<void> {
  console.log('[VIO_AGENT] Manual trigger initiated...');
  await runVioAgentForAllUsers();
}

/**
 * VIO_AGENT: Get job status
 */
export function getCronStatus(): { 
  isRunning: boolean; 
  lastRun?: Date;
  nextRun?: Date;
} {
  return {
    isRunning,
    lastRun: undefined, // Could track this if needed
    nextRun: undefined, // Could calculate next run time
  };
}
