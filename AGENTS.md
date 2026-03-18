# AGENTS.md — Developer Guide for Vyo Apps

This file provides guidance for AI agents working on the Vyo Apps codebase.

---

## 1. Project Overview

Vyo Apps is an AI-Powered DeFi Yield Optimizer built with:
- **Frontend**: Astro + React + Wagmi/Web3
- **Backend**: Node.js + Express
- **Smart Contracts**: Solidity (Foundry)
- **Blockchain**: Base (EVM)
- **Yield Protocol**: YO Protocol (ERC-4626)
- **Automation**: Chainlink Automation
- **Package Manager**: pnpm
- **Monorepo**: Turbo

---

## 2. Build, Lint, and Test Commands

### Root Commands (from repository root)

```bash
# Install dependencies
pnpm install

# Development
pnpm dev                  # Start all services (frontend + backend)
pnpm dev:frontend         # Frontend only (Astro on port 4321)
pnpm dev:backend          # Backend only (Express on port 3001)

# Build
pnpm build                # Build all packages
pnpm build:frontend       # Build Astro app
pnpm build:backend        # Build Express server
pnpm build:contracts      # Build Solidity contracts

# Testing
pnpm test                 # Run all tests (contracts only currently)
pnpm test:contracts       # Run Forge tests

# Type Checking
pnpm type-check           # Type-check all packages

# Cleaning
pnpm clean                # Remove all build artifacts
```

### Frontend (./frontend)

```bash
pnpm --filter @wealthos/frontend dev          # Dev server
pnpm --filter @wealthos/frontend build        # Production build
pnpm --filter @wealthos/frontend type-check   # Astro check
pnpm --filter @wealthos/frontend clean        # Remove dist/.astro
```

### Backend (./backend)

```bash
pnpm --filter @wealthos/backend dev           # Dev with tsx watch
pnpm --filter @wealthos/backend build         # TypeScript build
pnpm --filter @wealthos/backend start         # Run production server
pnpm --filter @wealthos/backend type-check    # tsc --noEmit
```

### Contracts (./contracts)

```bash
# Run a single test (Foundry)
forge test --match-test TestFunctionName

# Run tests matching a pattern
forge test --match-path "test/Vault*.sol"

# Format Solidity
forge fmt

# Check formatting without modifying
forge fmt --check

# Deploy to Base Sepolia
forge script script/Deploy.s.sol:DeployVyoRouter --rpc-url https://sepolia.base.org --broadcast --verify
```

**Note**: Frontend and backend packages currently have no linting configured. Use TypeScript strict mode for code quality.

---

## 3. Code Style Guidelines

### General

- **Language**: TypeScript (strict mode enabled)
- **Module System**: ES Modules with `.js` extension in imports
- **Target**: ES2022
- **Formatter**: No automatic formatter configured; maintain consistent indentation

### TypeScript Configuration

```json
{
    "compilerOptions": {
        "target": "ES2022",
        "module": "node16",
        "moduleResolution": "node16",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true
    }
}
```

### Imports

**Backend (Express)**:
```typescript
// Import Express router and utilities
import { Router } from 'express';

// Import shared types
import type { Goal, VaultAllocation } from '../../../shared/types/index.js';

// Import local modules with .js extension
import { getStore } from '../models/store.js';
```

**Frontend (React/Astro)**:
```typescript
// React hooks
import { useState, useEffect } from 'react';

// Wagmi
import { useAccount, useWriteContract } from 'wagmi';

// Contract hooks
import { useUserGoals, useBatchDeposit } from './lib/hooks.js';
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files (TS) | kebab-case | `vault-positions.tsx`, `vio-agent.ts` |
| Files (Components) | PascalCase | `ConnectWalletButton.tsx` |
| Variables | camelCase | `userId`, `currentBalance` |
| Constants | camelCase | `maxDeadline`, `defaultPriority` |
| Types/Interfaces | PascalCase | `Goal`, `VaultAllocation` |
| Enums | PascalCase | `RiskProfile`, `LiquidityNeeds` |
| Functions | camelCase | `parseNaturalLanguageGoal()` |
| Routes | kebab-case | `/api/goals`, `/api/ai/decisions` |

### Error Handling

**Express Routes**:
```typescript
// Return 404 for not found
if (!goal) {
    res.status(404).json({ success: false, error: 'Goal not found' });
    return;
}

