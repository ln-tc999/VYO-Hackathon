// ============================================================
// AI API — Vio Agent decision transparency log & approval flow
// ============================================================

import { Router } from 'express';
import { walletAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { 
  getUserDecisions, 
  getPendingDecisions, 
  approveDecision, 
  rejectDecision,
  runVioAgentForUser,
} from '../services/ai/vioAgent.js';

export const aiRouter = Router();

// All AI routes require wallet auth
aiRouter.use(walletAuth);

// GET /api/ai/decisions — transparency log
aiRouter.get('/decisions', (req: AuthenticatedRequest, res) => {
  const walletAddress = req.user!.walletAddress;
  const decisions = getUserDecisions(walletAddress);
  
  res.json({ 
    success: true, 
    data: decisions.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ) 
  });
});

// GET /api/ai/decisions/pending — awaiting approval
aiRouter.get('/decisions/pending', (req: AuthenticatedRequest, res) => {
  const walletAddress = req.user!.walletAddress;
  const decisions = getPendingDecisions(walletAddress);
  
  res.json({ success: true, data: decisions });
});

// POST /api/ai/rebalance — trigger Vio Agent scan
aiRouter.post('/rebalance', async (req: AuthenticatedRequest, res) => {
  try {
    const walletAddress = req.user!.walletAddress;
    const newDecisions = await runVioAgentForUser(walletAddress);

    res.json({ success: true, data: newDecisions });
  } catch {
    res.status(500).json({
      success: false,
      error: 'Vio Agent encountered an issue. No actions were taken.',
    });
  }
});

// POST /api/ai/decisions/:id/approve
aiRouter.post('/decisions/:id/approve', (req: AuthenticatedRequest, res) => {
  const walletAddress = req.user!.walletAddress;
  const decision = approveDecision(req.params.id as string, walletAddress);

  if (!decision) {
    res.status(404).json({ success: false, error: 'Decision not found or already processed' });
    return;
  }

  res.json({ success: true, data: decision });
});

// POST /api/ai/decisions/:id/reject
aiRouter.post('/decisions/:id/reject', (req: AuthenticatedRequest, res) => {
  const walletAddress = req.user!.walletAddress;
  const decision = rejectDecision(req.params.id as string, walletAddress);

  if (!decision) {
    res.status(404).json({ success: false, error: 'Decision not found or already processed' });
    return;
  }

  res.json({ success: true, data: decision });
});

// POST /api/ai/chat — Chat with Vio Agent
aiRouter.post('/chat', async (req: AuthenticatedRequest, res) => {
  try {
    const { message, history = [] } = req.body;
    const walletAddress = req.user!.walletAddress;
    
    // Import dynamically to avoid circular deps
    const { chatWithVioAgentWithFallback } = await import('../services/ai/openRouterClient.js');
    const { getUserGoals } = await import('../services/ai/vioAgent.js');
    const { yoService } = await import('../services/yo-sdk/client.js');
    
    const goals = getUserGoals(walletAddress);
    const vaults = await yoService.getVaults();
    
    // Calculate net worth
    let netWorth = 0;
    for (const goal of goals) {
      netWorth += goal.currentAmount;
    }
    
    const userContext = {
      walletAddress,
      goals,
      currentNetWorth: netWorth,
      riskProfile: goals[0]?.riskProfile || 'moderate',
    };

    const response = await chatWithVioAgentWithFallback(message, history, userContext);

    res.json({ 
      success: true, 
      data: { 
        message: response,
        timestamp: new Date().toISOString(),
      } 
    });
  } catch (error) {
    console.error('[AI Chat Error]', error);
    res.status(500).json({
      success: false,
      error: 'Vio Agent is temporarily unavailable. Please try again.',
    });
  }
});
