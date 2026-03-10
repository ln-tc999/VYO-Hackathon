// ============================================================
// VIO_AGENT: Main Agent Service
// Orchestrates the autonomous Sense → Plan → Act loop
// ============================================================

import { decisionEngine, type UserState, type Decision, generateDecisionId } from './decisionEngine.js';
import { yoService } from '../yo-sdk/client.js';
import type { Goal, AIDecision, VaultInfo } from '../../../../shared/types/index.js';

// In-memory storage for demo (hackathon)
// In production, this would be on-chain or in decentralized storage
const decisionsStore = new Map<string, AIDecision[]>();
const goalsStore = new Map<string, Goal[]>();

export interface AgentState {
  walletAddress: string;
  lastRunAt?: Date;
  isRunning: boolean;
}

/**
 * VIO_AGENT: Gather user state from blockchain
 */
export async function gatherUserState(walletAddress: string): Promise<UserState> {
  // Fetch goals from memory (in production: from contract events or subgraph)
  const goals = goalsStore.get(walletAddress) || [];
  
  // Fetch vaults from YO Protocol
  const vaults = await yoService.getVaults();
  
  // Mock gas price (in production: fetch from network)
  const gasPrice = 20; // gwei

  return {
    walletAddress,
    goals,
    vaults,
    gasPrice,
  };
}

/**
 * VIO_AGENT: Run agent for a single user
 */
export async function runVioAgentForUser(walletAddress: string): Promise<AIDecision[]> {
  console.log(`[VIO_AGENT] Starting loop for ${walletAddress}...`);

  try {
    // Sense: Gather state
    const state = await gatherUserState(walletAddress);
    
    // Plan: Generate decisions
    const decisions = await decisionEngine(state);
    
    // Create AIDecision records
    const aiDecisions: AIDecision[] = decisions.map(dec => ({
      id: generateDecisionId(),
      goalId: dec.goalId || '',
      goalName: state.goals.find(g => g.id === dec.goalId)?.name || 'General',
      type: dec.type.toLowerCase() as AIDecision['type'],
      action: dec.action,
      reasoning: dec.reasoning,
      expectedGain: dec.expectedGain,
      gasCost: dec.gasCost,
      status: dec.requiresApproval ? 'pending_approval' : 'executed',
      createdAt: new Date().toISOString(),
    }));

    // Store decisions
    const existingDecisions = decisionsStore.get(walletAddress) || [];
    decisionsStore.set(walletAddress, [...aiDecisions, ...existingDecisions]);

    // Act: Auto-execute if not requiring approval
    for (const decision of aiDecisions) {
      if (decision.status === 'executed') {
        console.log(`[VIO_AGENT] Auto-executing: ${decision.action}`);
        // In production: execute on-chain
        // await executeDecision(decision, walletAddress);
      } else {
        console.log(`[VIO_AGENT] Queued for approval: ${decision.action}`);
      }
    }

    console.log(`[VIO_AGENT] Completed loop for ${walletAddress}. Generated ${aiDecisions.length} decisions.`);
    return aiDecisions;

  } catch (error) {
    console.error(`[VIO_AGENT] Error in loop for ${walletAddress}:`, error);
    return [];
  }
}

/**
 * VIO_AGENT: Run for all users (called by cron)
 */
export async function runVioAgentForAllUsers(): Promise<void> {
  const walletAddresses = Array.from(goalsStore.keys());
  
  console.log(`[VIO_AGENT] Starting batch run for ${walletAddresses.length} users...`);

  for (const walletAddress of walletAddresses) {
    await runVioAgentForUser(walletAddress);
    // Small delay between users to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('[VIO_AGENT] Batch run complete.');
}

/**
 * VIO_AGENT: Get pending decisions for user
 */
export function getPendingDecisions(walletAddress: string): AIDecision[] {
  const decisions = decisionsStore.get(walletAddress) || [];
  return decisions.filter(d => d.status === 'pending_approval');
}

/**
 * VIO_AGENT: Get all decisions for user
 */
export function getUserDecisions(walletAddress: string): AIDecision[] {
  return decisionsStore.get(walletAddress) || [];
}

/**
 * VIO_AGENT: Approve a decision
 */
export function approveDecision(decisionId: string, walletAddress: string): AIDecision | null {
  const decisions = decisionsStore.get(walletAddress) || [];
  const decision = decisions.find(d => d.id === decisionId);
  
  if (!decision || decision.status !== 'pending_approval') {
    return null;
  }

  decision.status = 'approved';
  
  // Simulate execution
  setTimeout(() => {
    decision.status = 'executed';
    console.log(`[VIO_AGENT] Executed: ${decision.action}`);
  }, 2000);

  return decision;
}

/**
 * VIO_AGENT: Reject a decision
 */
export function rejectDecision(decisionId: string, walletAddress: string): AIDecision | null {
  const decisions = decisionsStore.get(walletAddress) || [];
  const decision = decisions.find(d => d.id === decisionId);
  
  if (!decision || decision.status !== 'pending_approval') {
    return null;
  }

  decision.status = 'rejected';
  return decision;
}

/**
 * VIO_AGENT: Store user goals (for demo)
 */
export function storeUserGoals(walletAddress: string, goals: Goal[]): void {
  goalsStore.set(walletAddress, goals);
}

/**
 * VIO_AGENT: Get user goals
 */
export function getUserGoals(walletAddress: string): Goal[] {
  return goalsStore.get(walletAddress) || [];
}

/**
 * VIO_AGENT: Get a single goal
 */
export function getUserGoal(walletAddress: string, goalId: string): Goal | undefined {
  const goals = goalsStore.get(walletAddress) || [];
  return goals.find(g => g.id === goalId);
}

/**
 * VIO_AGENT: Delete a goal
 */
export function deleteUserGoal(walletAddress: string, goalId: string): boolean {
  const goals = goalsStore.get(walletAddress) || [];
  const index = goals.findIndex(g => g.id === goalId);
  
  if (index === -1) return false;
  
  goals.splice(index, 1);
  goalsStore.set(walletAddress, goals);
  return true;
}
