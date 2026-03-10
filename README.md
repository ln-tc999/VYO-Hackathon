# Vyo Apps 🤖💰

> AI-Powered DeFi Yield Optimizer — Set your goals once. Vyo Apps handles the rest.

Vyo Apps is an intelligent personal financial operating system that unifies traditional savings, DeFi yield, and AI automation in a single dashboard.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Stack](https://img.shields.io/badge/stack-Astro%20%2B%20Express%20%2B%20YO%20SDK-purple)

---

## ✨ Features

- **🎯 Goal-Based Savings** — Create savings goals using natural language (e.g., "Save $15,000 for a new car by December 2026")
- **🤖 Vio Agent AI** — Autonomous yield optimizer that monitors APY changes and suggests rebalancing
- **📊 Unified Dashboard** — View your total net worth across TradFi banks and DeFi vaults
- **🔄 Multi-Vault Deposits** — Automatically split deposits across multiple YO Protocol vaults based on your risk profile
- **📝 Decision Transparency** — Every AI action is logged with plain-English explanations
- **🔒 Approval-Gated** — AI never moves money without your explicit approval
- **🚨 Emergency Withdraw** — One-click exit to stablecoins in case of emergencies

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Astro |
| Backend | Node.js + Express |
| Blockchain | YO SDK (Base / Arbitrum / Ethereum) |
| API | REST |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/ln-tc999/VYO-Hackathon.git
cd VYO-Hackathon

# Install dependencies
pnpm install

# Start development servers
pnpm dev
```

This will start:
- Frontend: http://localhost:4321
- Backend: http://localhost:3000

### Environment

Create a `.env` file in the root (optional for hackathon demo):

```env
PORT=3000
YO_API_URL=https://api.yoprotocol.io
```

---

## 🧪 Demo Checklist

These flows work end-to-end:

- [x] Create a goal via natural language text input
- [x] Execute deposit to **multiple YO vaults simultaneously**
- [x] Display AI rebalancing suggestion with reasoning
- [x] Show unified dashboard (TradFi balance + DeFi vault positions)
- [x] Withdrawal/redeem flow from a vault
- [x] AI decision transparency log

---

## 📁 Project Structure

```
VYO-Hackathon/
├── frontend/                  # Astro web app
│   ├── src/
│   │   ├── pages/             # Dashboard pages
│   │   │   ├── dashboard/     # Main app routes
│   │   │   ├── landing/       # Landing page
│   │   │   └── index.astro   # Landing page
│   │   ├── layouts/           # Page layouts
│   │   └── styles/            # Global CSS
│   └── astro.config.mjs
├── backend/                   # Express API
│   └── src/
│       ├── routes/            # API endpoints
│       │   ├── goals.ts       # Goal CRUD + NLP
│       │   ├── transactions.ts # Deposit/Redeem
│       │   ├── ai.ts          # Vio Agent decisions
│       │   ├── vaults.ts      # Vault listings
│       │   └── dashboard.ts   # Aggregated data
│       ├── services/
│       │   ├── yo-sdk/        # YO Protocol integration
│       │   └── ai/            # Vio Agent logic
│       └── models/            # In-memory store
├── shared/
│   └── types/                 # Shared TypeScript types
└── README.md
```

---

## 🔌 API Endpoints

### Goals
- `GET /api/goals` — List user's goals
- `POST /api/goals` — Create goal (supports natural language)

### Transactions
- `POST /api/transactions/deposit` — Deposit to goal (multi-vault)
- `POST /api/transactions/redeem` — Withdraw from vault

### AI (Vio Agent)
- `GET /api/ai/decisions` — Decision transparency log
- `POST /api/ai/rebalance` — Trigger AI scan
- `POST /api/ai/decisions/:id/approve` — Approve recommendation
- `POST /api/ai/decisions/:id/reject` — Dismiss recommendation

### Dashboard
- `GET /api/dashboard` — Aggregated net worth + stats

---

## 🤖 Vio Agent AI

Vio Agent runs autonomously in the background:

1. **Opportunity Scan** — Daily check for better APY rates
2. **Risk Scan** — Continuous monitoring of vault risk scores
3. **Goal Tracking** — Weekly progress assessment
4. **Gas Check** — Optimizes transaction timing

All actions require user approval before execution.

---

## 📜 License

MIT

---

Built with ❤️ for the YO SDK Hackathon
