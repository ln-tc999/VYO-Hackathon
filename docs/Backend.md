# Vyo Apps — Backend Agent Instructions

> **Role:** Backend + AI Lead
> **Stack:** Node.js, Express, GraphQL, PostgreSQL, Redis, OpenRouter API or NVIDIA API
> **AI Persona:** Vio Agent (Vio Agent engine)

---

## 🎯 Your Mission

Build the **brain of Vyo Apps** — the API layer, Vio Agent autonomous agent loop, and all business logic. You own everything between the frontend and the blockchain.

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
│   │   └── auth.ts                 # Wallet-based auth (SIWE)
│   ├── services/
│   │   ├── yo-sdk/
│   │   │   ├── index.ts            # YO SDK wrapper (consume from blockchain agent)
│   │   │   └── types.ts
│   │   ├── ai/
│   │   │   ├── vioAgent.ts        # Main autonomous loop
│   │   │   ├── decisionEngine.ts   # Rule-based decision tree
│   │   │   ├── openRouterClient.ts     # OpenRouter API integration
│   │   │   ├── riskScorer.ts       # Risk profile calculator
│   │   │   └── goalForecaster.ts   # Monte Carlo / projection
│   │   ├── plaid/
│   │   │   └── mockPlaid.ts        # Mock bank data for hackathon
│   │   └── notifications/
│   │       └── pushNotification.ts # Alert user on AI decisions
│   ├── models/
│   │   ├── User.ts
│   │   ├── Goal.ts
│   │   ├── VaultAllocation.ts
│   │   ├── AIDecision.ts
│   │   └── Transaction.ts
│   ├── jobs/
│   │   └── vioLoop.ts             # Cron job runner
│   ├── middleware/
│   │   ├── auth.ts                 # JWT / SIWE verify
│   │   └── errorHandler.ts
│   └── graphql/
│       ├── schema.ts
│       └── resolvers.ts
├── prisma/
│   └── schema.prisma               # DB schema
└── .env.example
```

---

## 🗄️ Database Schema (Prisma)

```prisma
// prisma/schema.prisma

model User {
  id            String    @id @default(cuid())
  walletAddress String    @unique
  riskProfile   RiskLevel @default(MODERATE)
  createdAt     DateTime  @default(now())
  goals         Goal[]
  decisions     AIDecision[]
}

model Goal {
  id              String          @id @default(cuid())
  userId          String
  user            User            @relation(fields: [userId], references: [id])
  name            String
  targetAmount    Float
  currentAmount   Float           @default(0)
  deadline        DateTime
  priority        Priority        @default(MEDIUM)
  liquidityNeeds  LiquidityType   @default(FLEXIBLE)
  riskProfile     RiskLevel       @default(MODERATE)
  status          GoalStatus      @default(ACTIVE)
  allocations     VaultAllocation[]
  autoDeposit     AutoDeposit?
  createdAt       DateTime        @default(now())
}

model VaultAllocation {
  id             String  @id @default(cuid())
  goalId         String
  goal           Goal    @relation(fields: [goalId], references: [id])
  vaultId        String  // YO vault ID
  percentage     Float   // 0-100
  currentBalance Float   @default(0)
  rationale      String  // AI explanation
}

model AIDecision {
  id           String         @id @default(cuid())
  userId       String
  user         User           @relation(fields: [userId], references: [id])
  goalId       String?
  type         DecisionType
  action       String         // "Move $500 from Vault A to Vault B"
  reasoning    String         // Plain English why
  expectedGain Float
  gasCost      Float
  status       DecisionStatus @default(PENDING_APPROVAL)
  createdAt    DateTime       @default(now())
  executedAt   DateTime?
}

model Transaction {
  id        String   @id @default(cuid())
  goalId    String
  type      TxType   // DEPOSIT | REDEEM | REBALANCE
  amount    Float
  vaultId   String
  txHash    String?
  status    TxStatus @default(PENDING)
  createdAt DateTime @default(now())
}

