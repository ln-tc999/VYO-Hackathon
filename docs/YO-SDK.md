# YO SDK Integration Guide for Vyo Apps

> **Version:** 1.0 | **Chain Support:** Base (8453), Ethereum (1) | **Package:** `@yo-protocol/core` + `@yo-protocol/react`

---

## 📚 What is YO?

YO (Yield Optimizer) is a DeFi protocol that automatically moves funds across the best-performing pools to deliver the **highest risk-adjusted yield**. YO leverages [Exponential.fi's Risk Ratings](https://exponential.fi/learn/risk-rating) to balance risks and rewards.

**Key Features:**
- 🔄 **Auto-rebalancing** across multiple pools
- 🛡️ **Risk-rated** vaults (Low/Med/High risk)
- 💰 **ERC-4626** tokenized vault standard
- 🌉 **Gateway deposits** — deposit any supported asset with slippage protection
- ⛓️ **Multi-chain** — Base and Ethereum support

---

## 📦 Installation

```bash
# Core SDK (backend + vanilla JS)
npm install @yo-protocol/core viem

# React SDK (frontend with hooks)
npm install @yo-protocol/react @tanstack/react-query
```

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Vyo Apps Frontend                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Dashboard   │  │   Deposit    │  │   Withdraw       │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
└─────────┼─────────────────┼───────────────────┼────────────┘
          │                 │                   │
          ▼                 ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│              @yo-protocol/react (React Hooks)               │
│       useVault()  useDeposit()  useRedeem()                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
          ┌────────────────┴────────────────┐
          ▼                                 ▼
┌─────────────────────┐           ┌─────────────────────┐
│   YoClient (Core)   │           │   WagmiProvider     │
│  - Vault reads      │           │  - WalletConnect    │
│  - Actions          │           │  - Transaction      │
│  - API calls        │           │    signing          │
└──────────┬──────────┘           └─────────────────────┘
           │
     ┌─────┴──────┐
     ▼            ▼
┌─────────┐  ┌──────────┐
│YO Vaults│  │YO Gateway│
│Contract │  │ Contract │
└─────────┘  └──────────┘
```

---

## 🎯 Supported Vaults

| Vault | Symbol | Underlying | Chains | Risk Level | Typical APY |
|-------|--------|------------|--------|------------|-------------|
| **yoETH** | yoETH | WETH | Ethereum, Base | Medium | 3-8% |
| **yoUSD** | yoUSD | USDC | Base | Low | 4-7% |
| **yoBTC** | yoBTC | cbBTC | Base | Medium | 2-5% |
| **yoEUR** | yoEUR | EURC | Base | Low | 3-6% |
| **yoGOLD** | yoGOLD | XAUt | Ethereum | Low | 2-4% |
| **yoUSDT** | yoUSDT | USDT | Ethereum | Low | 4-7% |

**Risk Mapping for Vio Agent:**
- **Conservative** → yoUSD, yoEUR, yoGOLD, yoUSDT
- **Moderate** → yoETH (50%), yoUSD (30%), yoEUR (20%)
- **Aggressive** → yoETH (60%), yoBTC (30%), yoUSD (10%)

---

## 🔧 Core SDK Usage (@yo-protocol/core)

### 1. Initialize Client

```typescript
import { createYoClient, VAULTS } from '@yo-protocol/core'

// Backend or vanilla JS
const client = createYoClient({
  chainId: 8453, // Base mainnet
})

// With wallet for transactions
const clientWithWallet = createYoClient({
  chainId: 8453,
  walletClient, // viem wallet client
})
```

### 2. Read Vault State

```typescript
// Get on-chain vault info
const state = await client.getVaultState(VAULTS.yoUSD.address)
console.log({
  name: state.name,           // "YO USD Vault"
  totalAssets: state.totalAssets,  // Total TVL
  asset: state.asset,         // USDC address
  exchangeRate: state.exchangeRate,
})

// Get off-chain snapshot (APY, TVL)
const snapshot = await client.getVaultSnapshot(VAULTS.yoUSD.address)
console.log({
  apy: snapshot.apy,          // Current APY %
  tvl: snapshot.tvl,          // TVL in USD
  riskLevel: snapshot.riskLevel,
})
```

### 3. Preview Deposits/Redeems

```typescript
import { parseUnits, parseEther } from 'viem'

// How many shares will I get for 100 USDC?
const shares = await client.previewDeposit(
  VAULTS.yoUSD.address, 
  parseUnits('100', 6)
)

// How much USDC for 50 shares?
const assets = await client.previewRedeem(
  VAULTS.yoUSD.address,
  parseUnits('50', 6)
)

// Gateway-aware quotes (includes fees)
const gatewayShares = await client.quotePreviewDeposit(
  VAULTS.yoUSD.address,
  parseUnits('100', 6)
)
```

### 4. Execute Deposit

```typescript
// Simple deposit (requires prior approval)
const result = await client.deposit({
  vault: VAULTS.yoUSD.address,
  amount: parseUnits('100', 6),
  slippageBps: 50, // 0.5% slippage protection
})

console.log('Tx hash:', result.hash)
console.log('Shares received:', result.shares)

// Deposit with automatic approval
const result = await client.depositWithApproval({
  vault: VAULTS.yoUSD.address,
  token: VAULTS.yoUSD.asset, // USDC
  amount: parseUnits('100', 6),
  slippageBps: 50,
})

console.log('Approve tx:', result.approveHash) // undefined if not needed
console.log('Deposit tx:', result.depositHash)
```

### 5. Execute Redeem (Withdrawal)

```typescript
// Redeem shares for underlying
const result = await client.redeem({
  vault: VAULTS.yoUSD.address,
  shares: parseUnits('50', 6),
  slippageBps: 50,
})

console.log('Tx hash:', result.hash)
console.log('Assets received:', result.assets)

// Wait for confirmation
const receipt = await client.waitForRedeemReceipt(result.hash)
console.log('Instant:', receipt.instant) // true if immediate
console.log('Assets/RequestID:', receipt.assetsOrRequestId)
```

### 6. Get User Position

```typescript
// Check user's vault position
const position = await client.getUserPosition(
  VAULTS.yoUSD.address,
  userWalletAddress
)

console.log({
  shares: position.shares,
  assets: position.assets, // Current value in underlying
})

// Get token balance
const { balance, decimals } = await client.getTokenBalance(
  VAULTS.yoUSD.asset,
  userWalletAddress
)
```

---

## ⚛️ React SDK Usage (@yo-protocol/react)

### 1. Setup Providers

```tsx
// App.tsx or layout
import { WagmiProvider } from 'wagmi'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { YieldProvider } from '@yo-protocol/react'
import { wagmiConfig } from './lib/wallet'

const queryClient = new QueryClient()

function App({ children }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <YieldProvider>
          {children}
        </YieldProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

### 2. useVault Hook

```tsx
import { useVault } from '@yo-protocol/react'

function VaultCard() {
  const { vault, isLoading, error } = useVault('yoUSD')
  // or useVault('0x...') with address

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <h2>{vault?.name}</h2>
      <p>APY: {vault?.apy}%</p>
      <p>TVL: ${vault?.tvl}</p>
    </div>
  )
}
```

### 3. useDeposit Hook

```tsx
import { useDeposit } from '@yo-protocol/react'
import { parseUnits } from 'viem'

function DepositButton() {
  const {
    deposit,
    isPending,
    isSuccess,
    hash,
    error,
    reset,
  } = useDeposit({
    vault: 'yoUSD',
    slippageBps: 50,
    onSubmitted: (hash) => console.log('Submitted:', hash),
    onConfirmed: (hash) => console.log('Confirmed:', hash),
    onError: (err) => console.error('Error:', err),
  })

  const handleDeposit = () => {
    deposit(parseUnits('100', 6)) // 100 USDC
  }

  return (
    <div>
      <button onClick={handleDeposit} disabled={isPending}>
        {isPending ? 'Depositing...' : 'Deposit 100 USDC'}
      </button>
      
      {isSuccess && (
        <p>
          ✅ Deposited! 
          <a href={`https://basescan.org/tx/${hash}`}>View on Explorer</a>
        </p>
      )}
      
      {error && (
        <div>
          ❌ {error.message}
          <button onClick={reset}>Dismiss</button>
        </div>
      )}
    </div>
  )
}
```

### 4. useRedeem Hook

```tsx
import { useRedeem } from '@yo-protocol/react'

