# Vyo Apps — Frontend Agent Instructions

> **Role:** Frontend + Design Lead
> **Stack:** Astro, TailwindCSS, WalletConnect, TypeScript
> **AI Agent Name:** Vio Agent (WealthCoach UI persona)

---

## 🎯 Your Mission

Build the **consumer-facing interface** of Vyo Apps. Every screen you build must pass the "Sarah test":
> *"Would a 28-year-old product manager with zero DeFi background understand this screen in under 5 seconds?"*

If the answer is no — simplify.

---

## 📁 Your Folder Ownership

```
frontend/
├── src/
│   ├── pages/
│   │   ├── index.astro          # Landing / redirect
│   │   ├── onboarding/
│   │   │   ├── welcome.astro    # Step 1: Value prop
│   │   │   ├── connect.astro    # Step 2: Connect wallet/bank
│   │   │   ├── goal.astro       # Step 3: Create first goal
│   │   │   ├── risk.astro       # Step 4: Risk quiz
│   │   │   └── fund.astro       # Step 5: First deposit
│   │   ├── dashboard/
│   │   │   ├── index.astro      # Main dashboard
│   │   │   ├── goals/
│   │   │   │   ├── index.astro  # All goals list
│   │   │   │   └── [id].astro   # Single goal detail
│   │   │   ├── vaults/
│   │   │   │   └── index.astro  # Vault browser
│   │   │   └── ai/
│   │   │       └── index.astro  # Vio Agent AI chat + decision log
│   │   └── settings/
│   │       └── index.astro      # Profile, risk, connections
│   ├── components/
│   │   ├── onboarding/
│   │   │   ├── GoalWizard.tsx       # Natural language goal input
│   │   │   ├── RiskQuiz.tsx         # 5-question risk profiler
│   │   │   └── ConnectAccounts.tsx  # Wallet + bank connect
│   │   ├── goals/
│   │   │   ├── GoalCard.tsx         # Progress bar + yield highlight
│   │   │   ├── GoalList.tsx         # Grid of goal cards
│   │   │   ├── MilestoneToast.tsx   # 25/50/75/100% celebration
│   │   │   └── ScenarioSimulator.tsx # "What if +$100/month?"
│   │   ├── vaults/
│   │   │   ├── VaultCard.tsx        # APY, TVL, risk badge, lockup
│   │   │   ├── VaultComparison.tsx  # Side-by-side table
│   │   │   └── AllocationHeatmap.tsx # Visual vault distribution
│   │   ├── ai/
│   │   │   ├── RebalanceModal.tsx   # Approve/Dismiss rebalance
│   │   │   ├── DecisionLog.tsx      # All AI actions + reasoning
│   │   │   ├── Vio AgentChat.tsx         # Natural language AI chat
│   │   │   └── InsightCard.tsx      # Dashboard AI tip card
│   │   ├── dashboard/
│   │   │   ├── NetWorthCard.tsx     # Total balance hero number
│   │   │   ├── YieldSummary.tsx     # Earned this month/year
│   │   │   ├── AssetBreakdown.tsx   # TradFi vs DeFi pie chart
│   │   │   └── ActionCenter.tsx     # Pending approvals widget
│   │   └── shared/
│   │       ├── Button.tsx
│   │       ├── Badge.tsx            # Risk level: Low/Med/High
│   │       ├── ProgressBar.tsx
│   │       ├── GasEstimate.tsx      # Always show before tx
│   │       └── PanicButton.tsx      # Emergency exit — always visible
│   ├── layouts/
│   │   ├── DashboardLayout.astro
│   │   └── OnboardingLayout.astro
│   ├── stores/
│   │   ├── goalStore.ts             # Nanostores for goal state
│   │   ├── walletStore.ts           # Connected wallet state
│   │   └── aiStore.ts               # Pending AI decisions
│   ├── lib/
│   │   ├── api.ts                   # All backend API calls
│   │   ├── wallet.ts                # WalletConnect helpers
│   │   └── format.ts                # Currency, % formatters
│   └── styles/
│       └── global.css
```

---

## 🎨 Design System

### Color Palette
```css
/* Primary — Trust + Tech */
--vyo-primary:     #6366F1;  /* Indigo — main actions */
--vyo-primary-dark:#4F46E5;  /* Hover state */

/* Semantic */
--vyo-success:     #10B981;  /* Yield positive, goals on track */
--vyo-warning:     #F59E0B;  /* Risk alerts, off-track goals */
--vyo-danger:      #EF4444;  /* Risk high, emergency */
--vyo-neutral:     #6B7280;  /* Secondary text */

/* Background */
--vyo-bg:          #0F0F1A;  /* Dark base */
--vyo-surface:     #1A1A2E;  /* Cards */
--vyo-border:      #2D2D44;  /* Subtle borders */
```

### Typography
```css
/* Headlines: Inter or Plus Jakarta Sans */
/* Body: Inter */
/* Numbers/Data: JetBrains Mono (monospace for $ amounts) */
```

### Risk Badge Colors
```tsx
const riskColor = {
  low:    'bg-green-500/20 text-green-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  high:   'bg-red-500/20 text-red-400',
}
```