enum RiskLevel     { CONSERVATIVE MODERATE AGGRESSIVE }
enum Priority      { LOW MEDIUM HIGH }
enum LiquidityType { INSTANT DAY_1 WEEK_1 FLEXIBLE }
enum GoalStatus    { ACTIVE PAUSED COMPLETED }
enum DecisionType  { REBALANCE RISK_ALERT DEPOSIT_SUGGESTION GOAL_FORECAST }
enum DecisionStatus { PENDING_APPROVAL APPROVED REJECTED EXECUTED }
enum TxType        { DEPOSIT REDEEM REBALANCE }
enum TxStatus      { PENDING CONFIRMED FAILED }
```

---

## 🛣️ REST API Endpoints

### Goals
```
GET    /api/goals                    → List user goals
POST   /api/goals                    → Create goal (+ AI allocates vaults)
GET    /api/goals/:id                → Goal detail + allocations
PATCH  /api/goals/:id                → Update goal params
POST   /api/goals/:id/deposit        → Trigger deposit flow
POST   /api/goals/:id/redeem         → Trigger withdrawal
DELETE /api/goals/:id                → Archive goal
```

### Vaults
```
GET    /api/vaults                   → All YO vaults (cached 5min)
GET    /api/vaults/:id               → Vault detail: APY, TVL, risk, lockup
```

### Dashboard
```
GET    /api/dashboard/networth       → Aggregated total balance
GET    /api/dashboard/yield          → Yield earned this month/year
GET    /api/dashboard/breakdown      → TradFi vs DeFi split
```

### AI / Vio Agent
```
GET    /api/ai/decisions             → All decisions (paginated)
GET    /api/ai/decisions/pending     → Awaiting user approval
POST   /api/ai/decisions/:id/approve → User approves → execute
POST   /api/ai/decisions/:id/dismiss → User dismisses
POST   /api/ai/chat                  → Chat with Vio Agent (natural language)
```

### Auth
```
POST   /api/auth/nonce               → Get SIWE nonce
POST   /api/auth/verify              → Verify signature → JWT
```

---

## 🤖 Vio Agent Agent Loop

### Main Loop (runs every 15 minutes via cron)

```typescript
// jobs/vioLoop.ts
import cron from 'node-cron';
import { runVio AgentForAllUsers } from '../services/ai/vioAgent';

// Every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  console.log('[VERA] Starting agent loop...');
  await runVio AgentForAllUsers();
});
```

```typescript
// services/ai/vioAgent.ts
export async function runVio AgentForUser(userId: string) {
  const state = await gatherUserState(userId);
  const decisions = await decisionEngine(state);

  for (const decision of decisions) {
    // Log ALL decisions, even auto-executed ones
    const saved = await AIDecision.create(decision);

    if (decision.requiresApproval) {
      await notifyUser(userId, saved);           // push notif → modal
    } else {
      await executeDecision(saved);              // auto-execute
    }
  }
}

async function gatherUserState(userId: string) {
  const [goals, vaults, gasPrice] = await Promise.all([
    Goal.findMany({ where: { userId, status: 'ACTIVE' } }),
    yo.getVaults(),                              // from YO SDK service
    getGasPrice(),
  ]);
  return { goals, vaults, gasPrice };
}
```

### Decision Engine (Rule-Based for Hackathon)

```typescript
// services/ai/decisionEngine.ts
export async function decisionEngine(state: UserState): Promise<Decision[]> {
  const decisions: Decision[] = [];

  for (const goal of state.goals) {
    // 1. OPPORTUNITY SCAN
    const betterVault = findBetterVault(goal, state.vaults);
    if (betterVault && betterVault.apy > currentApy(goal) + 2) {
      const gasCost = estimateGas(state.gasPrice);
      const annualGain = calculateGain(goal.currentAmount, betterVault.apy);

      if (gasCost < annualGain * 0.5) {  // gas < 50% of annual gain
        decisions.push({
          type: 'REBALANCE',
          goalId: goal.id,
          action: `Move $${goal.currentAmount} to ${betterVault.name}`,
          reasoning: `APY ${betterVault.apy - currentApy(goal)}% higher with similar risk`,
          expectedGain: annualGain,
          gasCost,
          requiresApproval: goal.currentAmount > 500,  // auto if < $500
        });
      }
    }

    // 2. GOAL TRACKING
    const progress = goal.currentAmount / goal.targetAmount;
    const expectedProgress = getExpectedProgress(goal);
    if (progress < expectedProgress - 0.1) {  // 10% off track
      decisions.push({
        type: 'DEPOSIT_SUGGESTION',
        goalId: goal.id,
        action: `Increase monthly deposit by $${suggestIncrease(goal)}`,
        reasoning: `Goal is ${Math.round((expectedProgress - progress) * 100)}% behind schedule`,
        requiresApproval: true,
      });
    }
  }

  return decisions;
}
```

### OpenRouter API Integration (Vio Agent Chat)

We use **OpenRouter** for access to multiple free/cheap AI models (NVIDIA, Meta, Mistral, etc.).

```typescript
// services/ai/openRouterClient.ts
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// Free/Cheap Models via OpenRouter
const MODELS = {
  // NVIDIA free models
  nvidiaLlama: 'nvidia/llama-3.1-nemotron-70b-instruct:free',
  nvidiaMistral: 'nvidia/mistral-nemo-instruct-2407:free',
  
  // Other free options
  metaLlama: 'meta-llama/llama-3.1-70b-instruct:free',
  mistral: 'mistralai/mistral-7b-instruct:free',
  googleGemini: 'google/gemini-flash-1.5:free',
  
  // Cheap paid options (fallback)
  anthropicClaude: 'anthropic/claude-3.5-sonnet',
  openaiGpt4: 'openai/gpt-4o-mini',
};