function RedeemButton({ shares }: { shares: bigint }) {
  const { redeem, isPending, isSuccess } = useRedeem({
    vault: 'yoUSD',
    slippageBps: 50,
  })

  return (
    <button onClick={() => redeem(shares)} disabled={isPending}>
      {isPending ? 'Withdrawing...' : 'Withdraw'}
    </button>
  )
}
```

### 5. useUserBalance Hook

```tsx
import { useUserBalance } from '@yo-protocol/react'

function UserPosition({ address }: { address: string }) {
  const { balance, isLoading } = useUserBalance({
    vault: 'yoUSD',
    address,
  })

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      <p>Your shares: {balance?.shares}</p>
      <p>Value: {balance?.assets} USDC</p>
    </div>
  )
}
```

### 6. useVaults Hook (List All)

```tsx
import { useVaults } from '@yo-protocol/react'

function VaultList() {
  const { vaults, isLoading } = useVaults()

  if (isLoading) return <div>Loading vaults...</div>

  return (
    <div>
      {vaults?.map(vault => (
        <VaultCard key={vault.address} vault={vault} />
      ))}
    </div>
  )
}
```

---

## 🔗 Vio Agent Integration Pattern

### Multi-Vault Deposit Strategy

```typescript
// services/yo/multi-deposit.ts
import { createYoClient, VAULTS } from '@yo-protocol/core'

