# WealthOS — Agent Context & Instructions

> **Version:** 1.0 | **Hackathon:** YO SDK Hackathon | **Stack:** Astro + Node.js/Express + YO SDK

---

## 🧠 Project Identity

You are an AI coding agent working on **WealthOS** — an intelligent personal financial operating system that unifies traditional savings, DeFi yield, and AI automation in a single dashboard.

**Core tagline:** *"Set your goals once. WealthOS handles the rest."*

WealthOS has three layers:
1. **Consumer Savings App** — Goal-based savings with natural language input
2. **AI Agent (WealthCoach)** — 24/7 yield optimizer and risk monitor
3. **Portfolio Dashboard** — Unified TradFi + DeFi net worth view

The **YO SDK** is the core yield engine. Every deposit/withdrawal flows through YO Protocol vaults.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Astro (web dashboard) |
| Backend | Node.js + Express |
| API | GraphQL |
| Blockchain | YO SDK, WalletConnect, Base / Arbitrum / Ethereum |
| Banking | Plaid (Open Banking) |
| Exchange | Coinbase API |
| Price Oracles | Chainlink |
| AI/ML | Custom models for risk scoring, yield prediction, cash flow classification |

---

## 📁 Project Structure

```
wealthos/
├── frontend/                  # Astro web app
│   ├── src/
│   │   ├── pages/             # Route pages (dashboard, goals, vaults, settings)
│   │   ├── components/        # UI components
│   │   │   ├── goals/         # Goal cards, wizard, progress bars
│   │   │   ├── vaults/        # Vault comparison, allocation heatmap
│   │   │   ├── ai/            # WealthCoach chat, decision log, rebalance modal
│   │   │   └── dashboard/     # Net worth, yield summary, charts
│   │   └── layouts/
├── backend/
│   ├── src/
│   │   ├── routes/            # Express routes
│   │   ├── services/
│   │   │   ├── yo-sdk/        # YO SDK wrappers (deposit, redeem, getVaults, etc.)
│   │   │   ├── ai/            # WealthCoach logic, rebalancing engine
│   │   │   ├── plaid/         # Bank connection
│   │   │   └── analytics/     # Yield tracker, goal forecaster
│   │   ├── models/            # DB schemas (User, Goal, Vault, Transaction)
│   │   └── webhooks/          # YO, Plaid event handlers
├── shared/
│   └── types/                 # Shared TypeScript types
└── CLAUDE.md
```

---

## 🔑 Core Domain Concepts

### Goals
A **Goal** is the primary user entity. Every deposit is tied to a goal.

```typescript
interface Goal {
  id: string;
  userId: string;
  name: string;           // "New Car", "Emergency Fund", "House DP"
  targetAmount: number;   // e.g., 15000 (USD)
  currentAmount: number;
  deadline: Date;
  priority: 'low' | 'medium' | 'high';
  liquidityNeeds: 'instant' | '24h' | '1week' | 'flexible';
  riskProfile: 'conservative' | 'moderate' | 'aggressive';
  status: 'active' | 'completed' | 'paused';
  vaultAllocations: VaultAllocation[]; // split across YO vaults
  autoDeposit?: AutoDepositConfig;
}
```

### Vault Allocation
Each goal is split across multiple YO vaults based on AI strategy:

```typescript
interface VaultAllocation {
  vaultId: string;        // YO vault ID
  percentage: number;     // e.g., 40 (%)
  currentBalance: number;
  rationale: string;      // AI explanation for this split
}
```

### AI Decision Log
Every AI action MUST be explainable and logged:

```typescript
interface AIDecision {
  id: string;
  goalId: string;
  type: 'rebalance' | 'risk_alert' | 'deposit_suggestion' | 'goal_forecast';
  action: string;         // Human-readable: "Move $500 from Vault A to Vault B"
  reasoning: string;      // Why: "APY 2% higher with similar risk score"
  expectedGain: number;
  gasCost: number;
  status: 'pending_approval' | 'approved' | 'rejected' | 'executed';
  createdAt: Date;
}
```

---

## 🔌 YO SDK Integration

These are the **6 core SDK functions** used in WealthOS. Always wrap in try/catch and handle errors gracefully.

