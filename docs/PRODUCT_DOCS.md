# Vyo Apps - Product & Technical Documentation

## 1. Product Overview

**Vyo Apps** is an AI-Powered DeFi Yield Optimizer — a consumer savings application that helps users grow their money through automated DeFi yield strategies.

### Target Users
- Retail consumers who want better returns than traditional savings
- Crypto-native users looking for automated yield optimization
- Mobile-first users who prefer app-like experiences

### Core Value Proposition
> "Set your savings goals once. Vyo's AI agent optimizes your yield automatically — you never need to manually manage your deposits."

---

## 2. User Flow

### 2.1 Onboarding Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              NEW USER FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────┘

     ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
     │  Land    │ ───▶ │ Connect │ ───▶ │ Risk    │ ───▶ │ Create  │
     │  Page    │      │ Wallet  │      │ Quiz    │      │ First   │
     └──────────┘      └──────────┘      └──────────┘      │ Goal    │
                                                           └────┬─────┘
                                                                │
                                                                ▼
     ┌──────────────────────────────────────────────────────────────┐
     │                     SUCCESS STATE                            │
     │  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   │
     │  │Dashboard│   │ Goals   │   │  Vaults  │   │ AI Panel│   │
     │  │ Overview│   │ Progress│   │ Positions│   │ Decisions│   │
     │  └──────────┘   └──────────┘   └──────────┘   └──────────┘   │
     └──────────────────────────────────────────────────────────────┘
```

**Step-by-Step:**

| Step | Screen | Actions |
|------|--------|---------|
| 1 | **Landing Page** | User sees value prop: "AI-powered savings" |
| 2 | **Connect Wallet** | User connects MetaMask/WalletConnect |
| 3 | **Risk Quiz** (optional) | 3 questions → risk profile assigned |
| 4 | **Create First Goal** | Natural language: "Save $10,000 for vacation in 2026" |
| 5 | **Deposit** | User funds their goal |
| 6 | **Dashboard** | View progress, AI decisions, vault positions |

---

### 2.2 Core User Journey

#### A. Create Goal (Natural Language)

```
User Input:
"$15,000 for a new car by December 2026"

    │
    ▼
┌─────────────────────────────────────────┐
│      AI Parses Goal (Backend)          │
├─────────────────────────────────────────┤
│  name:        "New Car"                 │
│  target:      $15,000                   │
│  deadline:    Dec 31, 2026              │
│  priority:    medium                    │
│  riskProfile: moderate                  │
│  liquidity:   flexible                  │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│   AI Recommends Vault Allocation        │
├─────────────────────────────────────────┤
│  Conservative:  70% USDC / 30% USDT    │
│  Moderate:      50% USDC / 30% ETH / 20%│
│  Aggressive:   40% ETH / 30% BTC / 30%  │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│      User Confirms & Deposits           │
│      → Multi-vault deposit executed     │
└─────────────────────────────────────────┘
```

#### B. AI Agent Monitoring (Automated)

```
┌─────────────────────────────────────────────────────────────────┐
│                    VIO AGENT LOOP (Every 15 min)                │
└─────────────────────────────────────────────────────────────────┘

                    ┌──────────────┐
                    │ 1. SENSE     │
                    │ - Fetch vault│
                    │   APYs       │
                    │ - Check goal │
                    │   progress   │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ 2. PLAN      │
                    │ - Compare    │
                    │   APYs       │
                    │ - Calculate  │
                    │   gas vs gain│
                    │ - Generate   │
                    │   decision   │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ 3. ACT       │
                    │ - If <$500:  │
                    │   auto-exec  │
                    │ - If >$500:  │
                    │   queue for  │
                    │   approval   │
                    └──────────────┘
```

**AI Decision Types:**

| Decision Type | Trigger | Action | Auto-Execute? |
|---------------|---------|--------|---------------|
| **Rebalance** | Better APY found | Move funds to higher-yield vault | Only if < $500 |
| **Deposit Suggestion** | Goal behind schedule | Suggest increased deposits | No (always approval) |
| **Risk Alert** | Vault risk increases | Warn user | No (alert only) |
| **Goal Achieved** | Target reached | Celebrate + suggest next goal | N/A |

---

### 2.3 Deposit Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        DEPOSIT FLOW                              │
└─────────────────────────────────────────────────────────────────┘

   ┌──────────┐      ┌──────────┐      ┌──────────┐
   │ Select   │ ───▶ │ Enter    │ ───▶ │ Preview  │
   │ Goal     │      │ Amount   │      │ Result   │
   └──────────┘      └──────────┘      └────┬─────┘
                                             │
                                             ▼
                                      ┌──────────────┐
                                      │ "You will   │
                                      │  receive    │
                                      │  9,804.23   │
                                      │  shares"     │
                                      └──────┬───────┘
                                             │
                                             ▼
   ┌──────────┐      ┌──────────┐      ┌──────────────┐
   │ Wallet   │ ◀─── │ Confirm  │ ◀─── │ Transaction  │
   │ Signing  │      │ Deposit  │      │ Submitted    │
   └──────────┘      └──────────┘      └──────────────┘
```

