# Vyo Apps — Backend Agent Instructions

> **Role:** Backend + AI Lead  
> **Stack:** Node.js, Express, YO SDK, OpenRouter API (Free AI Models)  
> **AI Persona:** Vio Agent  
> **Architecture:** Stateless (No Database) - All data on Blockchain  
> **⚠️ HACKATHON STRATEGY:** Hybrid - Real YO reads, Switchable writes

---

## 🚨 HACKATHON STRATEGY (CRITICAL!)

### Development vs Demo Mode

```
┌─────────────────────────────────────────────────────────────────┐
│                     DEVELOPMENT MODE                            │
├─────────────────────────────────────────────────────────────────┤
│ ✅ Read Vault Data:  REAL from YO API (APY, TVL, pools)         │
│ ✅ User Balance:     MOCK (no crypto needed for testing)        │
│ ✅ Transactions:     MOCK (simulated, instant)                  │
│                                                                 │
│ 👉 Use this for: UI development, testing, debugging            │
│ 👉 No real wallet funding required                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     DEMO/PRODUCTION MODE                        │
├─────────────────────────────────────────────────────────────────┤
│ ✅ Read Vault Data:  REAL from YO API                           │
│ ✅ User Balance:     REAL from blockchain                       │
│ ✅ Transactions:     REAL on-chain deposit/redeem               │
│                                                                 │
│ 👉 Use this for: Hackathon demo, production                     │
│ 👉 Requires: Wallet with real crypto ($5-10)                    │
└─────────────────────────────────────────────────────────────────┘
```

### Why This Strategy?

**Hackathon Requirements:**
- ❌ Mockups alone will NOT qualify
- ✅ Must demonstrate working YO SDK integration
- ✅ Real deposit/redeem flows must work

**Our Solution:**
- **Read**: Always real YO API (shows we integrated properly)
- **Write**: Switchable (easy dev → real demo)

### Environment Configuration

```bash
# .env

# MODE 1: Development (no crypto needed)
DEV_MODE=mock

# MODE 2: Demo (real transactions)
# DEV_MODE=live

# YO Protocol (always used for reads)
YO_CHAIN_ID=8453  # Base mainnet
```

### Judging Criteria Addressed:

| Criteria | Our Approach | Status |
|----------|--------------|--------|
| **Quality of Integration (20%)** | Real YO API reads (APY, TVL) | ✅ |
| **Real Transactions** | Switchable: mock (dev) → real (demo) | ✅ |
| **UX Simplicity (30%)** | Clean UI works in both modes | 🔄 |

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

## 🔌 YO SDK Integration (Hybrid Strategy)

### Architecture: Real Reads + Switchable Writes

```
┌──────────────────────────────────────────────────────────────┐
│                      YO SDK SERVICE                          │
├──────────────────────┬───────────────────────────────────────┤
│   READ (Always Real) │   WRITE (Dev: Mock / Live: Real)      │
├──────────────────────┼───────────────────────────────────────┤
│ ✅ getVaults()       │ ✅ deposit()   → Mock / Real          │
│ ✅ getVaultSnapshot()│ ✅ redeem()    → Mock / Real          │
│ ✅ getUserPosition() │                                       │
│ ✅ APY, TVL, Pools   │                                       │
└──────────────────────┴───────────────────────────────────────┘
         │                           │
         ▼                           ▼
┌─────────────────┐      ┌──────────────────┐
│  YO Protocol    │      │  Mock (Dev)      │
│  API / SDK      │      │  Real (Demo)     │
│  (Always Live)  │      │  (Switchable)    │
└─────────────────┘      └──────────────────┘
```

### 💰 Understanding YO Yield

**Bagaimana Yield Bekerja:**

```
User Deposit 100 USDC
        ↓
   Dapat 98 yoUSD (shares)
        ↓
   Shares appreciate over time
        ↓
   Redeem: 98 shares → 105 USDC
                 ↑
           Yield earned!
```

**Key Concepts:**
- **ERC-4626 Standard** - Shares represent vault ownership
- **Exchange Rate** - Naik terus (shares:assets ratio)
- **Yield Sources** - Aave, Compound, Morpho (auto-rebalanced)
- **APY** - Varies: yoUSD (4-7%), yoETH (3-8%), yoBTC (2-5%)
- **Fees** - Currently 0%