// Return proper error responses
res.status(400).json({ success: false, error: 'Invalid input' });
```

**Frontend**:
```typescript
// Handle async errors
try {
    const response = await fetch('/api/goals');
    if (!response.ok) {
        throw new Error('Failed to fetch goals');
    }
    const data = await response.json();
} catch (error) {
    console.error('[GOALS] Error:', error);
}
```

### Response Format

All API responses follow this structure:
```typescript
// Success
{ success: true, data: <payload> }

// Error
{ success: false, error: 'Error message' }
```

### Code Organization

**Backend**:
```
backend/src/
├── index.ts                    # Entry point
├── routes/                     # API route handlers
│   ├── goals.ts
│   ├── vaults.ts
│   ├── transactions.ts         # Deposit/Redeem + Preview APIs
│   └── ai.ts
├── services/
│   ├── ai/
│   │   ├── vioAgent.ts
│   │   └── decisionEngine.ts
│   ├── yo-sdk/
│   │   └── client.ts          # YO SDK wrapper
│   ├── automation/
│   │   ├── chainlink.ts        # Chainlink integration
│   │   └── monitor.ts          # Automation monitor
│   └── contracts/
│       └── vyoRouter.ts        # Contract wrapper
├── middleware/
├── models/
│   └── store.ts
└── jobs/
    └── vioLoop.ts
```

**Frontend**:
```
frontend/src/
├── pages/                     # Astro pages
├── components/                # React components
├── lib/
│   ├── wallet.ts             # Wagmi config
│   ├── abi.ts               # Contract ABIs
│   └── hooks.ts              # Contract interaction hooks
└── stores/
```

### Solidity (Contracts)

- Use Foundry for development
- Follow OpenZeppelin conventions
- Run `forge fmt` before committing
- Test thoroughly with `forge test`

### Comments

The codebase uses section headers in files:
```typescript
// ============================================================
// Goals API — CRUD + natural language goal creation
// ============================================================

// WEALTHCOACH: Indicates AI-related logic
const parsed = parseNaturalLanguageGoal(input);
```

Add comments for:
- Complex business logic
- AI-related operations (prefix with `WEALTHCOACH:` or `VIO:`)
- Non-obvious workarounds

---

## 4. Deployment Info

### Deployed Contracts

| Contract | Network | Address |
|---------|---------|---------|
| VyoRouter | Base Sepolia | `0x94B98209622EF89426dA8FCCa73BeA096AA43Ff5` |
| USDC | Base Sepolia | `0x036cBd53842c5426634E92B0C9D5eb112A4E1d4d` |

**Explorer**: https://sepolia.basescan.org/address/0x94B98209622EF89426dA8FCCa73BeA096AA43Ff5

### YO Protocol (Mainnet Only)

**Note**: YO Protocol vaults are only available on Base Mainnet (NOT testnet). For real transactions, use Base Mainnet:

| Vault | Address |
|-------|---------|
| yoUSD | `0x0000000f2eb9f69274678c76222b35eec7588a65` |
| yoETH | `0x3a43aec53490cb9fa922847385d82fe25d0e9de7` |
| yoBTC | `0xbcbc8cb4d1e8ed048a6276a5e94a3e952660bcbc` |

---

## 5. YO SDK Integration

### Available Methods

| Method | Description |
|--------|-------------|
| `getVaults()` | Get all available vaults |
| `getVaultDetails(id)` | Get specific vault info |
| `getVaultSnapshot(addr)` | Real-time APY, TVL |
| `getUserPosition(addr, user)` | User's position in vault |
| `previewDeposit(addr, amount)` | Preview shares before deposit |
| `previewRedeem(addr, shares)` | Preview assets before redeem |
| `buildDepositWithApproval()` | Build deposit + approve tx |
| `buildRedeemWithApproval()` | Build redeem + approve tx |
| `getTokenPrices()` | ETH, USDC, USDT, DAI prices |
| `getClaimableRewards()` | Merkl rewards |

### Usage

```typescript
import { yoService } from '../services/yo-sdk/client.js';