---

### 2.4 Withdraw Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                       WITHDRAW FLOW                              │
└─────────────────────────────────────────────────────────────────┘

   ┌──────────┐      ┌──────────┐      ┌──────────┐
   │ Select   │ ───▶ │ Enter    │ ───▶ │ Preview  │
   │ Goal     │      │ Shares/  │      │ Result   │
   │          │      │ Amount   │      │          │
   └──────────┘      └──────────┘      └────┬─────┘
                                             │
                                             ▼
                                      ┌──────────────┐
                                      │ "You will   │
                                      │  receive    │
                                      │  $5,230.50  │
                                      │  (+ $230    │
                                      │   yield)"   │
                                      └──────┬───────┘
                                             │
   ┌──────────┐      ┌──────────┐      ┌─────▼──────┐
   │ Wallet   │ ◀─── │ Confirm  │ ◀─── │ Transaction│
   │ Signing  │      │ Withdraw │      │ Submitted  │
   └──────────┘      └──────────┘      └────────────┘
```

---

## 3. Key Features

### 3.1 Consumer Savings App

| Feature | Description |
|---------|-------------|
| **Natural Language Goals** | "Save $X for Y by Z" — no forms to fill |
| **Multi-Vault Deposits** | One click deposits to multiple vaults |
| **Goal Progress Tracking** | Visual progress bars, timeline estimates |
| **Emergency Exit** | One-click withdraw everything |
| **Transaction History** | Full history of deposits, withdrawals, yields |

### 3.2 AI-Powered Yield Agent (Vio)

| Feature | Description |
|---------|-------------|
| **Opportunity Scanning** | Checks APY changes every 15 minutes |
| **Auto-Rebalancing** | Moves funds to better vaults (with approval) |
| **Goal Tracking** | Alerts when behind schedule |
| **Plain English Explanations** | Every decision explained in simple terms |
| **Approval-Gated** | AI never moves money without user say-so |

### 3.3 Portfolio Dashboard

| Widget | Data Shown |
|--------|------------|
| **Net Worth** | Total value across all goals + DeFi positions |
| **Goals Overview** | Progress bars for each goal |
| **Vault Positions** | Current allocation per vault |
| **Yield Earned** | Total yield generated, current APY |
| **AI Decisions** | Pending approvals, decision history |

### 3.4 Mobile-First UX

| Aspect | Implementation |
|--------|----------------|
| **Responsive Layout** | Single column on mobile, multi-column desktop |
| **Touch-Friendly** | Large tap targets (48px minimum) |
| **Bottom Navigation** | Fixed bottom bar on mobile |
| **Pull-to-Refresh** | Refresh data on mobile |
| **Skeleton Loading** | Show placeholders while loading |
| **Toast Notifications** | Non-blocking success/error messages |

---

## 4. Architecture

### 4.1 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Astro + React (responsive, not native) |
| **Wallet** | Wagmi + WalletConnect |
| **Backend** | Node.js + Express |
| **Smart Contract** | Solidity (Foundry) |
| **Blockchain** | Base (EVM) |
| **Yield Protocol** | YO Protocol (ERC-4626) |
| **Automation** | Chainlink Automation |

### 4.2 Data Flow

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  Frontend   │◀───────▶│  Backend    │◀───────▶│  YO SDK     │
│  (React)    │  HTTP   │  (Express)  │  SDK    │  (Read)     │
└─────────────┘         └──────┬──────┘         └─────────────┘
        │                      │
        │                      │ On-chain
        │                      ▼
        │              ┌───────────────┐
        │              │  VyoRouter    │
        │              │  (Contract)   │
        │              └───────┬───────┘
        │                      │
        ▼                      ▼
┌─────────────┐         ┌─────────────┐
│  User       │         │  YO Vaults  │
│  Wallet     │         │  (ERC-4626) │
└─────────────┘         └─────────────┘
```

---

## 5. YO SDK Usage

### What We Use

| Method | Purpose |
|--------|---------|
| `getVaults()` | Display available vaults |
| `getVaultSnapshot()` | Real-time APY display |
| `getUserPosition()` | User's vault positions |
| `prepareDeposit()` | Build deposit transaction |
| `prepareRedeem()` | Build withdraw transaction |
| `previewDeposit()` | Show expected shares before deposit |
| `previewRedeem()` | Show expected assets before withdraw |
| `getPrices()` | Convert values to USD |

---

## 6. Chainlink Automation

### What's Automated

| Automation | Trigger | Frequency |
|------------|---------|-----------|
| **Yield Compounding** | Every 7 days | Weekly |
| **Auto-Rebalance** | APY diff > 2% | When triggered |
| **Goal Progress Check** | Every 1 day | Daily |
| **Emergency Monitor** | Vault TVL drops > 20% | When triggered |