interface VaultAllocation {
  vaultId: string
  percentage: number
}

export async function executeMultiVaultDeposit(
  allocations: VaultAllocation[],
  totalAmount: bigint,
  walletClient: any
) {
  const client = createYoClient({
    chainId: 8453,
    walletClient,
  })

  const results = []
  const errors = []

  // Execute deposits in parallel
  const depositPromises = allocations.map(async (alloc) => {
    const amount = (totalAmount * BigInt(alloc.percentage)) / 100n
    
    try {
      const result = await client.depositWithApproval({
        vault: alloc.vaultId,
        token: getUnderlyingToken(alloc.vaultId),
        amount,
        slippageBps: 50,
      })

      return {
        vaultId: alloc.vaultId,
        success: true,
        depositHash: result.depositHash,
        shares: result.shares,
      }
    } catch (err) {
      return {
        vaultId: alloc.vaultId,
        success: false,
        error: err.message,
      }
    }
  })

  const outcomes = await Promise.allSettled(depositPromises)
  
  return {
    totalDeposited: totalAmount,
    results: outcomes.map((outcome, i) => 
      outcome.status === 'fulfilled' 
        ? outcome.value 
        : { vaultId: allocations[i].vaultId, success: false, error: outcome.reason }
    ),
    succeeded: outcomes.filter(o => o.status === 'fulfilled' && o.value.success).length,
    failed: outcomes.filter(o => o.status === 'rejected' || !o.value?.success).length,
  }
}

function getUnderlyingToken(vaultId: string): string {
  const vaultMap: Record<string, string> = {
    [VAULTS.yoUSD.address]: VAULTS.yoUSD.asset,
    [VAULTS.yoETH.address]: VAULTS.yoETH.asset,
    [VAULTS.yoBTC.address]: VAULTS.yoBTC.asset,
    [VAULTS.yoEUR.address]: VAULTS.yoEUR.asset,
  }
  return vaultMap[vaultId]
}
```

---

## ⚠️ Error Handling

### Common Errors & Solutions

```typescript
// Error translator for user-friendly messages
function translateYOError(error: any): string {
  const errorMap: Record<string, string> = {
    'insufficient allowance': 'Please approve the vault to spend your tokens first.',
    'slippage exceeded': 'Price moved too much. Try again with higher slippage tolerance.',
    'ERC20: transfer amount exceeds balance': 'You don\'t have enough tokens for this transaction.',
    'user rejected': 'Transaction was cancelled.',
    'nonce too low': 'Please try again.',
  }

  const message = error?.message || error?.toString() || ''
  
  for (const [key, value] of Object.entries(errorMap)) {
    if (message.toLowerCase().includes(key.toLowerCase())) {
      return value
    }
  }

  return 'Something went wrong. Please try again.'
}
```

---

## 📊 YO REST API Reference

**Base URL:** `https://api.yo.xyz`

