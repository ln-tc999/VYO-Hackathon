# Vyo Apps — Backend Agent Instructions

> **Role:** Backend + AI Lead  
> **Stack:** Node.js, Express, YO SDK, OpenRouter API (Free AI Models)  
> **AI Persona:** Vio Agent  
> **Architecture:** Stateless (No Database) - All data on Blockchain  
> **⚠️ HACKATHON REQUIREMENT:** Real YO SDK transactions (NOT mockups!)

---

## 🚨 HACKATHON REQUIREMENTS (CRITICAL!)

### Must Have for Demo:
- [ ] **REAL YO SDK Integration** - `@yo-protocol/core` 
- [ ] **LIVE Transactions** - Real deposit/redeem on Base/Ethereum
- [ ] **Working On-Chain Flows** - Not just UI mockups
- [ ] **Wallet Integration** - WalletConnect with real transactions

### Judging Criteria (20% Quality of Integration):
```
❌ Mockups alone will NOT qualify
❌ Fake transaction hashes  
✅ Real deposit() calls to YO vaults
✅ Real redeem() calls with actual on-chain execution
✅ Transaction confirmation on BaseScan/Etherscan
```

### Demo Setup:
```bash
# 1. Set environment
USE_LIVE_SDK=true
YO_CHAIN_ID=8453  # Base mainnet (low gas)

# 2. Prepare test wallet
# - Fund with small amount ($5-10) on Base
# - Connect wallet in UI
# - Execute real $1 deposit to yoUSD vault

# 3. Show transaction on BaseScan
# - Copy tx hash from response
# - Show on https://basescan.org
```

---

## 🎯 Your Mission

Build the **stateless API layer** for Vyo Apps — a lightweight proxy between the frontend and blockchain. The backend handles AI logic (Vio Agent) and API routing, but **all user data lives on the blockchain**.

**Core principle:** Every action Vio Agent takes must be logged with human-readable reasoning. No black box decisions.

---

## 📁 Your Folder Ownership

```
backend/
├── src/
│   ├── index.ts                    # Express app entry
│   ├── routes/
│   │   ├── goals.ts                # CRUD + deposit/redeem
│   │   ├── vaults.ts               # Vault listing + details
│   │   ├── dashboard.ts            # Net worth, yield summary
│   │   ├── ai.ts                   # Decisions, chat, approvals
│   │   └── transactions.ts         # Deposit & withdrawal flows
│   ├── services/
│   │   ├── yo-sdk/
│   │   │   ├── client.ts           # YO SDK wrapper
│   │   │   └── mock-data.ts        # Mock vaults for dev
│   │   └── ai/
│   │       ├── vioAgent.ts         # Main autonomous loop
│   │       ├── decisionEngine.ts   # Rule-based decision tree
│   │       ├── openRouterClient.ts # OpenRouter API integration
│   │       └── riskScorer.ts       # Risk profile calculator
│   ├── jobs/
│   │   └── vioLoop.ts              # Cron job runner (every 15 min)
│   └── middleware/
│       └── auth.ts                 # Wallet-only auth (X-Wallet-Address header)
├── package.json
├── tsconfig.json
└── .env.example
```

---

## 🏗️ Architecture Overview

### Stateless Design Philosophy

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│   Backend    │────▶│  Blockchain  │
│  (IndexedDB) │◀────│  (Stateless) │◀────│  (YO Vaults) │
└──────────────┘     └──────────────┘     └──────────────┘
      │                     │                     │
      │                     ▼                     │
      │              ┌──────────────┐             │
      └─────────────▶│ OpenRouter   │◀────────────┘
                     │   (Free AI)  │
                     └──────────────┘
```

**Key Points:**
- **No Database**: User data (goals, transactions) stored on blockchain or IndexedDB
- **No Sessions**: Wallet address is the only identifier (X-Wallet-Address header)
- **No JWT**: Pure blockchain auth via wallet signature
- **In-Memory**: Demo/hackathon data stored in Maps (refreshed on restart)
- **AI**: OpenRouter free models (NVIDIA Llama 70B)

---

## 🔐 Auth: Wallet-Only (No JWT/Session/Database)

**Philosophy:** Pure blockchain auth. Backend is completely stateless.

### How It Works
1. User connects wallet via WalletConnect (wagmi) on frontend
2. Wallet address stored in **IndexedDB** (browser) - not backend
3. Every API call includes header: `X-Wallet-Address: 0x...`
4. Backend validates address format and treats it as user ID
5. No sessions, no JWT, no database lookup

### Backend Middleware

```typescript
// middleware/auth.ts
import { isAddress } from 'viem';