```typescript
// 1. Fetch all available vaults
const vaults = await yo.getVaults();

// 2. Get specific vault details (APY, TVL, risk score, lockup)
const vault = await yo.getVaultDetails(vaultId);

// 3. Deposit to a vault
const tx = await yo.deposit(vaultId, amount, userAddress);

// 4. Redeem/withdraw from a vault
const tx = await yo.redeem(vaultId, amount, userAddress);

// 5. Get user's position in a vault
const position = await yo.getUserPosition(vaultId, userAddress);

// 6. Get total yield earned by user in a vault
const yield = await yo.getYieldEarned(vaultId, userAddress);
```

### Multi-Vault Deposit Pattern
When a user deposits to a goal, ALWAYS split across multiple vaults per AI allocation:

```typescript
async function depositToGoal(goalId: string, totalAmount: number) {
  const goal = await Goal.findById(goalId);
  const allocations = goal.vaultAllocations;

  // Execute parallel deposits
  const txPromises = allocations.map(allocation => {
    const depositAmount = (allocation.percentage / 100) * totalAmount;
    return yo.deposit(allocation.vaultId, depositAmount, userAddress);
  });

  const results = await Promise.allSettled(txPromises);
  // Handle partial failures — log and retry failed legs
}
```

---

## 🤖 WealthCoach AI Logic

### Rebalancing Decision Tree
Run daily. Only rebalance if net benefit is positive after gas:

```
1. OPPORTUNITY SCAN (Daily)
   - New vault APY > current + 2%? → Check risk profile match → Queue rebalance

2. RISK SCAN (Continuous)
   - Vault risk score increased? → Alert user → Wait for approval before executing

3. GOAL TRACKING (Weekly)
   - Progress off-track > 10%? → Suggest deposit increase or timeline adjustment

4. GAS CHECK (Pre-execution)
   - Gas cost > 50% of expected yield gain? → Delay until gas drops
```

### Risk Profiles → Vault Strategy
Map user risk profile to vault types:

| Risk Profile | Vault Mix |
|---|---|
| Conservative | 40% Liquid + 35% Conservative + 25% Stable |
| Moderate | 20% Liquid + 50% Growth + 30% Diversified |
| Aggressive | 10% Liquid + 70% High-Yield + 20% Multi-Protocol |

---

## 👤 User Personas (Reference for UX Decisions)

| Persona | Profile | Priority |
|---|---|---|
| **Sarah, 28** | Crypto-curious, overwhelmed by DeFi | Simplicity, safety, goal clarity |
| **Marcus, 35** | Crypto native, multi-platform | Auto-rebalancing, tax reporting |
| **Elena, 45** | Risk-averse, business owner | Capital preservation, liquidity |

When making UX decisions, always ask: *"Would Sarah understand this without a DeFi background?"*

---

## 🎨 UI/UX Principles

1. **One number first** — Show total net worth / goal progress prominently. Details are secondary.
2. **Explain everything** — Every AI action must have a plain-language explanation. No jargon.
3. **Approval before execution** — AI never moves money without user seeing the `[Approve] / [Dismiss]` modal.
4. **Panic button exists** — Always show "Withdraw All to Stablecoin" emergency option.
5. **Celebrate milestones** — 25%, 50%, 75%, 100% goal completion gets micro-animations.
6. **Show gas cost** — Always display estimated gas and break-even timeline before confirming.

---

## 🔐 Security & Trust Rules

- **Never auto-execute** rebalances without explicit user approval (push notification → in-app modal → confirm).
- **Always show** smart contract audit link in vault detail views.
- **Display lockup periods** prominently — never bury this info.
- **Log all AI decisions** to the transparency dashboard, including ones the user rejected.
- **Overdraft protection** — Auto-pause auto-deposit if bank balance < user-defined threshold.

---

## 🧪 Demo Checklist (Hackathon)

These flows MUST work end-to-end for the demo:

- [ ] Create a goal via natural language text input
- [ ] Execute deposit to **multiple YO vaults simultaneously** (live transaction)
- [ ] Display AI rebalancing suggestion with reasoning
- [ ] Show unified dashboard (TradFi balance + DeFi vault positions)
- [ ] Withdrawal/redeem flow from a vault
- [ ] AI decision transparency log

---

## ⚠️ Known Constraints & Assumptions