### Protocol-Level Endpoints

#### 1. Get Vault Snapshot
Current TVL, APY, underlying pools, and allocation.

```typescript
GET /api/v1/vault/{network}/{vaultAddress}

// Example
const response = await fetch(
  'https://api.yo.xyz/api/v1/vault/base/0x3a43aec53490cb9fa922847385d82fe25d0e9de7'
)
const data = await response.json()

// Response
{
  "data": {
    "address": "0x3a43...",
    "name": "YO USD Vault",
    "symbol": "yoUSD",
    "totalAssets": "123456789000000",
    "totalSupply": "123400000000000",
    "apy": 5.23,
    "tvl": 1234567.89,
    "riskLevel": "low",
    "underlyingPools": [
      { "name": "Aave V3 USDC", "allocation": 40 },
      { "name": "Compound V3 USDC", "allocation": 35 },
      { "name": "Morpho USDC", "allocation": 25 }
    ]
  },
  "message": "Success",
  "statusCode": 200
}
```

**Networks:** `base`, `ethereum`, `unichain`, `arbitrum`, `tac`, `plasma`, `hyperevm`

#### 2. Get Vault Yield Timeseries
Historical APY data for charts.

```typescript
GET /api/v1/vault/yield/timeseries/{network}/{vaultAddress}

// Example
const response = await fetch(
  'https://api.yo.xyz/api/v1/vault/yield/timeseries/base/0x3a43...'
)
const data = await response.json()

// Response - array of daily APY data
{
  "data": [
    { "date": "2024-01-01", "apy": 5.23 },
    { "date": "2024-01-02", "apy": 5.18 },
    // ...
  ]
}
```

#### 3. Get Vault TVL Timeseries
Historical TVL data for charts.

```typescript
GET /api/v1/vault/tvl/timeseries/{network}/{vaultAddress}

const response = await fetch(
  'https://api.yo.xyz/api/v1/vault/tvl/timeseries/base/0x3a43...'
)
```

#### 4. Get Pending Redeems (Total)
Check total pending redemption requests for a vault.

```typescript
GET /api/v1/vault/pending-redeems/{network}/{vaultAddress}

const response = await fetch(
  'https://api.yo.xyz/api/v1/vault/pending-redeems/base/0x3a43...'
)

// Response
{
  "data": {
    "raw": "123456789000000",
    "formatted": "123456.789"
  },
  "message": "Success",
  "statusCode": 200
}
```

### User-Level Endpoints

#### 5. Get User Transaction History
Deposits and withdrawals for a specific user.

```typescript
GET /api/v1/history/user/{network}/{vaultAddress}/{userAddress}?limit=50

// Example
const response = await fetch(
  `https://api.yo.xyz/api/v1/history/user/base/0x3a43.../${userAddress}?limit=20`
)

// Response
{
  "data": [
    {
      "type": "deposit",
      "amount": { "raw": "1000000000", "formatted": "1000" },
      "shares": { "raw": "995000000", "formatted": "995" },
      "txHash": "0xabc...",
      "timestamp": "2024-01-15T10:30:00Z"
    },
    {
      "type": "redeem",
      "amount": { "raw": "500000000", "formatted": "500" },
      "shares": { "raw": "497500000", "formatted": "497.5" },
      "txHash": "0xdef...",
      "timestamp": "2024-01-20T14:15:00Z"
    }
  ]
}
```

#### 6. Get User Pending Redemptions
Pending withdrawal requests for a specific user.

```typescript
GET /api/v1/vault/pending-redeems/{network}/{vaultAddress}/{userAddress}