---

## 🖥️ Key Screen Specs

### 1. Dashboard (Main Screen)
Layout priority — top to bottom:
```
┌─────────────────────────────────┐
│  👋 Good morning, Sarah         │
│  Net Worth: $12,450.00  ↑2.3%  │  ← HERO NUMBER (biggest element)
├─────────────────────────────────┤
│  🤖 Vio Agent: "You're on track!    │  ← AI insight card (dismissible)
│  Deposit $50 more to finish    │
│  1 month early."               │
├─────────────────────────────────┤
│  GOALS                          │
│  [🏠 House DP    67% ████░░]   │
│  [🚗 New Car     34% ███░░░]   │
│  [💰 Emergency   91% █████░]   │
├─────────────────────────────────┤
│  THIS MONTH                     │
│  Yield earned: +$47.20         │
│  vs Bank savings: +$0.83       │  ← Always show comparison
├─────────────────────────────────┤
│  ⚡ ACTION NEEDED               │
│  [Review Rebalance Suggestion] │  ← Pending approvals
└─────────────────────────────────┘
```

### 2. Goal Creation Wizard
```
Step 1: Natural language input
  "Describe your goal..."
  → Parse with Vio Agent AI → Auto-fill form fields

Step 2: Confirm parameters
  Target: $15,000
  Deadline: 24 months
  Monthly needed: $625

Step 3: AI strategy suggestion
  "Conservative mix recommended"
  [Show vault allocation breakdown]

Step 4: Fund it
  Amount: [    ]
  From: [Wallet ▼]
  Auto-deposit: [Monthly ▼] [$625]
  [Start Saving →]
```

### 3. Rebalance Approval Modal
```
┌──────────────────────────────────┐
│  🤖 Vio Agent suggests a rebalance    │
│                                  │
│  FROM: YO Conservative Vault    │
│        $400 @ 4.5% APY          │
│                                  │
│  TO:   YO Growth Vault          │
│        $400 @ 6.2% APY          │
│                                  │
│  WHY:  APY is 1.7% higher with  │
│        similar risk score (Low) │
│                                  │
│  GAIN: +$6.80/month             │
│  GAS:  ~$1.20 (recouped in 6d) │
│                                  │
│  [✓ Approve] [✗ Dismiss]       │
│  [Learn More]                   │
└──────────────────────────────────┘
```

---

## 🔌 API Calls (lib/api.ts)

All backend calls go through this single file. **Wallet address is sent in header** — no JWT needed:

```typescript
const BASE = import.meta.env.PUBLIC_API_URL;

// Get wallet from IndexedDB session
async function getWalletHeader() {
  const session = await getWalletSession();
  return { 'X-Wallet-Address': session?.address || '' };
}

// Goals
export const getGoals = async () => {
  const headers = await getWalletHeader();
  return fetch(`${BASE}/goals`, { headers }).then(r => r.json());
};

export const createGoal = async (data: CreateGoalInput) => {
  const headers = await getWalletHeader();
  return fetch(`${BASE}/goals`, { 
    method: 'POST', 
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(data) 
  }).then(r => r.json());
};

// ... all other API calls follow same pattern
```

// Vaults
export const getVaults = () => fetch(`${BASE}/vaults`).then(r => r.json());

// AI / Vio Agent
export const getPendingDecisions = () => fetch(`${BASE}/ai/decisions/pending`).then(r => r.json());
export const approveDecision = (id: string) =>
  fetch(`${BASE}/ai/decisions/${id}/approve`, { method: 'POST' }).then(r => r.json());
export const dismissDecision = (id: string) =>
  fetch(`${BASE}/ai/decisions/${id}/dismiss`, { method: 'POST' }).then(r => r.json());
export const chatWithVio Agent = (message: string, history: Message[]) =>
  fetch(`${BASE}/ai/chat`, { method: 'POST', body: JSON.stringify({ message, history }) }).then(r => r.json());

// Dashboard
export const getNetWorth = () => fetch(`${BASE}/dashboard/networth`).then(r => r.json());
export const getYieldSummary = () => fetch(`${BASE}/dashboard/yield`).then(r => r.json());
```

---

## ⚡ State Management (Nanostores)

```typescript
// stores/goalStore.ts
import { atom, map } from 'nanostores';
import type { Goal } from '../../shared/types';

export const goals = atom<Goal[]>([]);
export const activeGoal = atom<Goal | null>(null);
export const isDepositing = atom<boolean>(false);

// stores/aiStore.ts
export const pendingDecisions = atom<AIDecision[]>([]);
export const isVio AgentThinking = atom<boolean>(false);
```

---

## 🔐 WalletConnect + IndexedDB Session

**No JWT, no SIWE, no sessions.** Just WalletConnect + IndexedDB for persistence.

### 1. Install dependencies

```bash
npm install @web3modal/wagmi wagmi viem idb
```

### 2. Wallet Config (lib/wallet.ts)

```typescript
import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi';
import { base, arbitrum } from 'wagmi/chains';
import { getAccount, watchAccount } from '@wagmi/core';
import { saveWalletSession, clearWalletSession } from './session';