- YO SDK supports deposits/redeems on **Base, Ethereum, Arbitrum** — always check chain before execution.
- Gas fees should be L2-optimized — prefer Base or Arbitrum for frequent rebalancing.
- Plaid integration for bank connection is **optional** at hackathon — mock data acceptable for demo.
- User is assumed to have **basic crypto literacy** (wallet, seed phrase, gas concept).
- All AI models at hackathon stage = **rule-based heuristics** masquerading as ML — that's fine.

---

## 📋 Coding Conventions

- **TypeScript everywhere** — strict mode, no `any`.
- **Error messages must be user-friendly** — catch blockchain errors and translate (e.g., "Transaction failed: insufficient gas" → "Something went wrong. We'll retry automatically.").
- **Every API endpoint** that interacts with YO SDK must have a corresponding **optimistic UI update** + rollback on failure.
- **AI reasoning strings** are user-facing — write them in plain English, avoid "APY delta" type jargon.
- Comment complex rebalancing logic with `// WEALTHCOACH:` prefix for easy grep.

---

## 🚀 Current Sprint Priority

1. YO SDK service wrapper (`/backend/src/services/yo-sdk/`)
2. Goal creation API + multi-vault deposit flow
3. Dashboard net worth aggregation view
4. WealthCoach rebalance suggestion modal (UI + approval flow)
5. Onboarding wizard (goal type → risk quiz → first deposit)

---

## 🤖 Autonomous AI Agent Architecture

WealthCoach runs an autonomous **Sense → Plan → Act** loop in the background.

### Two Modes of Autonomy

| Mode | When | Examples |
|---|---|---|
| **Full Auto** | Low-risk, small actions | Collect & re-deposit yield, pause auto-deposit if bank low, switch to safer vault if risk spikes |
| **Approval-Gated** | High-risk or large amounts | Rebalance > $500, move to new vault, gas cost > $5 |

### Agent Loop Implementation

```typescript
// Run via cron job every 15 minutes
async function wealthCoachLoop(userId: string) {
  const state = await gatherState(userId);      // balances, APYs, goals, gas price
  const decisions = await planActions(state);   // rule engine or LLM call

  for (const decision of decisions) {
    if (decision.requiresApproval) {
      await notifyUser(userId, decision);        // push notif → in-app modal
    } else {
      await executeAction(decision);             // auto-execute silently
      await logDecision(decision, 'auto');       // always log
    }
  }
}
```

### Using Claude API as the Reasoning Brain

```typescript
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: `You are WealthCoach, an autonomous DeFi portfolio manager.
Given the user's goals, risk profile, and current market state,
decide what actions to take. Always return JSON only:
{ actions: [], requiresApproval: boolean, reasoning: string }`,
    messages: [{ role: "user", content: JSON.stringify(state) }]
  })
});
```

### Autonomy Rules
- **NEVER move money without logging** the decision + reasoning, even for auto-executed actions.
- **Agent spend limit** per transaction — never exceed user-configured max.
- **Fail safe** — if agent loop throws, default to "do nothing" not "do something".
- **Idempotent actions** — check if rebalance was already queued before queuing again.

---

## 🔒 Zero-Knowledge (ZK) Strategy

ZK lets WealthOS prove things are true **without revealing underlying data.** Key for user privacy.

### Three Use Cases in WealthOS

| Use Case | What's Proved | What Stays Private |
|---|---|---|
| **Goal progress proof** | "I have enough for my down payment" | Exact balance |
| **Private rebalancing** | "User interacted with WealthOS" | Which vaults, which amounts |
| **KYC without data exposure** | "User is not sanctioned" | Identity documents |

### ZK Stack Decision

| Tool | Use Case | Hackathon? |
|---|---|---|
| **zkSync Era / Scroll** | Deploy on ZK rollup — free ZK, just use the chain | ✅ Yes — easiest win |
| **Semaphore** | Anonymous identity / group membership proofs | ✅ Yes — good demo |
| **Noir (Aztec)** | Write custom ZK circuits (balance proofs) | ⚠️ Post-hackathon |
| **Aztec Network** | Fully private transactions by default | ⚠️ Post-hackathon |

### Hackathon ZK Quick Win
Deploy YO SDK contract calls on **zkSync Era** — all transactions are automatically ZK-proven. Judges love this, zero extra code.

### ZK Balance Proof Circuit (Post-Hackathon — Noir)