const response = await fetch(
  `https://api.yo.xyz/api/v1/vault/pending-redeems/base/0x3a43.../${userAddress}`
)

// Response
{
  "data": {
    "assets": { "raw": "1000000000", "formatted": "1000" },
    "shares": { "raw": "995000000", "formatted": "995" }
  }
}
```

#### 7. Get User P&L (Profit & Loss)
Performance data for a user in a vault.

```typescript
GET /api/v1/performance/user/{network}/{vaultAddress}/{userAddress}

const response = await fetch(
  `https://api.yo.xyz/api/v1/performance/user/base/0x3a43.../${userAddress}`
)

// Response
{
  "data": {
    "totalDeposited": "10000",
    "totalWithdrawn": "2000",
    "currentValue": "8500",
    "profitLoss": "500",
    "profitLossPercentage": 5.0,
    "yieldEarned": "500"
  }
}
```

### API Helper Functions

```typescript
// frontend/src/lib/yo-api.ts

const API_BASE = 'https://api.yo.xyz'

interface ApiOptions {
  network?: 'base' | 'ethereum' | 'arbitrum'
}

export async function getVaultSnapshot(
  vaultAddress: string, 
  options: ApiOptions = { network: 'base' }
) {
  const response = await fetch(
    `${API_BASE}/api/v1/vault/${options.network}/${vaultAddress}`
  )
  if (!response.ok) throw new Error('Failed to fetch vault')
  return response.json()
}

export async function getYieldHistory(
  vaultAddress: string,
  options: ApiOptions = { network: 'base' }
) {
  const response = await fetch(
    `${API_BASE}/api/v1/vault/yield/timeseries/${options.network}/${vaultAddress}`
  )
  return response.json()
}

export async function getUserHistory(
  vaultAddress: string,
  userAddress: string,
  limit: number = 50,
  options: ApiOptions = { network: 'base' }
) {
  const response = await fetch(
    `${API_BASE}/api/v1/history/user/${options.network}/${vaultAddress}/${userAddress}?limit=${limit}`
  )
  return response.json()
}

export async function getUserPerformance(
  vaultAddress: string,
  userAddress: string,
  options: ApiOptions = { network: 'base' }
) {
  const response = await fetch(
    `${API_BASE}/api/v1/performance/user/${options.network}/${vaultAddress}/${userAddress}`
  )
  return response.json()
}
```

---

## 🤖 AI Agent Integration

YO provides **open-source agent skills** for AI coding assistants:

```bash
# Install YO Protocol skills for your AI agent
npx skills add yoprotocol/yo-protocol-skills --all
```

**GitHub:** https://github.com/yoprotocol/yo-protocol-skills

These skills give your AI agent full context on:
- SDK methods and parameters
- React hooks usage patterns
- CLI commands
- Best practices

### Vio Agent + YO Integration

```typescript
// services/ai/vio-yo-integration.ts

interface YOVaultData {
  address: string
  name: string
  apy: number
  tvl: number
  riskLevel: string
  underlyingPools: Array<{ name: string; allocation: number }>
}

export async function getVaultDataForVio(vaultAddress: string): Promise<YOVaultData> {
  const response = await fetch(
    `https://api.yo.xyz/api/v1/vault/base/${vaultAddress}`
  )
  const { data } = await response.json()
  
  return {
    address: data.address,
    name: data.name,
    apy: data.apy,
    tvl: data.tvl,
    riskLevel: data.riskLevel,
    underlyingPools: data.underlyingPools,
  }
}