### How It Works

```
1. User enables automation on a goal
2. Backend registers upkeep with Chainlink
3. Chainlink nodes call checkUpkeep() periodically
4. If conditions met, performUpkeep() executes on-chain
5. User notified of action taken
```

---

## 7. API Endpoints

### Goals
- `GET /api/goals` — List user's goals
- `POST /api/goals` — Create goal (natural language)
- `GET /api/goals/:id` — Get goal details
- `PUT /api/goals/:id` — Update goal
- `DELETE /api/goals/:id` — Delete goal

### Transactions
- `POST /api/transactions/deposit` — Deposit to vault(s)
- `POST /api/transactions/redeem` — Withdraw from vault(s)
- `GET /api/transactions/history` — Transaction history

### Vaults
- `GET /api/vaults` — List available vaults
- `GET /api/vaults/:id` — Vault details

### AI (Vio Agent)
- `GET /api/ai/decisions` — Decision history
- `POST /api/ai/decisions/:id/approve` — Approve decision
- `POST /api/ai/decisions/:id/reject` — Reject decision

### Dashboard
- `GET /api/dashboard` — Aggregated portfolio data

---

## 8. Contract Functions (VyoRouter.sol)

### Goal Management
```solidity
function createGoal(name, targetAmount, deadline, riskLevel, vaults, percentages)
function getUserGoals(user) → Goal[]
function getGoalAllocations(goalId) → VaultAllocation[]
```

### Deposits
```solidity
function batchDeposit(goalId, vaults[], amounts[], totalAmount)
function depositToVault(vault, amount, goalId)
```

### Withdrawals
```solidity
function batchRedeem(goalId, vaults[], shares[])
function emergencyExit(goalId)  // Panic button
```

### AI Agent
```solidity
function approveAgent(agent, spendLimit, maxDailySpend)
function revokeAgent(agent)
function agentRebalance(user, goalId, fromVault, toVault, shares)
```

### Automation (New)
```solidity
function checkUpkeep(bytes) → (bool, bytes)
function performUpkeep(bytes)
function setAutomationConfig(goalId, autoCompound, autoRebalance, ...)
function compoundYield(goalId)
```

---

## 9. Screen Wireframes (Text)

### Mobile Layout (Bottom Navigation)

```
┌─────────────────────────┐
│      Header Bar         │
│   Vyo Apps    [Connect] │
├─────────────────────────┤
│                         │
│    ┌───────────────┐    │
│    │   Net Worth   │    │
│    │   $12,450.00  │    │
│    │   +$230 (2%) │    │
│    └───────────────┘    │
│                         │
│    ┌───────────────┐    │
│    │ Goal Progress │    │
│    │ [====    ] 40%│    │
│    │ Emergency Fund│    │
│    │ $4,000/$10k  │    │
│    └───────────────┘    │
│                         │
│    ┌───────────────┐    │
│    │ AI Decisions │    │
│    │ 🔔 Rebalance? │    │
│    │ [View All]    │    │
│    └───────────────┘    │
│                         │
├─────────────────────────┤
│  🏠  💰  🤖  ⚙️       │
│Home Goals AI Settings  │
└─────────────────────────┘
```

### Desktop Layout (Sidebar)

```
┌──────────────────────────────────────────────────────────────┐
│  Logo   │  Net Worth: $12,450    │  [Connect Wallet]        │
├─────────┴───────────────────────────────────────────────────┤
│         │                                                      │
│ [Icons] │   ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│         │   │ Goals   │ │ Vaults   │ │ AI Panel │           │
│ 🏠 Home │   │    3    │ │    5     │ │  2 pend  │           │
│ 💰 Goals│   └──────────┘ └──────────┘ └──────────┘           │
│ 🏦 Vault│                                                      │
│ 🤖 AI   │   ┌──────────────────────────────────────────┐     │
│ ⚙️ Set  │   │         Goal Cards Grid                  │     │
│         │   │  ┌─────────┐  ┌─────────┐  ┌─────────┐   │     │
│         │   │  │Emergency│  │ Vacation│  │  Car   │   │     │
│         │   │  │ Fund    │  │ Fund    │  │        │   │     │
│         │   │  │[====  ] │  │[==    ] │  │[=     ]│   │     │
│         │   │  │ $4,000  │  │ $2,500  │  │ $500   │   │     │
│         │   │  └─────────┘  └─────────┘  └─────────┘   │     │
│         │   └──────────────────────────────────────────┘     │
└─────────┴────────────────────────────────────────────────────┘
```

---

## 10. Success Metrics

| Metric | Target |
|--------|--------|
| Goals Created | 1000+ |
| Total Value Locked | $1M+ |
| Average APY Earned | 5%+ |
| User Retention (30d) | 60%+ |
| AI Decisions Approved | 80%+ |

---

*Document Version: 1.0*
*Last Updated: 2026-03-17*