export function walletAuth(req, res, next) {
  const walletAddress = req.headers['x-wallet-address'];
  
  if (!walletAddress || !isAddress(walletAddress)) {
    return res.status(401).json({ 
      success: false, 
      error: 'Wallet address required' 
    });
  }
  
  // Set user context - use lowercase address as ID
  req.user = { 
    id: walletAddress.toLowerCase(),
    walletAddress: walletAddress.toLowerCase() 
  };
  
  next();
}
```

### Frontend Usage

```typescript
// Frontend API call
const response = await fetch('/api/goals', {
  headers: {
    'X-Wallet-Address': walletAddress,  // From IndexedDB
  },
});
```

**Benefits:**
- ✅ No JWT expiration issues
- ✅ No session management
- ✅ Stateless backend (easy to scale)
- ✅ Truly decentralized
- ✅ No database costs

---

## 🗄️ Data Storage Strategy

### Where Data Lives

| Data Type | Storage Location | Notes |
|-----------|-----------------|-------|
| **Wallet/Identity** | Blockchain | User's wallet is their identity |
| **Goals** | IndexedDB (frontend) + In-Memory (backend) | Synced from blockchain events |
| **Vault Positions** | YO Protocol Contracts | Read from blockchain |
| **Transactions** | Blockchain (tx hashes) | Immutable on-chain |
| **AI Decisions** | In-Memory (backend) | Temporary, logged to console |
| **User Preferences** | IndexedDB (frontend) | Risk profile, settings |

### In-Memory Storage (Hackathon/Demo)

```typescript
// services/ai/vioAgent.ts
// Temporary in-memory storage (resets on server restart)

const decisionsStore = new Map<string, AIDecision[]>(); // wallet -> decisions
const goalsStore = new Map<string, Goal[]>();           // wallet -> goals

export function storeUserGoals(walletAddress: string, goals: Goal[]): void {
  goalsStore.set(walletAddress, goals);
}

export function getUserGoals(walletAddress: string): Goal[] {
  return goalsStore.get(walletAddress) || [];
}
```

**Note:** For production, use:
- The Graph (subgraph) for indexed blockchain data
- IPFS/Arweave for off-chain metadata
- Or keep minimal Redis cache (optional)

---

## 🛣️ REST API Endpoints

### Goals (In-Memory + Blockchain)
```
GET    /api/goals                    → List user goals (from memory)
POST   /api/goals                    → Create goal (+ AI allocates vaults)
GET    /api/goals/:id                → Goal detail
PATCH  /api/goals/:id                → Update goal
DELETE /api/goals/:id                → Delete goal
POST   /api/goals/:id/deposit        → Multi-vault deposit
POST   /api/goals/:id/redeem         → Withdraw from vaults
```

### Vaults (YO Protocol)
```
GET    /api/vaults                   → All YO vaults (cached 5min)
GET    /api/vaults/:id               → Vault detail: APY, TVL, risk
```

### Dashboard (Aggregated)
```
GET    /api/dashboard                → Net worth, yield, goals summary
```

### AI / Vio Agent
```
GET    /api/ai/decisions             → All decisions (paginated)
GET    /api/ai/decisions/pending     → Awaiting approval
POST   /api/ai/decisions/:id/approve → Approve decision
POST   /api/ai/decisions/:id/reject  → Reject decision
POST   /api/ai/rebalance             → Trigger Vio Agent scan
POST   /api/ai/chat                  → Chat with Vio Agent
```

### Transactions (YO Protocol)
```
GET    /api/transactions             → User's tx history
POST   /api/transactions/deposit     → Execute deposit
POST   /api/transactions/redeem      → Execute withdrawal
```

---

## 🤖 Vio Agent Architecture

### Main Loop (runs every 15 minutes via cron)

```typescript
// jobs/vioLoop.ts
import cron from 'node-cron';
import { runVioAgentForAllUsers } from '../services/ai/vioAgent';

// Every 15 minutes
let isRunning = false;
cron.schedule('*/15 * * * *', async () => {
  if (isRunning) return;
  isRunning = true;
  
  console.log('[VIO_AGENT] Starting agent loop...');
  await runVioAgentForAllUsers();
  
  isRunning = false;
});
```

### Vio Agent Service

```typescript
// services/ai/vioAgent.ts

const decisionsStore = new Map<string, AIDecision[]>();
const goalsStore = new Map<string, Goal[]>();