// Vio Agent uses this to make rebalancing decisions
export async function compareVaults(vaultA: string, vaultB: string) {
  const [dataA, dataB] = await Promise.all([
    getVaultDataForVio(vaultA),
    getVaultDataForVio(vaultB),
  ])
  
  return {
    apyDifference: dataB.apy - dataA.apy,
    riskComparison: `${dataA.riskLevel} → ${dataB.riskLevel}`,
    tvlComparison: { a: dataA.tvl, b: dataB.tvl },
    recommendation: dataB.apy > dataA.apy + 2 
      ? `Move funds to ${dataB.name} for +${(dataB.apy - dataA.apy).toFixed(2)}% APY`
      : 'Keep current allocation',
  }
}
```

---

## 🎨 UI/UX Guidelines for Vyo Apps

### Deposit Flow

1. **Show vault info first** — APY, TVL, risk level
2. **Preview shares** — "You'll receive ~49.5 yoUSD shares"
3. **Show slippage** — "0.5% slippage protection enabled"
4. **Gas estimate** — "Est. gas: $0.50"
5. **Confirm button** — Only enable after approval check

### Withdrawal Flow

1. **Show current position** — "You have 50 yoUSD shares = 100.5 USDC"
2. **Select amount** — Slider: 25% / 50% / 75% / 100%
3. **Preview assets** — "You'll receive ~100.2 USDC"
4. **Redemption time** — "Instant" or "Processing time: ~24 hours"
5. **Confirm** — Execute redeem

---

## 🏛️ YO Protocol Architecture

### Overview

YO Protocol is built on the **ERC-4626 standard** — a tokenized vault standard for DeFi. This provides:
- Standardized deposit/withdrawal interfaces
- Share tokens representing vault ownership
- Composability with other DeFi protocols

### Key Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        YO PROTOCOL                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │   yoVault    │◄────┤   Gateway    │◄────┤    User      │    │
│  │  (ERC-4626)  │     │   Contract   │     │   Wallet     │    │
│  └──────┬───────┘     └──────────────┘     └──────────────┘    │
│         │                                                       │
│         │ Deposits assets to multiple underlying pools          │
│         ▼                                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              UNDERLYING YIELD POOLS                      │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │    │
│  │  │  Aave    │  │ Compound │  │  Morpho  │  │  etc.  │  │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └────────┘  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              RISK MANAGEMENT                             │    │
│  │  • Auto-rebalancing between pools                       │    │
│  │  • Exponential.fi risk ratings                          │    │
│  │  • Circuit breakers for volatility                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### yoVault Tokens (ERC-4626)

When you deposit into a YO vault, you receive **yoVault tokens** (shares):

| Vault | Share Token | Underlying | Use Case |
|-------|-------------|------------|----------|
| yoUSD | yoUSD | USDC | Stablecoin savings |
| yoETH | yoETH | WETH | ETH yield |
| yoBTC | yoBTC | cbBTC | Bitcoin yield |
| yoEUR | yoEUR | EURC | Euro stablecoin |

**Key Properties:**
- **Transferable:** Share tokens can be transferred between wallets
- **Fungible:** Each share represents proportional vault ownership
- **Yield-bearing:** Shares automatically accrue yield from underlying pools
- **Redeemable:** Shares can be redeemed for underlying assets anytime

### Asynchronous Redemption Mechanism

YO vaults use a unique **async redemption** system for withdrawals:

```
1. USER initiates redeem(shares)
          │
          ▼
2. VAULT checks liquidity
          │
          ├──► If liquid: Instant redemption ➜ assets sent immediately
          │
          └──► If illiquid: Request queued ➜ fulfilled later by operators
          │
          ▼
3. USER receives either:
   • Assets immediately (if vault has liquidity)
   • Request ID + pending redemption (if queued)
```

**Why Async?**
- Vaults may have assets locked in underlying protocols (Aave, Compound)
- Operators batch redemptions for gas efficiency
- Prevents bank runs during high withdrawal demand

### Auto-Rebalancing Strategy

YO vaults automatically optimize yield across multiple underlying pools:

```typescript
// Simplified rebalancing logic
interface Pool {
  name: string
  apy: number
  tvl: number
  risk: 'low' | 'medium' | 'high'
}