export async function chatWithVioAgent(
  message: string,
  history: Message[],
  userContext: UserContext,
  model: string = MODELS.nvidiaLlama // Default to free NVIDIA
) {
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://vyo.finance', // Required by OpenRouter
      'X-Title': 'Vyo Apps',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: `You are Vio Agent, the AI financial coach for Vyo Apps.
You help users manage their savings goals and DeFi yield optimization.
User context: ${JSON.stringify(userContext)}

Rules:
- Always respond in plain English, no DeFi jargon
- For goal creation, extract: name, targetAmount, deadline
- For deposit questions, reference their current goal progress
- Always mention risk when suggesting vault changes
- Return JSON when parsing goals: { goalName, targetAmount, deadline, suggestedRisk }`
        },
        ...history,
        { role: 'user', content: message }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'AI request failed');
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Fallback to alternative model if primary fails
export async function chatWithVioAgentWithFallback(
  message: string,
  history: Message[],
  userContext: UserContext
) {
  const models = [
    MODELS.nvidiaLlama,
    MODELS.nvidiaMistral,
    MODELS.metaLlama,
    MODELS.mistral,
  ];

  for (const model of models) {
    try {
      return await chatWithVioAgent(message, history, userContext, model);
    } catch (err) {
      console.warn(`Model ${model} failed, trying next...`);
      continue;
    }
  }

  throw new Error('All AI models failed');
}
```

### NVIDIA API Alternative (Direct)

If you prefer direct NVIDIA API without OpenRouter:

```typescript
// services/ai/nvidiaClient.ts
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';

export async function chatWithNvidia(
  message: string,
  history: Message[],
  userContext: UserContext
) {
  const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${NVIDIA_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'nvidia/llama-3.1-nemotron-70b-instruct',
      messages: [
        {
          role: 'system',
          content: `You are Vio Agent, the AI financial coach for Vyo Apps...`
        },
        ...history,
        { role: 'user', content: message }
      ],
      max_tokens: 1024,
      temperature: 0.2,
      top_p: 0.7,
    })
  });

  const data = await response.json();
  return data.choices[0].message.content;
}
```

---

## 🧠 AI Goal Allocation Logic

When a goal is created, Vio Agent auto-assigns vault splits:

```typescript
// services/ai/riskScorer.ts
export function allocateVaults(
  riskProfile: RiskLevel,
  liquidityNeeds: LiquidityType,
  availableVaults: Vault[]
): VaultAllocation[] {

  const strategies = {
    CONSERVATIVE: [
      { type: 'liquid',       pct: 40, reason: 'Instant access for emergencies' },
      { type: 'conservative', pct: 35, reason: 'Stable yield, low risk' },
      { type: 'stable',       pct: 25, reason: 'Capital preservation' },
    ],
    MODERATE: [
      { type: 'liquid',       pct: 20, reason: 'Flexibility buffer' },
      { type: 'growth',       pct: 50, reason: 'Optimized yield for timeline' },
      { type: 'diversified',  pct: 30, reason: 'Multi-protocol diversification' },
    ],
    AGGRESSIVE: [
      { type: 'liquid',       pct: 10, reason: 'Minimum liquidity buffer' },
      { type: 'high_yield',   pct: 70, reason: 'Maximum yield potential' },
      { type: 'multi_protocol', pct: 20, reason: 'Protocol diversification' },
    ],
  };

  const strategy = strategies[riskProfile];
  return strategy.map(s => ({
    vaultId: findVaultByType(availableVaults, s.type).id,
    percentage: s.pct,
    rationale: s.reason,
  }));
}
```

---

## 🔐 Auth: Wallet-Only (No JWT/Session)

**Philosophy:** Since Vyo Apps is a blockchain-native app, we use **WalletConnect** as the sole authentication method. No JWT, no sessions, no SIWE.

### How It Works
1. User connects wallet via WalletConnect (wagmi)
2. Wallet address is stored in **IndexedDB** on the frontend
3. Every API call includes the wallet address in the header: `X-Wallet-Address: 0x...`
4. Backend treats wallet address as the user ID

### Frontend Session Store (IndexedDB)

```typescript
// frontend/src/lib/session.ts
import { openDB } from 'idb';