export async function runVioAgentForUser(walletAddress: string): Promise<AIDecision[]> {
  // 1. GATHER STATE (from memory + blockchain)
  const state = await gatherUserState(walletAddress);
  
  // 2. PLAN (rule-based decision engine)
  const decisions = await decisionEngine(state);
  
  // 3. CREATE DECISION RECORDS
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

  // 4. STORE IN MEMORY
  const existing = decisionsStore.get(walletAddress) || [];
  decisionsStore.set(walletAddress, [...aiDecisions, ...existing]);

  // 5. ACT (auto-execute if no approval needed)
  for (const decision of aiDecisions) {
    if (decision.status === 'executed') {
      console.log(`[VIO_AGENT] Auto-executing: ${decision.action}`);
      // await executeOnChain(decision);
    }
  }

  return aiDecisions;
}

async function gatherUserState(walletAddress: string): Promise<UserState> {
  return {
    walletAddress,
    goals: goalsStore.get(walletAddress) || [],
    vaults: await yoService.getVaults(),
    gasPrice: 20, // gwei - could fetch from network
  };
}
```

### Decision Engine (Rule-Based)

```typescript
// services/ai/decisionEngine.ts

export async function decisionEngine(state: UserState): Promise<Decision[]> {
  const decisions: Decision[] = [];

  for (const goal of state.goals) {
    // 1. OPPORTUNITY SCAN
    const currentVault = goal.vaultAllocations[0];
    const currentApy = getVaultApy(currentVault.vaultId, state.vaults);
    
    // Find better vault with same risk
    const betterVault = state.vaults.find(v => 
      v.riskScore <= getCurrentRisk(goal) + 1 &&
      v.apy > currentApy + 2  // At least 2% better
    );

    if (betterVault) {
      const gasCost = estimateGas(state.gasPrice, 'rebalance');
      const annualGain = (goal.currentAmount * (betterVault.apy - currentApy)) / 100;
      
      // Only suggest if gas < 50% of annual gain
      if (gasCost < annualGain * 0.5) {
        decisions.push({
          type: 'REBALANCE',
          goalId: goal.id,
          action: `Move $${goal.currentAmount.toFixed(2)} to ${betterVault.name}`,
          reasoning: `${betterVault.name} offers ${(betterVault.apy - currentApy).toFixed(2)}% higher APY with similar risk`,
          expectedGain: annualGain,
          gasCost,
          requiresApproval: goal.currentAmount > 500,
        });
      }
    }

    // 2. GOAL TRACKING
    const progress = goal.currentAmount / goal.targetAmount;
    const expectedProgress = calculateExpectedProgress(goal);
    
    if (progress < expectedProgress - 0.1) {  // 10% behind
      decisions.push({
        type: 'DEPOSIT_SUGGESTION',
        goalId: goal.id,
        action: `Increase monthly deposit`,
        reasoning: `Goal "${goal.name}" is ${Math.round((expectedProgress - progress) * 100)}% behind schedule`,
        expectedGain: 0,
        gasCost: 0,
        requiresApproval: true,
      });
    }
  }

  return decisions;
}
```

---

## 🧠 OpenRouter AI Integration (Free Models)

### Available Free Models

| Model | Provider | Cost | Quality |
|-------|----------|------|---------|
| `nvidia/llama-3.1-nemotron-70b-instruct:free` | NVIDIA | **FREE** | ⭐⭐⭐⭐⭐ |
| `nvidia/mistral-nemo-instruct-2407:free` | NVIDIA | **FREE** | ⭐⭐⭐⭐ |
| `meta-llama/llama-3.1-70b-instruct:free` | Meta | **FREE** | ⭐⭐⭐⭐⭐ |
| `mistralai/mistral-7b-instruct:free` | Mistral | **FREE** | ⭐⭐⭐ |
| `google/gemini-flash-1.5:free` | Google | **FREE** | ⭐⭐⭐⭐ |

### Implementation

```typescript
// services/ai/openRouterClient.ts

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export const AI_MODELS = {
  nvidiaLlama: 'nvidia/llama-3.1-nemotron-70b-instruct:free',
  nvidiaMistral: 'nvidia/mistral-nemo-instruct-2407:free',
  metaLlama: 'meta-llama/llama-3.1-70b-instruct:free',
  mistral: 'mistralai/mistral-7b-instruct:free',
};