// Get vaults
const vaults = await yoService.getVaults();

// Preview deposit
const shares = await yoService.previewDeposit(vaultAddress, amount);

// Build transaction for wallet
const { transactions, preview } = await yoService.buildDepositWithApproval(
    vaultAddress,
    amount,
    userAddress
);
```

---

## 6. Chainlink Automation

### Contract Functions

```solidity
// Configure automation
setAutomationConfig(
    goalId,
    true,   // autoCompound
    false,  // autoRebalance
    7,       // compound every 7 days
    200,    // 2% threshold
    10e6    // min $10 to compound
);

// Trigger compound manually
compoundYield(goalId);

// Check automation status
getAutomationConfig(goalId);
```

### Backend Service

```typescript
import { createAutomationMonitorService } from '../services/automation/index.js';

const monitor = createAutomationMonitorService(routerAddress);

// Start monitoring
monitor.startMonitoring();

// Check specific goal
const decisions = await monitor.checkGoal(goalId);
```

---

## 7. Environment Variables

### Backend (.env)
```env
PORT=3001
YO_CHAIN_ID=84532
DEV_MODE=mock
VYOROUTER_ADDRESS=0x94B98209622EF89426dA8FCCa73BeA096AA43Ff5
CHAINLINK_REGISTRY_ADDRESS=0x...
```

### Frontend (.env.local)
```env
PUBLIC_WALLET_CONNECT_PROJECT_ID=your-project-id
PUBLIC_CHAIN_ID=84532  # Base Sepolia
```

---

## 8. Key Files and Locations

| Purpose | Path |
|---------|------|
| Shared Types | `shared/types/index.ts` |
| API Routes | `backend/src/routes/*.ts` |
| YO SDK Service | `backend/src/services/yo-sdk/client.ts` |
| Automation Services | `backend/src/services/automation/*.ts` |
| Contract Wrapper | `backend/src/services/contracts/vyoRouter.ts` |
| Wallet Config | `frontend/src/lib/wallet.ts` |
| Contract Hooks | `frontend/src/lib/hooks.ts` |
| Smart Contract | `contracts/src/VyoRouter.sol` |

---

## 9. Development Workflow

1. **Start dev servers**: `pnpm dev`
2. **Frontend**: http://localhost:4321
3. **Backend API**: http://localhost:3001
4. **Make changes** in appropriate package
5. **Type-check**: `pnpm type-check`
6. **Deploy contracts**: `cd contracts && forge script script/Deploy.s.sol:DeployVyoRouter --rpc-url https://sepolia.base.org --broadcast --verify`

---

## 10. Testing Notes

- **Contracts**: Use `forge test` — supports `--match-test` for single tests
- **Frontend/Backend**: No test framework currently configured
- Add tests when implementing new features

---

## 11. Common Issues

- **Module resolution**: Always use `.js` extension for local imports in TypeScript
- **WalletConnect**: Requires project ID in environment variables
- **Chain configuration**: Currently uses Base Sepolia testnet (84532)
- **No database**: Backend is stateless; data stored in-memory
- **YO Protocol**: Only available on Base Mainnet, not testnet

---

## 12. API Endpoints

### Transactions (with Preview)
```
POST /api/transactions/preview-deposit   # Preview deposit result
POST /api/transactions/preview-redeem   # Preview redeem result
POST /api/transactions/build-deposit   # Build deposit tx for wallet
POST /api/transactions/build-redeem    # Build redeem tx for wallet
```

### Goals
```
GET    /api/goals         # List goals
POST   /api/goals         # Create goal
GET    /api/goals/:id     # Get goal
PUT    /api/goals/:id     # Update goal
DELETE /api/goals/:id     # Delete goal
```

### Vaults
```
GET /api/vaults           # List vaults
GET /api/vaults/:id       # Vault details
```

### AI
```
GET  /api/ai/decisions              # Decision history
POST /api/ai/decisions/:id/approve # Approve decision
POST /api/ai/decisions/:id/reject  # Reject decision
```