### Implementation

```typescript
// services/yo-sdk/client.ts

const DEV_MODE = process.env.DEV_MODE || 'mock';
const IS_LIVE_MODE = DEV_MODE === 'live';

export class YoSDKService {
  
  /**
   * READ: Always real from YO Protocol
   * Shows real APY, TVL - proves integration works
   */
  async getVaults(): Promise<VaultInfo[]> {
    try {
      // Real YO API
      const response = await fetch('https://api.yo.xyz/api/v1/vaults');
      const data = await response.json();
      return this.transformVaultData(data.vaults);
    } catch {
      // Fallback to mock only if API fails
      return MOCK_VAULTS;
    }
  }
  
  /**
   * READ: Real vault snapshot (APY, TVL)
   */
  async getVaultSnapshot(vaultAddress: string) {
    const response = await fetch(
      `https://api.yo.xyz/api/v1/vault/${vaultAddress}`
    );
    return response.json();
  }

  /**
   * READ: User position (for yield calculation)
   */
  async getUserPosition(vaultAddress: string, userAddress: string) {
    if (IS_LIVE_MODE) {
      const { createYoClient } = await import('@yo-protocol/core');
      const client = createYoClient({ chainId: 8453 });
      return client.getUserPosition(vaultAddress, userAddress);
    }
    // Mock
    return { shares: 100, assets: 102 }; // 2% yield simulated
  }

  /**
   * WRITE: Switchable based on mode
   */
  async deposit(vaultAddress: string, amount: number, userAddress: string) {
    if (IS_LIVE_MODE) {
      // REAL TRANSACTION
      const { createYoClient } = await import('@yo-protocol/core');
      const client = createYoClient({ chainId: 8453 });
      
      return client.deposit({
        vault: vaultAddress as `0x${string}`,
        amount: parseUnits(amount.toString(), 6),
        recipient: userAddress as `0x${string}`,
        slippageBps: 50,
      });
    }
    
    // MOCK
    return {
      hash: '0x...',
      shares: (amount * 0.98).toString(),
      status: 'confirmed',
    };
  }

  /**
   * WRITE: Redeem/Withdraw
   */
  async redeem(vaultAddress: string, shares: number, userAddress: string) {
    if (IS_LIVE_MODE) {
      const { createYoClient } = await import('@yo-protocol/core');
      const client = createYoClient({ chainId: 8453 });
      
      return client.redeem({
        vault: vaultAddress as `0x${string}`,
        shares: parseUnits(shares.toString(), 6),
        recipient: userAddress as `0x${string}`,
      });
    }
    
    // MOCK
    return {
      hash: '0x...',
      assets: (shares * 1.02).toString(), // Includes yield
      status: 'confirmed',
    };
  }
}

export const yoService = new YoSDKService();
```

### Yield API Endpoints

```typescript
// routes/yield.ts

import { Router } from 'express';
import { yieldTracker } from '../services/yield-tracker.js';

export const yieldRouter = Router();

// GET /api/yield/total - Total yield across all vaults
yieldRouter.get('/total', async (req, res) => {
    const { user } = req.query;
    const data = await yieldTracker.getUserTotalYield(user as string);
    res.json({ success: true, data });
});

// GET /api/yield/vault/:vaultId - Yield for specific vault
yieldRouter.get('/vault/:vaultId', async (req, res) => {
    const { user } = req.query;
    const { vaultId } = req.params;
    const data = await yieldTracker.getUserVaultYield(user as string, vaultId);
    res.json({ success: true, data });
});

// GET /api/yield/history - Historical yield data
yieldRouter.get('/history', async (req, res) => {
    const { user, vault, days = 30 } = req.query;
    const data = await yieldTracker.getYieldHistory(
        user as string,
        vault as string,
        parseInt(days as string)
    );
    res.json({ success: true, data });
});