const DB_NAME = 'vyo-session';
const STORE_NAME = 'wallet';

export async function saveWalletSession(address: string, chainId: number) {
  const db = await openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME);
    },
  });
  await db.put(STORE_NAME, { address, chainId, connectedAt: Date.now() }, 'session');
}

export async function getWalletSession() {
  const db = await openDB(DB_NAME, 1);
  return db.get(STORE_NAME, 'session');
}

export async function clearWalletSession() {
  const db = await openDB(DB_NAME, 1);
  await db.delete(STORE_NAME, 'session');
}
```

### Backend Middleware

```typescript
// middleware/auth.ts
export function walletAuth(req: Request, res: Response, next: NextFunction) {
  const walletAddress = req.headers['x-wallet-address'] as string;
  
  if (!walletAddress || !isValidAddress(walletAddress)) {
    return res.status(401).json({ error: 'Wallet address required' });
  }
  
  // Set user context from wallet address
  req.user = { 
    id: walletAddress.toLowerCase(),
    walletAddress: walletAddress.toLowerCase() 
  };
  next();
}
```

### API Usage

```typescript
// Frontend API call with wallet auth
const response = await fetch('/api/goals', {
  headers: {
    'X-Wallet-Address': walletAddress,
  },
});
```

**Benefits:**
- No JWT expiration issues
- No session management
- Stateless backend
- Truly decentralized auth

---

## ⚙️ Environment Variables

```bash
# .env.example
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# AI Models (choose one)
OPENROUTER_API_KEY=...       # Recommended - access to multiple free models
NVIDIA_API_KEY=...           # Alternative - direct NVIDIA API

YO_SDK_API_KEY=...           # From blockchain agent
PLAID_CLIENT_ID=...          # Optional for hackathon
PLAID_SECRET=...
# Note: No JWT_SECRET needed - we use wallet-only auth via X-Wallet-Address header
```

**AI Model Recommendations:**

| Provider | Model | Cost | Quality | Best For |
|----------|-------|------|---------|----------|
| **OpenRouter** | nvidia/llama-3.1-nemotron-70b | FREE | High | Default choice |
| **OpenRouter** | meta-llama/llama-3.1-70b | FREE | High | Fallback |
| **OpenRouter** | mistralai/mistral-7b | FREE | Medium | Lightweight |
| **NVIDIA** | llama-3.1-nemotron-70b | FREE | High | Direct API |
| OpenRouter | anthropic/claude-3.5-sonnet | Paid | Highest | Premium option |

---

## 📋 Coding Rules

- **WEALTHCOACH:** prefix on all Vio Agent logic comments for easy grep.
- Every route must have **try/catch** — never let blockchain errors surface as 500s.
- **Cache vault data** in Redis (5 min TTL) — never hit YO SDK on every request.
- All money values stored as **cents (integer)** in DB, convert to dollars at API boundary.
- AI `reasoning` field is **user-facing** — write in plain English always.

---

## 📅 10-Day Sprint

| Hari | Deliverable |
|---|---|
| 1 | Project setup, Prisma schema, Express boilerplate, env config |
| 2 | Auth (SIWE), User model, JWT middleware |
| 3 | Goals CRUD API + vault allocation logic (allocateVaults) |
| 4 | YO SDK service wrapper integration (consume blockchain agent's module) |
| 5 | Vio Agent agent loop + decision engine (rule-based) |
| 6 | OpenRouter/NVIDIA API chat integration (Vio Agent natural language - free models) |
| 7 | Dashboard aggregation endpoints (net worth, yield, breakdown) |
| 8 | Decision approval/dismiss endpoints + notification service |
| 9 | Mock Plaid + Redis caching + rate limiting |
| 10 | Integration testing, seed data for demo, bug fixes |

---

## 🤝 Interfaces with Other Agents

- **Frontend Agent** — expose all endpoints listed in REST API section above
- **Blockchain Agent** — import `yo-sdk` service; call `depositToGoal`, `redeemFromGoal`
- **SC Agent** — call `batchDeposit` on WealthOSRouter contract via blockchain agent
