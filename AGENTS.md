# AGENTS.md — Developer Guide for Vyo Apps

This file provides guidance for AI agents working on the Vyo Apps codebase.

---

## 1. Project Overview

Vyo Apps is an AI-Powered DeFi Yield Optimizer built with:
- **Frontend**: Astro + React + Wagmi/Web3
- **Backend**: Node.js + Express
- **Shared**: TypeScript types
- **Contracts**: Solidity (Foundry)
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

# Deploy
forge script script/Deploy.s.sol
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

// Astro/Actions
import { actions } from 'astro:actions';

// Wagmi
import { useAccount, useWriteContract } from 'wagmi';
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
├── index.ts              # Entry point
├── routes/               # API route handlers
│   ├── goals.ts
│   ├── vaults.ts
│   └── transactions.ts
├── services/             # Business logic
│   ├── ai/
│   │   ├── vioAgent.ts
│   │   └── decisionEngine.ts
│   └── yo-sdk/
├── middleware/           # Express middleware
├── models/               # Data models/store
└── jobs/                 # Cron jobs
```

**Frontend**:
```
frontend/src/
├── pages/                # Astro pages
├── components/           # React components
├── layouts/              # Page layouts
├── lib/                  # Utilities (api.ts, wallet.ts)
└── stores/               # Nano stores
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

## 4. Environment Variables

### Backend (.env)
```env
PORT=3001
YO_API_URL=https://api.yoprotocol.io
```

### Frontend (.env.local)
```env
PUBLIC_WALLET_CONNECT_PROJECT_ID=your-project-id
PUBLIC_CHAIN_ID=84532  # Base Sepolia
```

---

## 5. Key Files and Locations

| Purpose | Path |
|---------|------|
| Shared Types | `shared/types/index.ts` |
| API Routes | `backend/src/routes/*.ts` |
| AI Services | `backend/src/services/ai/*.ts` |
| Wallet Config | `frontend/src/lib/wallet.ts` |
| Store/State | `backend/src/models/store.ts` |
| Solidity Contract | `contracts/src/VyoRouter.sol` |

---

## 6. Development Workflow

1. **Start dev servers**: `pnpm dev`
2. **Frontend**: http://localhost:4321
3. **Backend API**: http://localhost:3001
4. **Make changes** in appropriate package
5. **Type-check**: `pnpm type-check`
6. **Test contracts**: `pnpm test:contracts`

---

## 7. Testing Notes

- **Contracts**: Use `forge test` — supports `--match-test` for single tests
- **Frontend/Backend**: No test framework currently configured
- Add tests when implementing new features

---

## 8. Common Issues

- **Module resolution**: Always use `.js` extension for local imports in TypeScript
- **WalletConnect**: Requires project ID in environment variables
- **Chain configuration**: Currently uses Base Sepolia testnet (84532)
- **No database**: Backend is stateless; data stored in-memory