const chains = [base, arbitrum];

export const wagmiConfig = defaultWagmiConfig({
  chains,
  projectId: import.meta.env.PUBLIC_WALLETCONNECT_ID,
  metadata: {
    name: 'Vyo Apps',
    description: 'Your intelligent financial OS',
    url: 'https://vyo.finance',
    icons: ['/logo.png'],
  },
});

// Watch for wallet changes and save to IndexedDB
export function initWalletWatcher() {
  watchAccount(wagmiConfig, {
    onChange(account) {
      if (account.address) {
        saveWalletSession(account.address, account.chainId);
      } else {
        clearWalletSession();
      }
    },
  });
}

// Open WalletConnect modal
export async function openWalletModal() {
  const modal = createWeb3Modal({ 
    wagmiConfig, 
    projectId: import.meta.env.PUBLIC_WALLETCONNECT_ID 
  });
  await modal.open();
}

// Get current wallet
export function getCurrentWallet() {
  return getAccount(wagmiConfig);
}
```

### 3. Session Storage (lib/session.ts)

```typescript
import { openDB } from 'idb';

const DB_NAME = 'vyo-session';
const STORE_NAME = 'wallet';

interface WalletSession {
  address: string;
  chainId: number;
  connectedAt: number;
}

export async function saveWalletSession(address: string, chainId: number) {
  const db = await openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME);
    },
  });
  await db.put(STORE_NAME, { 
    address, 
    chainId, 
    connectedAt: Date.now() 
  }, 'session');
}

export async function getWalletSession(): Promise<WalletSession | undefined> {
  const db = await openDB(DB_NAME, 1);
  return db.get(STORE_NAME, 'session');
}

export async function clearWalletSession() {
  const db = await openDB(DB_NAME, 1);
  await db.delete(STORE_NAME, 'session');
}

// Check if user is "logged in" (has wallet connected)
export async function isAuthenticated(): Promise<boolean> {
  const session = await getWalletSession();
  return !!session?.address;
}
```

### 4. Auth Guard Component

```typescript
// components/AuthGuard.tsx
import { useEffect, useState } from 'react';
import { isAuthenticated } from '../lib/session';

export function AuthGuard({ children }: { children: any }) {
  const [auth, setAuth] = useState<boolean | null>(null);

  useEffect(() => {
    isAuthenticated().then(setAuth);
  }, []);

  if (auth === null) return <div>Loading...</div>;
  if (!auth) {
    window.location.href = '/connect';
    return null;
  }
  return children;
}
```

### 5. Connect Page (pages/connect.astro)

```astro
---
// No server-side auth check — purely client-side
---

<div class="connect-page">
  <h1>Connect Your Wallet</h1>
  <p>Vyo Apps uses WalletConnect for secure, decentralized authentication.</p>
  <button id="connect-btn" class="btn btn-primary btn-lg">
    Connect Wallet
  </button>
</div>

<script>
  import { openWalletModal, initWalletWatcher } from '../lib/wallet';
  import { isAuthenticated } from '../lib/session';
  
  // Redirect if already connected
  isAuthenticated().then(auth => {
    if (auth) window.location.href = '/dashboard';
  });
  
  initWalletWatcher();
  
  document.getElementById('connect-btn')?.addEventListener('click', () => {
    openWalletModal();
  });
</script>
```

---

## 🚨 Non-Negotiable UI Rules

1. **Gas cost ALWAYS visible** before any transaction confirm button is enabled.
2. **Panic button** (`PanicButton.tsx`) must appear on every dashboard page — fixed bottom right.
3. **Loading states** — every API call needs skeleton loader, never blank screen.
4. **Optimistic updates** — update UI immediately, rollback if API fails.
5. **Plain English only** — no "APY delta", "rebalancing epoch", or DeFi jargon in UI copy.
6. **Mobile first** — design for 375px width, scale up.

---

## 📅 10-Day Sprint

| Hari | Deliverable |
|---|---|
| 1 | Design system setup, global CSS, shared components (Button, Badge, ProgressBar) |
| 2 | Onboarding flow: Welcome → Connect → Risk Quiz screens |
| 3 | Goal Creation Wizard with natural language input + Vio Agent parse |
| 4 | Dashboard layout: NetWorth hero, GoalCards, YieldSummary |
| 5 | Vault browser + VaultCard + VaultComparison |
| 6 | RebalanceModal + DecisionLog + InsightCard |
| 7 | Connect all screens to backend API (lib/api.ts) |
| 8 | Vio AgentChat component + AI transparency log screen |
| 9 | Milestone animations, polish, empty states, error states |
| 10 | Demo prep: seed data, rehearsal, final bug fixes |

---

## 🤝 Interfaces with Other Agents

- **Backend Agent** — consume REST endpoints defined in `AGENTS-BACKEND.md`
- **Blockchain Agent** — WalletConnect integration, show tx hash after deposit
- **SC Agent** — display batch deposit status (1 tx → 3 vaults confirmation)