export async function chatWithVioAgent(
  message: string,
  history: ChatMessage[] = [],
  userContext: UserContext,
  model: string = AI_MODELS.nvidiaLlama
): Promise<string> {
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://vyo.finance',
      'X-Title': 'Vyo Apps',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: `You are Vio Agent, AI financial coach for Vyo Apps.
Help users with savings goals and DeFi yield.
User: ${userContext.walletAddress}
Goals: ${userContext.goals.length}
Net Worth: $${userContext.currentNetWorth}

Rules:
- Plain English only, no jargon
- Always mention risk for vault changes
- Extract goal data: name, target, deadline`
        },
        ...history,
        { role: 'user', content: message }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    })
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

// Fallback system
export async function chatWithFallback(
  message: string,
  history: ChatMessage[],
  userContext: UserContext
): Promise<string> {
  const models = Object.values(AI_MODELS);
  
  for (const model of models) {
    try {
      return await chatWithVioAgent(message, history, userContext, model);
    } catch (err) {
      console.warn(`${model} failed, trying next...`);
    }
  }
  
  throw new Error('All AI models failed');
}
```

---

## 🔌 YO SDK Integration

### Core Functions

```typescript
// services/yo-sdk/client.ts

import { createYoClient, VAULTS } from '@yo-protocol/core';

export class YoSDKService {
  private client;

  constructor(chainId: number = 8453) {  // Base mainnet
    this.client = createYoClient({ chainId });
  }

  async getVaults(): Promise<VaultInfo[]> {
    // Returns: yoUSD, yoETH, yoBTC, etc.
    const vaultEntries = Object.entries(VAULTS);
    
    return Promise.all(
      vaultEntries.map(async ([key, vault]) => {
        const [state, snapshot] = await Promise.all([
          this.client.getVaultState(vault.address),
          this.client.getVaultSnapshot(vault.address),
        ]);

        return {
          id: key,
          name: state.name,
          symbol: state.symbol,
          address: vault.address,
          apy: snapshot.apy,
          tvl: snapshot.tvl,
          riskScore: this.calculateRisk(key),
        };
      })
    );
  }

  async deposit(vaultAddress: string, amount: bigint, userAddress: string) {
    return this.client.deposit({
      vault: vaultAddress as `0x${string}`,
      amount,
      recipient: userAddress as `0x${string}`,
      slippageBps: 50,  // 0.5%
    });
  }

  async redeem(vaultAddress: string, shares: bigint, userAddress: string) {
    return this.client.redeem({
      vault: vaultAddress as `0x${string}`,
      shares,
      recipient: userAddress as `0x${string}`,
    });
  }

  async getUserPosition(vaultAddress: string, userAddress: string) {
    return this.client.getUserPosition(vaultAddress, userAddress);
  }
}

export const yoService = new YoSDKService();
```

---

## ⚙️ Environment Variables

```bash
# .env.example

# Server
PORT=3001
NODE_ENV=development

# AI (OpenRouter - Free Models)
OPENROUTER_API_KEY=sk-or-v1-...       # Get from https://openrouter.ai/keys

# YO SDK
YO_CHAIN_ID=8453                      # Base mainnet (8453) or Ethereum (1)
USE_LIVE_SDK=false                    # Set true for production

# Optional: Direct NVIDIA API (alternative to OpenRouter)
# NVIDIA_API_KEY=nvapi-...
```

---

## 📋 Coding Rules

1. **VIO_AGENT:** prefix on all AI-related comments
2. **Stateless:** Never assume data persists between requests
3. **Wallet Auth:** Always check `req.user.walletAddress` from middleware
4. **Error Handling:** Wrap blockchain calls in try/catch with user-friendly messages
5. **No Database:** Use in-memory Maps only (or blockchain reads)
6. **AI Fallback:** Always have fallback models if primary fails

---

## 📅 Sprint Plan

| Day | Task |
|-----|------|
| 1 | Setup Express, middleware, folder structure |
| 2 | Implement wallet-only auth, YO SDK service |
| 3 | Create goals API (in-memory), vault allocation logic |
| 4 | Implement Vio Agent decision engine |
| 5 | Integrate OpenRouter API (chat, goal parsing) |
| 6 | Setup cron jobs (15-min loop), decision storage |
| 7 | Dashboard aggregation API |
| 8 | Transactions API (deposit/redeem flows) |
| 9 | AI chat endpoint, testing |
| 10 | Integration, demo prep |

---

## 🤝 Interfaces

- **Frontend:** REST API with `X-Wallet-Address` header
- **Blockchain:** YO Protocol SDK for vault interactions
- **AI:** OpenRouter API (free NVIDIA/Meta models)
- **Storage:** In-memory Maps (hackathon), eventually The Graph + IPFS

---

*This is a stateless, blockchain-native backend. No database, no sessions, pure decentralized architecture.*