```typescript
// Circuit: prove balance >= target without revealing balance
// balance = private input, target + commitment = public inputs
fn main(balance: Field, target: Field, commitment: Field) {
  assert(balance >= target);
  assert(std::hash::pedersen([balance]) == commitment);
}

// Frontend: generate proof, submit only proof on-chain
async function proveGoalAchieved(balance: number, target: number) {
  const input = { balance, target, commitment: await pedersen(balance) };
  const proof = await noir.generateProof(input);
  await contract.verifyGoalAchieved(proof); // balance never leaves browser
}
```

---

## 📜 Smart Contract Decision

### Verdict: SKIP for Hackathon, BUILD for Production

```
HACKATHON (now):          PRODUCTION (post-hackathon):
─────────────────         ──────────────────────────
✅ Pure YO SDK calls      ✅ Deploy WealthOSRouter.sol
✅ Backend cron = "AI"    ✅ Agent permission system
✅ Less attack surface    ✅ Batch deposits (1 tx = 1 gas)
✅ Ship faster            ✅ On-chain goal escrow
                          ✅ ZK balance proof verifier
                          ⚠️ Requires audit before mainnet
```

### When Smart Contract IS Needed

| Feature | Why Contract Needed |
|---|---|
| **Batch deposit** | 1 tx → 3 vaults (save gas) |
| **Autonomous agent** | Agent executes without user signing every tx |
| **Goal escrow** | Lock funds until deadline on-chain |
| **ZK proof verifier** | Verifier must live on-chain |
| **Non-custodial AI** | Agent has scoped permissions, not full custody |

### WealthOSRouter.sol (Production Reference)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract WealthOSRouter {
    // Agent permissions — limited spend, not full custody
    mapping(address => bool) public approvedAgents;
    mapping(address => uint256) public agentSpendLimit;

    // BATCH DEPOSIT: 1 tx → multiple YO vaults
    function batchDeposit(
        address[] calldata vaults,
        uint256[] calldata amounts
    ) external {
        require(vaults.length == amounts.length, "Mismatch");
        for (uint i = 0; i < vaults.length; i++) {
            IYOVault(vaults[i]).deposit(amounts[i]);
        }
    }

    // AGENT REBALANCE: AI executes within spend limit
    function agentRebalance(
        address fromVault,
        address toVault,
        uint256 amount
    ) external onlyAgent {
        require(amount <= agentSpendLimit[msg.sender], "Exceeds limit");
        IYOVault(fromVault).redeem(amount);
        IYOVault(toVault).deposit(amount);
        emit AgentAction(msg.sender, fromVault, toVault, amount);
    }

    // PANIC BUTTON: Emergency withdraw everything
    function emergencyExit(address[] calldata vaults) external {
        for (uint i = 0; i < vaults.length; i++) {
            IYOVault(vaults[i]).redeem(type(uint256).max);
        }
        emit EmergencyExit(msg.sender);
    }

    modifier onlyAgent() {
        require(approvedAgents[msg.sender], "Not authorized agent");
        _;
    }

    event AgentAction(address agent, address from, address to, uint256 amount);
    event EmergencyExit(address user);
}
```

### Updated Project Structure (with contracts)

```
wealthos/
├── contracts/                 # Smart contracts (post-hackathon)
│   ├── src/
│   │   └── WealthOSRouter.sol
│   ├── test/
│   └── foundry.toml           # Use Foundry for testing
├── frontend/
├── backend/
└── CLAUDE.md
```

---

## 🗺️ Implementation Roadmap

```
HACKATHON (now)                POST-HACKATHON
───────────────                ─────────────────────────────
Week 1-2:                      Phase 2: Smart Contract
  ✅ YO SDK integration          🔲 Deploy WealthOSRouter.sol
  ✅ Agent loop (cron + Claude)  🔲 Batch deposit (gas savings)
  ✅ Approval-gated rebalance    🔲 Agent permission system

Week 3:                        Phase 3: ZK Privacy
  ✅ Deploy on zkSync Era        🔲 Noir balance proof circuits
  ✅ "ZK-proven txs" in demo     🔲 Aztec private rebalancing
  ✅ Semaphore for anon goals    🔲 ZK KYC (no data exposure)
```

---

*This file is the source of truth for all agent/AI coding sessions on WealthOS. Update it when architecture decisions change.*