function calculateOptimalAllocation(pools: Pool[]) {
  // Filter by risk tolerance
  const eligiblePools = pools.filter(p => p.risk === 'low')
  
  // Weight by APY and TVL (higher TVL = more stable)
  const weightedPools = eligiblePools.map(p => ({
    ...p,
    score: p.apy * Math.log(p.tvl + 1), // Logarithmic TVL weighting
  }))
  
  // Normalize to percentages
  const totalScore = weightedPools.reduce((sum, p) => sum + p.score, 0)
  return weightedPools.map(p => ({
    name: p.name,
    allocation: Math.round((p.score / totalScore) * 100),
  }))
}
```

### Fee Structure

Currently **0% fees** on YO Protocol:
- No deposit fees
- No withdrawal fees  
- No management fees
- No performance fees

This may change in the future, but fees will always be:
- Clearly disclosed
- Capped at reasonable limits
- Used to benefit protocol sustainability

### Risk Management

YO employs multiple risk management strategies:

1. **Exponential Risk Ratings**
   - Each underlying pool rated by Exponential.fi
   - Smart contract risk, collateral risk, oracle risk
   - Vaults only use pools above risk threshold

2. **Circuit Breakers**
   - Auto-pause deposits if pool APY drops >50%
   - Prevents loss of funds from failing strategies
   - Emergency admin can pause all operations

3. **Diversification**
   - Assets spread across multiple protocols
   - No single point of failure
   - Rebalanced based on risk-adjusted returns

### Contract Addresses

**Base Mainnet:**
```typescript
const VAULTS = {
  yoUSD: {
    address: '0x3a43aec53490cb9fa922847385d82fe25d0e9de7',
    asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
  },
  yoETH: {
    address: '0x...', // Add actual addresses
    asset: '0x4200000000000000000000000000000000000006', // WETH
  },
  // ... other vaults
}
```

**Ethereum Mainnet:**
```typescript
const VAULTS_ETH = {
  yoETH: {
    address: '0x...',
    asset: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
  },
  yoGOLD: {
    address: '0x...',
    asset: '0x68749665FF8D2d112Fa859AA293F07A622782F38', // XAUt
  },
  // ... other vaults
}
```

*Full contract addresses available at:* https://docs.yo.xyz/protocol/contract-addresses

### Security Audits

YO Protocol has been audited by leading security firms:
- Audit reports available at: https://docs.yo.xyz/protocol/security-audits
- Bug bounty program active
- Continuous monitoring via ImmuneFi

---

## 🔐 Security Best Practices

1. **Always use slippage protection** — Default 0.5% (50 bps)
2. **Validate vault addresses** — Use `VAULTS` constants, never hardcode
3. **Check allowances before deposit** — Use `depositWithApproval()` or check manually
4. **Wait for confirmations** — Use `waitForRedeemReceipt()` for redemptions
5. **Handle partial failures** — Multi-vault deposits can partially fail
6. **Never store private keys** — Use WalletConnect/wagmi only

---

## 📚 Resources

- **YO Docs:** https://docs.yo.xyz
- **SDK Reference:** https://docs.yo.xyz/integrations/technical-guides/sdk
- **Core Package:** `@yo-protocol/core`
- **React Package:** `@yo-protocol/react`
- **Exponential Risk Ratings:** https://exponential.fi/learn/risk-rating

---

## 🚀 Quick Reference Card

```typescript
// ONE-LINERS

// Create client
const client = createYoClient({ chainId: 8453 })

// Get vault info
const vault = await client.getVaultState(VAULTS.yoUSD.address)

// Get APY
const snapshot = await client.getVaultSnapshot(VAULTS.yoUSD.address)

// Deposit 100 USDC
await client.deposit({ vault: VAULTS.yoUSD.address, amount: parseUnits('100', 6) })

// Withdraw all shares
await client.redeem({ vault: VAULTS.yoUSD.address, shares: userShares })

// Check balance
const position = await client.getUserPosition(VAULTS.yoUSD.address, userAddress)
```

---

*This guide is specific to Vyo Apps YO SDK integration. For full SDK docs, visit https://docs.yo.xyz*