// GET /api/yield/optimize - Vio Agent recommendations
yieldRouter.get('/optimize', async (req, res) => {
    const { user, amount, risk } = req.query;
    const strategy = await yieldOptimizer.compareStrategies(
        parseFloat(amount as string),
        risk as 'conservative' | 'moderate' | 'aggressive'
    );
    res.json({ success: true, data: strategy });
});
```

### Yield Tracker Service

```typescript
// services/yield-tracker.ts

interface YieldData {
    vaultId: string;
    currentApy: number;
    realizedYield: number;
    projectedYield: number;
    totalDeposited: number;
    currentValue: number;
    profit: number;
}

export class YieldTracker {
    
    async getUserVaultYield(
        userAddress: string,
        vaultAddress: string
    ): Promise<YieldData> {
        // 1. Get current position
        const position = await yoService.getUserPosition(vaultAddress, userAddress);
        
        // 2. Get transaction history
        const history = await this.getUserTransactions(userAddress, vaultAddress);
        
        // 3. Calculate deposited vs current
        const totalDeposited = history
            .filter(tx => tx.type === 'deposit')
            .reduce((sum, tx) => sum + tx.amount, 0);
        
        const totalWithdrawn = history
            .filter(tx => tx.type === 'redeem')
            .reduce((sum, tx) => sum + tx.amount, 0);
        
        // 4. Calculate yield
        const netDeposited = totalDeposited - totalWithdrawn;
        const currentValue = position.assets;
        const profit = currentValue - netDeposited;
        
        // 5. Get current APY
        const vault = await yoService.getVaultDetails(vaultAddress);
        
        return {
            vaultId: vault.id,
            currentApy: vault.apy,
            realizedYield: profit,
            projectedYield: currentValue * (vault.apy / 100),
            totalDeposited,
            currentValue,
            profit,
        };
    }
    
    async getUserTotalYield(userAddress: string) {
        const vaults = await yoService.getVaults();
        const userVaults: YieldData[] = [];
        
        for (const vault of vaults) {
            const position = await yoService.getUserPosition(vault.address, userAddress);
            if (position.shares > 0) {
                const yieldData = await this.getUserVaultYield(userAddress, vault.address);
                userVaults.push(yieldData);
            }
        }
        
        const totalDeposited = userVaults.reduce((sum, v) => sum + v.totalDeposited, 0);
        const currentValue = userVaults.reduce((sum, v) => sum + v.currentValue, 0);
        const totalProfit = currentValue - totalDeposited;
        const avgApy = userVaults.length > 0 
            ? userVaults.reduce((sum, v) => sum + v.currentApy, 0) / userVaults.length 
            : 0;
        
        return {
            totalDeposited,
            currentValue,
            totalProfit,
            avgApy,
            vaults: userVaults,
        };
    }
}
```

### Vio Agent: Yield Optimization

```typescript
// services/ai/decisionEngine.ts

export async function scanForBetterYield(
    goal: Goal,
    state: UserState
): Promise<Decision | null> {
    
    const currentVault = goal.vaultAllocations[0];
    const currentApy = getVaultApy(currentVault.vaultId, state.vaults);
    
    // Find vaults with better APY
    const betterVaults = state.vaults.filter(v => 
        v.riskScore <= getCurrentRisk(goal) + 1 &&
        v.apy > currentApy + 1.5 // At least 1.5% better
    );
    
    if (betterVaults.length === 0) return null;
    
    const bestVault = betterVaults.reduce((best, v) => 
        v.apy > best.apy ? v : best
    );
    
    const apyDiff = bestVault.apy - currentApy;
    const annualGain = (goal.currentAmount * apyDiff) / 100;
    
    return {
        type: 'REBALANCE',
        goalId: goal.id,
        action: `Move $${goal.currentAmount.toFixed(2)} to ${bestVault.name}`,
        reasoning: `${bestVault.name} offers ${apyDiff.toFixed(2)}% higher APY (${bestVault.apy}% vs ${currentApy}%). Estimated annual gain: $${annualGain.toFixed(2)}.`,
        expectedGain: annualGain,
        requiresApproval: goal.currentAmount > 500,
    };
}
```

### Switching Modes

```bash
# Development (no crypto needed)
DEV_MODE=mock
npm run dev

# Demo/Production (real transactions)
DEV_MODE=live
npm run dev
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