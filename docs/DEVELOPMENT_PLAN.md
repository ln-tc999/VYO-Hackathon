# Vyo Apps - Comprehensive Development Plan

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Current State Analysis](#2-current-state-analysis)
3. [Smart Contract Development](#3-smart-contract-development)
4. [YO SDK Integration](#4-yo-sdk-integration)
5. [Chainlink Automation](#5-chainlink-automation)
6. [Backend Development](#6-backend-development)
7. [Frontend Development](#7-frontend-development)
8. [Testing & Deployment](#8-testing--deployment)
9. [Timeline & Priorities](#9-timeline--priorities)

---

## 1. Project Overview

### 1.1 What is Vyo Apps?

Vyo Apps is an **AI-Powered DeFi Yield Optimizer** that allows users to:
- Create savings goals with natural language input
- Automatically deposit across multiple YO Protocol vaults
- Let AI agent optimize yield by rebalancing between vaults
- Track progress and earn yield on deposits
- Have full control - AI never moves money without approval

### 1.2 Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Astro + React + Wagmi |
| Backend | Node.js + Express |
| Smart Contracts | Solidity (Foundry) |
| Blockchain | Base (EVM) |
| Yield Protocol | YO Protocol (ERC-4626) |
| Automation | Chainlink Automation |
| Package Manager | pnpm |
| Monorepo | Turbo |

### 1.3 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER (Frontend)                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Dashboard  │  │ Goals       │  │ Vaults      │  │ AI Decisions│        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │ HTTP/Web3
┌────────────────────────────────▼────────────────────────────────────────────┐
│                           BACKEND (Express)                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ API Routes  │  │ Vio Agent   │  │ YO SDK      │  │ Cron Jobs   │        │
│  │ /api/*      │  │ (AI Brain)  │  │ Client      │  │ (15 min)    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  YO Protocol     │  │  Chainlink       │  │  YO API          │
│  (On-chain)      │  │  Automation      │  │  (HTTP API)      │
│  Vaults          │  │  (Upkeep)        │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
              ▲
              │
┌─────────────▼─────────────────────────────────────────────────────────────┐
│                      VYO ROUTER (Smart Contract)                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Goal Mgmt   │  │ Batch       │  │ AI Agent    │  │ Automation  │        │
│  │ - Create    │  │ Operations  │  │ Permissions │  │ - Keeper    │        │
│  │ - Update    │  │ - Deposit   │  │ - Approve   │  │ - Check     │        │
│  │ - Track     │  │ - Redeem    │  │ - Rebalance │  │ - Perform   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Current State Analysis

### 2.1 What's Already Built

#### ✅ Smart Contract (VyoRouter.sol)

| Feature | Status | Description |
|---------|--------|-------------|
| Goal Management | ✅ Complete | Create, read, update goals on-chain |
| Batch Deposits | ✅ Complete | Deposit to multiple vaults in 1 tx |
| Batch Redeem | ✅ Complete | Withdraw from multiple vaults |
| Emergency Exit | ✅ Complete | Panic button - withdraw all |
| AI Agent Permissions | ✅ Complete | Approve/revoke AI agents |
| Spend Limits | ✅ Complete | Per-transaction & daily limits |
| Agent Rebalance | ✅ Complete | AI can rebalance between vaults |
| Deposit History | ✅ Complete | Track all deposit records |
| Yield Calculation | ✅ Complete | Calculate yield per goal |

#### ✅ Backend

| Feature | Status | Description |
|---------|--------|-------------|
| Express Server | ✅ Complete | Running on port 3001 |
| Goals API | ✅ Complete | CRUD operations |
| Vaults API | ✅ Complete | List available vaults |
| Transactions API | ✅ Complete | Deposit & redeem flows |
| AI Decisions API | ✅ Complete | Decision transparency |
| Dashboard API | ✅ Complete | Aggregated data |
| Vio Agent | ✅ Complete | AI decision making |
| Cron Jobs | ✅ Complete | Run every 15 minutes |

#### ✅ Frontend

| Feature | Status | Description |
|---------|--------|-------------|
| Astro + React | ✅ Complete | Modern frontend framework |
| Wallet Connect | ✅ Complete | Wagmi + WalletConnect |
| Goal Creation | ✅ Complete | Natural language input |
| Dashboard | ✅ Complete | View all positions |
| Vault Display | ✅ Complete | Show vault listings |

#### ✅ YO SDK Integration

| Feature | Status | Description |
|---------|--------|-------------|
| SDK Installed | ✅ Complete | `@yo-protocol/core` v1.0.9 |
| Deposit | ✅ Complete | Via wrapper |
| Redeem | ✅ Complete | Via wrapper |
| Get Position | ✅ Complete | Via wrapper |
| Vault API | ⚠️ Partial | Using HTTP API directly |

---

### 2.2 What's Missing

#### ❌ Smart Contract

| Feature | Priority | Description |
|---------|----------|-------------|
| Chainlink Automation Interface | HIGH | Add AutomationCompatibleInterface |
| Keeper-executable Functions | HIGH | Functions for automation |
| Auto-Compound Yield | MEDIUM | Reinvest yield automatically |
| Scheduled DCA | MEDIUM | Auto-deposit on schedule |
| Vault Registry | LOW | Central vault management |
| Protocol Fees | LOW | Revenue from yield |

#### ❌ Backend

| Feature | Priority | Description |
|---------|----------|-------------|
| Full YO SDK Usage | HIGH | Use more SDK methods |
| Chainlink Upkeep Registration | HIGH | Register upkeeps |
| Automation Monitor | HIGH | Backend monitoring for automation |
| Better Error Handling | MEDIUM | More robust error handling |
| Real-time Price Feed | MEDIUM | Get token prices |
| Merkl Rewards Integration | LOW | Handle extra rewards |

#### ❌ Frontend

| Feature | Priority | Description |
|---------|----------|-------------|
| Full Wallet Integration | HIGH | Complete Web3 flows |
| Transaction Confirmation | HIGH | Better tx feedback |
| Goal Progress Charts | MEDIUM | Visual progress |
| AI Decision UI | MEDIUM | Better decision display |
| Mobile Optimization | LOW | Responsive design |

---

## 3. Smart Contract Development

### 3.1 VyoRouter.sol - Current Features

The current VyoRouter.sol already has:

```solidity
// Main functions
- createGoal()              // Create savings goal
- batchDeposit()            // Deposit to multiple vaults
- batchRedeem()             // Withdraw from multiple vaults
- emergencyExit()           // Panic button
- approveAgent()            // Approve AI agent
- revokeAgent()             // Revoke AI agent
- agentRebalance()          // AI rebalance funds
- getUserGoals()            // Read goals
- getGoalAllocations()      // Read allocations
- calculateGoalYield()      // Calculate yield
```

### 3.2 New Features to Add

#### 3.2.1 Chainlink Automation Interface

```solidity
// Add imports
import {AutomationCompatibleInterface} from "./interfaces/AutomationCompatibleInterface.sol";

// Add state variables
uint256 public lastUpkeepTime;
uint256 public upkeepInterval = 1 days;
uint256 public performUpkeepGasLimit = 500000;

// Add AutomationCompatibleInterface
function checkUpkeep(bytes calldata checkData)
    external
    returns (bool, bytes memory);

function performUpkeep(bytes calldata performData) external;
```

#### 3.2.2 Keeper-Executable Functions

```solidity
// Automated yield compounding
function compoundYield(bytes32 goalId) external onlyKeeper nonReentrant;

// Automated rebalancing (threshold-based)
function autoRebalance(
    bytes32 goalId,
    uint256 minApyDiff,    // Minimum APY diff to trigger
    address[] calldata fromVaults,
    address[] calldata toVaults,
    uint256[] calldata shares
) external onlyKeeper nonReentrant;

// Scheduled deposit (DCA)
function executeScheduledDeposit(
    bytes32 goalId,
    uint256 amount
) external onlyKeeper nonReentrant;
```

#### 3.2.3 Auto-Configuration

```solidity
// User sets automation preferences
struct AutomationConfig {
    bool autoCompoundEnabled;
    uint256 compoundInterval;      // days
    bool autoRebalanceEnabled;
    uint256 rebalanceThreshold;    // APY diff in %
    bool emergencyExitEnabled;
    uint256 emergencyExitThreshold; // vault TVL drop %
}

mapping(bytes32 => AutomationConfig) public goalAutomationConfigs;

// User configures automation
function setAutomationConfig(
    bytes32 goalId,
    AutomationConfig calldata config
) external onlyGoalOwner(goalId);
```

#### 3.2.4 Complete Smart Contract Structure

```
contracts/
├── src/
│   ├── VyoRouter.sol              # Main router (UPDATED)
│   ├── interfaces/
│   │   ├── IYOVault.sol           # YO Vault interface
│   │   ├── AutomationCompatibleInterface.sol
│   │   └── IERC20Extended.sol
│   └── library/
│       ├── MathUtils.sol
│       └── ReentrancyGuardExtended.sol
├── script/
│   ├── Deploy.s.sol                # Deployment script
│   └── AutomationSetup.s.sol      # Register upkeeps
└── test/
    ├── VyoRouter.t.sol             # Unit tests
    └── Integration.t.sol           # Integration tests
```

---

## 4. YO SDK Integration

### 4.1 Current Integration (What We Have)

```typescript
// backend/src/services/yo-sdk/client.ts
const { createYoClient } = await import('@yo-protocol/core');
const client = createYoClient({ chainId: YO_CHAIN_ID });

// Currently used:
- client.deposit()         // Write
- client.redeem()          // Write
- client.getUserPosition() // Read
```

### 4.2 YO SDK Full Capabilities

#### Available Methods

| Category | Method | Use Case | Priority |
|----------|--------|----------|----------|
| **VAULT QUERIES** | | | |
| | `getVaults()` | List all available vaults | HIGH |
| | `getVaultState(address)` | Get vault total supply, assets | MEDIUM |
| | `getVaultSnapshot(address)` | Real-time APY, TVL | HIGH |
| | `getVaultYieldHistory()` | Historical yield data | LOW |
| | `getVaultTvlHistory()` | Historical TVL | LOW |
| **USER DATA** | | | |
| | `getUserPosition(address)` | User's shares & assets | HIGH |
| | `getUserPositionsAllChains()` | Cross-chain positions | MEDIUM |
| | `getUserHistory()` | Transaction history | MEDIUM |
| | `getUserPerformance()` | Yield earned | MEDIUM |
| | `getUserBalances()` | All token balances | LOW |
| **TRANSACTIONS** | | | |
| | `prepareApprove()` | Build approve tx | HIGH |
| | `prepareDeposit()` | Build deposit tx | HIGH |
| | `prepareRedeem()` | Build redeem tx | HIGH |
| | `prepareDepositWithApproval()` | Deposit + approve in 1 tx | HIGH |
| | `prepareRedeemWithApproval()` | Redeem + approve in 1 tx | HIGH |
| | `waitForTransaction()` | Wait for confirmation | HIGH |
| **QUOTES** | | | |
| | `previewDeposit()` | Calculate shares before deposit | HIGH |
| | `previewRedeem()` | Calculate assets before redeem | HIGH |
| | `convertToAssets()` | Shares → Assets | MEDIUM |
| | `convertToShares()` | Assets → Shares | MEDIUM |
| **REWARDS** | | | |
| | `getMerklCampaigns()` | Available reward campaigns | LOW |
| | `getClaimableRewards()` | Claimable Merkl rewards | LOW |
| | `prepareClaimMerklRewards()` | Build claim tx | LOW |
| **PRICING** | | | |
| | `getPrices()` | Token prices in USD | MEDIUM |

### 4.3 Improved YO SDK Service

```typescript
// backend/src/services/yo-sdk/client.ts - IMPROVED

export class YoSDKService {
    private client: YoClient | null = null;
    
    // Initialize client lazily
    private async getClient(): Promise<YoClient> {
        if (!this.client) {
            const { createYoClient } = await import('@yo-protocol/core');
            this.client = createYoClient({ 
                chainId: this.chainId,
                partnerId: 0 // TODO: Get partner ID
            });
        }
        return this.client;
    }

    // ============ VAULT QUERIES ============
    
    async getVaults(): Promise<VaultInfo[]> {
        const client = await this.getClient();
        const vaults = await client.getVaults();
        
        return vaults.map(v => ({
            id: v.contracts.vaultAddress,
            name: v.name,
            symbol: v.token.symbol,
            address: v.contracts.vaultAddress,
            chain: this.getNetworkName(),
            chainId: this.chainId,
            underlyingAsset: v.token.address,
            underlyingSymbol: v.token.symbol,
            apy: v.apy || 0,
            tvl: Number(v.tvl) / 1e6, // Convert to human readable
            riskScore: this.calculateRiskScore(v.name),
            lockupPeriod: v.lockPeriod || 'None',
        }));
    }

    async getVaultSnapshot(vaultAddress: string): Promise<VaultSnapshot> {
        const client = await this.getClient();
        return client.getVaultSnapshot(vaultAddress as Address);
    }

    // ============ USER DATA ============
    
    async getUserPosition(vaultAddress: string, userAddress: string): Promise<UserPosition> {
        const client = await this.getClient();
        const position = await client.getUserPosition(
            vaultAddress as Address,
            userAddress as Address
        );
        
        return {
            shares: Number(position.shares) / 1e6,
            assets: Number(position.assets) / 1e6,
            yieldEarned: Number(position.assets - position.shares) / 1e6,
        };
    }

    async getUserAllPositions(userAddress: string, vaults: VaultInfo[]): Promise<UserPosition[]> {
        const client = await this.getClient();
        const positions = await client.getUserPositionsAllChains(
            userAddress as Address,
            vaults as any
        );
        
        return positions.map(p => ({
            vaultId: p.vault.contracts.vaultAddress,
            shares: Number(p.position.shares) / 1e6,
            assets: Number(p.position.assets) / 1e6,
        }));
    }

    // ============ TRANSACTIONS ============
    
    async buildDepositTx(
        vaultAddress: string,
        amount: bigint,
        userAddress: string
    ): Promise<PreparedTransaction> {
        const client = await this.getClient();
        
        // First check and prepare approval if needed
        const hasAllowance = await client.hasEnoughAllowance(
            vaultAddress as Address,
            userAddress as Address,
            this.routerAddress,
            amount
        );
        
        if (!hasAllowance) {
            const approveTx = client.prepareApprove({
                token: vaultAddress as Address,
                spender: this.routerAddress,
            });
            return approveTx;
        }
        
        // Build deposit tx
        return client.prepareDeposit({
            vault: vaultAddress as Address,
            amount,
            recipient: userAddress as Address,
        });
    }

    async buildDepositWithApproval(
        vaultAddress: string,
        amount: bigint,
        userAddress: string
    ): Promise<PreparedTransaction[]> {
        const client = await this.getClient();
        
        return client.prepareDepositWithApproval({
            vault: vaultAddress as Address,
            amount,
            recipient: userAddress as Address,
            slippageBps: 50,
        });
    }

    async buildRedeemTx(
        vaultAddress: string,
        shares: bigint,
        userAddress: string
    ): Promise<PreparedTransaction> {
        const client = await this.getClient();
        return client.prepareRedeem({
            vault: vaultAddress as Address,
            shares,
            recipient: userAddress as Address,
        });
    }

    // ============ QUOTES (for UI) ============
    
    async previewDeposit(vaultAddress: string, amount: bigint): Promise<bigint> {
        const client = await this.getClient();
        return client.previewDeposit(vaultAddress as Address, amount);
    }

    async previewRedeem(vaultAddress: string, shares: bigint): Promise<bigint> {
        const client = await this.getClient();
        return client.previewRedeem(vaultAddress as Address, shares);
    }

    // ============ PRICING ============
    
    async getTokenPrices(): Promise<Record<string, number>> {
        const client = await this.getClient();
        const prices = await client.getPrices();
        
        return {
            ETH: Number(prices.ETH?.usd || 0),
            USDC: Number(prices.USDC?.usd || 1),
            USDT: Number(prices.USDT?.usd || 1),
            DAI: Number(prices.DAI?.usd || 1),
        };
    }

    // ============ REWARDS (MERKL) ============
    
    async getClaimableRewards(userAddress: string): Promise<MerklRewards> {
        const client = await this.getClient();
        return client.getClaimableRewards(userAddress as Address);
    }

    async buildClaimRewardsTx(
        userAddress: string,
        chainRewards: MerklChainRewards
    ): Promise<PreparedTransaction> {
        const client = await this.getClient();
        return client.prepareClaimMerklRewards(
            userAddress as Address,
            chainRewards
        );
    }
}
```

### 4.4 YO SDK Integration Checklist

| Task | Priority | Status |
|------|----------|--------|
| Update `getVaults()` to use SDK | HIGH | TODO |
| Add `getVaultSnapshot()` | HIGH | TODO |
| Add `buildDepositWithApproval()` | HIGH | TODO |
| Add `buildRedeemWithApproval()` | HIGH | TODO |
| Add `previewDeposit()` for UI | MEDIUM | TODO |
| Add `previewRedeem()` for UI | MEDIUM | TODO |
| Add `getTokenPrices()` | MEDIUM | TODO |
| Add Merkl rewards handling | LOW | TODO |

---

## 5. Chainlink Automation

### 5.1 Overview

Chainlink Automation enables smart contracts to be automated programmatically. It consists of:

1. **Upkeep** - The automated task that gets executed
2. **checkUpkeep()** - Determines if execution is needed
3. **performUpkeep()** - The actual execution logic

### 5.2 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Chainlink Automation Network                  │
│                                                                  │
│    ┌─────────────┐      ┌─────────────┐      ┌─────────────┐    │
│    │  Upkeep 1  │      │  Upkeep 2  │      │  Upkeep N   │    │
│    │ (Compound) │      │ (Rebalance)│      │ (DCA)       │    │
│    └──────┬──────┘      └──────┬──────┘      └──────┬──────┘    │
│           │                    │                    │            │
│           └────────────────────┼────────────────────┘            │
│                                │                                 │
│                    ┌───────────▼───────────┐                     │
│                    │  Automation Registry   │                     │
│                    │  (smartcontract)      │                     │
│                    └───────────┬───────────┘                     │
│                                │                                 │
└────────────────────────────────┼────────────────────────────────┘
                                 │ HTTP
                                 ▼
                    ┌─────────────────────────┐
                    │    VyoRouter.sol        │
                    │  ┌─────────────────┐    │
                    │  │ checkUpkeep()   │    │
                    │  │ performUpkeep() │    │
                    │  └─────────────────┘    │
                    └─────────────────────────┘
```

### 5.3 Automation Types for Vyo Apps


| Automation | Trigger | Action | Frequency |
|------------|---------|--------|-----------|
| **Yield Compounding** | Every 7 days | Reinvest yield to vault | Weekly |
| **Auto-Rebalance** | APY diff > 2% | Move funds to higher APY | When triggered |
| **Goal Check** | Every 1 day | Emit event if behind | Daily |
| **Emergency Exit** | Vault TVL drops > 20% | Withdraw all funds | When triggered |
| **Scheduled DCA** | Every 7/14/30 days | Deposit amount | Per schedule |

### 5.4 Implementation

#### 5.4.1 Smart Contract Changes

```solidity
// contracts/src/VyoRouter.sol additions

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Chainlink Automation Interface
interface AutomationCompatibleInterface {
    function checkUpkeep(
        bytes calldata checkData
    ) external returns (bool upkeepNeeded, bytes memory performData);

    function performUpkeep(bytes calldata performData) external;
}

contract VyoRouter is ReentrancyGuard, Ownable, AutomationCompatibleInterface {
    
    // ============ Automation State ============
    uint256 public lastUpkeepTime;
    uint256 public constant UPKEEP_INTERVAL = 1 days;
    uint256 public performUpkeepGasLimit = 500000;
    
    // Automation config per goal
    struct AutomationConfig {
        bool enabled;
        bool autoCompound;
        bool autoRebalance;
        uint256 compoundIntervalDays;
        uint256 rebalanceThresholdBps; // 200 = 2%
    }
    
    mapping(bytes32 => AutomationConfig) public automationConfigs;
    mapping(bytes32 => uint256) public lastCompoundTime;
    
    // ============ Events ============
    event UpkeepPerformed(
        bytes32 indexed goalId,
        string action,
        uint256 amount
    );
    
    event AutomationConfigured(
        bytes32 indexed goalId,
        bool autoCompound,
        bool autoRebalance
    );

    // ============ Chainlink Functions ============
    
    /**
     * @notice Called by Chainlink Automation nodes
     * @dev checkData contains: bytes32 goalId
     */
    function checkUpkeep(
        bytes calldata checkData
    ) external override returns (bool upkeepNeeded, bytes performData) {
        // Check if enough time has passed
        if (block.timestamp - lastUpkeepTime < UPKEEP_INTERVAL) {
            return (false, bytes("Not time for upkeep"));
        }
        
        // Decode goal ID
        bytes32 goalId;
        if (checkData.length > 0) {
            goalId = abi.decode(checkData, (bytes32));
        }
        
        // Check each active goal for automation needs
        return _checkUpkeepConditions(goalId);
    }
    
    /**
     * @notice Called by Chainlink Automation when upkeep is needed
     */
    function performUpkeep(
        bytes calldata performData
    ) external override {
        (bytes32 goalId, ActionType action) = abi.decode(
            performData,
            (bytes32, ActionType)
        );
        
        lastUpkeepTime = block.timestamp;
        
        if (action == ActionType.Compound) {
            _compoundYield(goalId);
        } else if (action == ActionType.Rebalance) {
            _autoRebalance(goalId);
        } else if (action == ActionType.Check) {
            _checkGoalStatus(goalId);
        }
    }
    
    // ============ Internal Functions ============
    
    function _checkUpkeepConditions(
        bytes32 goalId
    ) internal returns (bool, bytes memory) {
        // Check if any goal needs automation
        // Return (needsUpkeep, performData)
        
        if (goalId != 0) {
            // Check specific goal
            return _checkGoalAutomation(goalId);
        }
        
        // Check all goals
        bytes32[] memory goalsNeedingAction = new bytes32[](10);
        uint256 actionCount = 0;
        
        // Iterate through all goals (would need external index in production)
        // For now, return false - backend will monitor and trigger
        
        return (false, bytes("No upkeep needed"));
    }
    
    function _checkGoalAutomation(
        bytes32 goalId
    ) internal returns (bool, bytes memory) {
        AutomationConfig memory config = automationConfigs[goalId];
        
        if (!config.enabled) {
            return (false, bytes("Automation disabled"));
        }
        
        // Check compound
        if (config.autoCompound) {
            uint256 daysSinceCompound = (
                block.timestamp - lastCompoundTime[goalId]
            ) / 1 days;
            
            if (daysSinceCompound >= config.compoundIntervalDays) {
                return (
                    true,
                    abi.encode(goalId, ActionType.Compound)
                );
            }
        }
        
        // Check rebalance (would need price oracle)
        if (config.autoRebalance) {
            // Check if APY diff exceeds threshold
            // Return true if rebalance needed
        }
        
        return (false, bytes("No action needed"));
    }
    
    function _compoundYield(bytes32 goalId) internal {
        // Calculate yield earned
        VaultAllocation[] memory allocations = goalAllocations[goalId];
        uint256 totalYield = 0;
        
        for (uint i = 0; i < allocations.length; i++) {
            uint256 currentValue = IYOVault(allocations[i].vault).previewRedeem(
                allocations[i].shares
            );
            
            if (currentValue > allocations[i].depositedAmount) {
                uint256 yieldAmount = currentValue - allocations[i].depositedAmount;
                
                // Redeem yield
                uint256 redeemed = IYOVault(allocations[i].vault).redeem(
                    yieldAmount,
                    address(this),
                    address(this)
                );
                
                // Deposit back (compound)
                IERC20 asset = IYOVault(allocations[i].vault).asset();
                asset.approve(allocations[i].vault, redeemed);
                
                uint256 newShares = IYOVault(allocations[i].vault).deposit(
                    redeemed,
                    address(this)
                );
                
                // Update tracking
                allocations[i].shares += newShares;
                allocations[i].depositedAmount += redeemed;
                
                totalYield += redeemed;
            }
        }
        
        lastCompoundTime[goalId] = block.timestamp;
        
        emit UpkeepPerformed(goalId, "compound", totalYield);
    }
    
    // ============ User Configuration ============
    
    function setAutomationConfig(
        bytes32 goalId,
        bool autoCompound,
        bool autoRebalance,
        uint256 compoundIntervalDays,
        uint256 rebalanceThresholdBps
    ) external onlyGoalOwner(goalId) {
        automationConfigs[goalId] = AutomationConfig({
            enabled: true,
            autoCompound: autoCompound,
            autoRebalance: autoRebalance,
            compoundIntervalDays: compoundIntervalDays,
            rebalanceThresholdBps: rebalanceThresholdBps
        });
        
        emit AutomationConfigured(goalId, autoCompound, autoRebalance);
    }
    
    function disableAutomation(bytes32 goalId) external onlyGoalOwner(goalId) {
        automationConfigs[goalId].enabled = false;
    }
}
```

#### 5.4.2 Backend Service for Automation

```typescript
// backend/src/services/automation/chainlink.ts

import { ethers } from 'ethers';
import { viemClient } from '../viem/client.js';

export class ChainlinkAutomationService {
    private registryAddress: string;
    private upkeepRegistrar: string;
    private signer: ethers.Signer;
    
    // Contract ABIs
    private automationRegistryABI = [
        "function registerUpkeep(string name, bytes32 encryptedEmail, address upkeepContract, uint32 gasLimit, address adminAddress, uint8 triggerType, bytes checkData, bytes triggerConfig, bytes offchainConfig) external returns (uint256 id)",
        "function cancelUpkeep(uint256 id) external",
        "function pauseUpkeep(uint256 id) external",
        "function unpauseUpkeep(uint256 id) external"
    ];
    
    /**
     * Register an upkeep for a goal
     */
    async registerGoalUpkeep(
        goalId: string,
        goalOwner: string,
        automationType: 'compound' | 'rebalance' | 'dca'
    ): Promise<{ upkeepId: string; txHash: string }> {
        const vyoRouter = await this.getVyoRouter();
        
        // Build registration data
        const registrationData = this.buildRegistrationData(goalId, automationType);
        
        // Register via Automation Registrar
        const tx = await this.registrar.registerUpkeep(
            `Vyo-${automationType}-${goalId.slice(0, 8)}`, // name
            ethers.ZeroBytes, // encryptedEmail
            vyoRouter.address, // upkeepContract
            500000, // gasLimit
            goalOwner, // adminAddress
            0, // triggerType (conditional)
            ethers.zeroPadValue(goalId, 32), // checkData
            registrationData.triggerConfig,
            registrationData.offchainConfig
        );
        
        const receipt = await tx.wait();
        const upkeepId = this.extractUpkeepId(receipt);
        
        // Store mapping
        await this.storeUpkeepMapping(goalId, upkeepId, automationType);
        
        return { upkeepId, txHash: tx.hash };
    }
    
    /**
     * Cancel an upkeep
     */
    async cancelGoalUpkeep(goalId: string): Promise<void> {
        const upkeepId = await this.getUpkeepIdForGoal(goalId);
        if (upkeepId) {
            await this.automationRegistry.cancelUpkeep(upkeepId);
            await this.removeUpkeepMapping(goalId);
        }
    }
    
    /**
     * Check upkeep status
     */
    async getUpkeepStatus(upkeepId: string): Promise<{
        balance: string;
        paused: boolean;
        lastRun: number;
        nextRun: number;
    }> {
        const registry = this.getRegistry();
        const info = await registry.getUpkeepInfo(upkeepId);
        
        return {
            balance: info.balance.toString(),
            paused: info.paused,
            lastRun: Number(info.lastRun),
            nextRun: Number(info.nextRound)
        };
    }
    
    /**
     * Fund upkeep with LINK
     */
    async fundUpkeep(upkeepId: string, amountJuels: bigint): Promise<void> {
        const registry = this.getRegistry();
        
        // Transfer LINK to registry
        const linkToken = await this.getLinkToken();
        await linkToken.transfer(this.registryAddress, amountJuels);
        
        // Add funds to upkeep
        await registry.addFunds(upkeepId, amountJuels);
    }
    
    // ============ PRIVATE METHODS ============
    
    private buildRegistrationData(
        goalId: string,
        type: string
    ): { triggerConfig: bytes; offchainConfig: bytes } {
        return {
            triggerConfig: ethers.solidityPacked(
                ["bytes32", "uint256"],
                [goalId, 1 days]
            ),
            offchainConfig: ethers.solidityPacked(
                ["string"],
                [`{"goalId":"${goalId}","type":"${type}"}`]
            ])
        };
    }
}
```

#### 5.4.3 Automation Monitoring Service

```typescript
// backend/src/services/automation/monitor.ts

import { yoService } from '../yo-sdk/client.js';
import { vyoRouter } from '../contracts/vyoRouter.js';

export class AutomationMonitor {
    private checkInterval = 15 * 60 * 1000; // 15 minutes
    
    /**
     * Main monitoring loop
     */
    async startMonitoring(): Promise<void> {
        console.log('[AUTOMATION] Starting automation monitor...');
        
        setInterval(async () => {
            try {
                await this.checkAndTriggerAutomation();
            } catch (error) {
                console.error('[AUTOMATION] Monitor error:', error);
            }
        }, this.checkInterval);
    }
    
    /**
     * Check all goals for automation needs
     */
    async checkAndTriggerAutomation(): Promise<void> {
        const goals = await this.getAllActiveGoals();
        
        for (const goal of goals) {
            await this.evaluateGoalAutomation(goal);
        }
    }
    
    /**
     * Evaluate automation for a specific goal
     */
    async evaluateGoalAutomation(goal: Goal): Promise<void> {
        const config = await vyoRouter.getAutomationConfig(goal.id);
        
        if (!config.enabled) return;
        
        // Check compound eligibility
        if (config.autoCompound) {
            const daysSinceLastCompound = this.getDaysSince(
                goal.lastCompoundTime
            );
            
            if (daysSinceLastCompound >= config.compoundIntervalDays) {
                // Check if there's yield to compound
                const yieldAmount = await this.calculateYield(goal);
                
                if (yieldAmount > this.getMinCompoundThreshold()) {
                    await this.triggerCompound(goal.id);
                }
            }
        }
        
        // Check rebalance eligibility
        if (config.autoRebalance) {
            const shouldRebalance = await this.checkRebalanceNeeded(
                goal,
                config.rebalanceThresholdBps
            );
            
            if (shouldRebalance) {
                await this.queueRebalanceForApproval(goal);
            }
        }
    }
    
    /**
     * Trigger yield compounding via contract
     */
    async triggerCompound(goalId: string): Promise<void> {
        console.log(`[AUTOMATION] Triggering compound for goal ${goalId}`);
        
        try {
            // In production: call contract directly or via keeper
            const tx = await vyoRouter.compoundYield(goalId);
            await tx.wait();
            
            console.log(`[AUTOMATION] Compound successful: ${tx.hash}`);
        } catch (error) {
            console.error(`[AUTOMATION] Compound failed:`, error);
        }
    }
    
    /**
     * Check if rebalancing is needed
     */
    async checkRebalanceNeeded(
        goal: Goal,
        thresholdBps: number
    ): Promise<boolean> {
        const vaults = await yoService.getVaults();
        
        // Get current vault allocations
        const currentAllocations = goal.vaultAllocations;
        
        // Check if any other vault has significantly higher APY
        for (const alloc of currentAllocations) {
            const currentVault = vaults.find(v => v.id === alloc.vaultId);
            
            if (!currentVault) continue;
            
            // Find better vault
            const betterVault = vaults.find(
                v => v.riskScore <= currentVault.riskScore + 1 &&
                     (v.apy - currentVault.apy) * 10000 >= thresholdBps
            );
            
            if (betterVault) {
                return true;
            }
        }
        
        return false;
    }
}
```

### 5.5 Chainlink Automation Checklist

| Task | Priority | Status |
|------|----------|--------|
| Add AutomationCompatibleInterface to VyoRouter | HIGH | TODO |
| Implement checkUpkeep() function | HIGH | TODO |
| Implement performUpkeep() function | HIGH | TODO |
| Add automation config struct | HIGH | TODO |
| Implement _compoundYield() | HIGH | TODO |
| Add setAutomationConfig() | MEDIUM | TODO |
| Create ChainlinkAutomationService | HIGH | TODO |
| Create AutomationMonitor service | HIGH | TODO |
| Register upkeeps for goals | MEDIUM | TODO |
| Fund upkeeps with LINK | MEDIUM | TODO |
| Test on Base Sepolia | HIGH | TODO |

---

## 6. Backend Development

### 6.1 Current Architecture

```
backend/src/
├── index.ts                    # Express server
├── routes/
│   ├── goals.ts               # Goal CRUD
│   ├── vaults.ts              # Vault listings
│   ├── transactions.ts       # Deposit/redeem
│   ├── ai.ts                 # AI decisions
│   ├── dashboard.ts           # Aggregated data
│   └── yield.ts              # Yield tracking
├── services/
│   ├── yo-sdk/
│   │   ├── client.ts          # YO SDK wrapper
│   │   └── mock-data.ts       # Mock data
│   ├── ai/
│   │   ├── vioAgent.ts        # Main agent
│   │   ├── decisionEngine.ts  # Decision logic
│   │   ├── wealth-coach.ts    # User coaching
│   │   └── risk-profiles.ts   # Risk profiles
│   └── yield-tracker.ts       # Yield calculations
├── middleware/
│   └── auth.ts               # Authentication
├── models/
│   └── store.ts              # In-memory store
└── jobs/
    └── vioLoop.ts            # Cron jobs
```

### 6.2 Improvements Needed

#### 6.2.1 Updated YO SDK Client

```typescript
// backend/src/services/yo-sdk/client.ts - COMPLETE VERSION

export class YoSDKService {
    // Add new methods
    async getAllVaultsWithDetails(): Promise<VaultInfo[]>
    async getVaultAPY(vaultAddress: string): Promise<number>
    async getUserAllPositions(userAddress: string): Promise<UserPosition[]>
    async buildDepositTransaction(params: DepositParams): Promise<Transaction>
    async buildRedeemTransaction(params: RedeemParams): Promise<Transaction>
    async executeTransaction(tx: Transaction): Promise<string>
    async getPrices(): Promise<PriceMap>
}
```

#### 6.2.2 New Services

```
backend/src/services/
├── yo-sdk/
│   ├── client.ts              # COMPLETE - All SDK methods
│   └── mock-data.ts
├── automation/
│   ├── chainlink.ts           # NEW - Chainlink integration
│   └── monitor.ts             # NEW - Automation monitor
├── contracts/
│   ├── vyoRouter.ts           # NEW - Contract wrapper
│   └── vault.ts               # NEW - Vault interactions
└── price/
    └── oracle.ts              # NEW - Price feeds
```

#### 6.2.3 Updated Routes

```typescript
// Example: Updated deposit flow
router.post('/deposit', async (req, res) => {
    const { vaultId, amount, goalId } = req.body;
    
    // 1. Get vault info from YO SDK
    const vault = await yoService.getVaultDetails(vaultId);
    
    // 2. Preview deposit (show expected shares)
    const expectedShares = await yoService.previewDeposit(
        vault.address,
        parseUnits(amount, 6)
    );
    
    // 3. Build transaction
    const tx = await yoService.buildDepositWithApproval({
        vault: vault.address,
        amount: parseUnits(amount, 6),
        user: req.user.address,
    });
    
    // 4. Return transaction data for frontend to sign
    res.json({
        success: true,
        data: {
            transaction: tx,
            preview: {
                expectedShares: formatUnits(expectedShares, 6),
                currentAPY: vault.apy,
            }
        }
    });
});
```

### 6.3 Backend Checklist

| Task | Priority | Status |
|------|----------|--------|
| Complete YO SDK client | HIGH | TODO |
| Add VyoRouter contract wrapper | HIGH | TODO |
| Create Chainlink automation service | HIGH | TODO |
| Create automation monitor | HIGH | TODO |
| Add price oracle service | MEDIUM | TODO |
| Update deposit route with preview | HIGH | TODO |
| Update redeem route with preview | HIGH | TODO |
| Add error handling middleware | MEDIUM | TODO |
| Add request validation | MEDIUM | TODO |
| Add rate limiting | LOW | TODO |

---

## 7. Frontend Development

### 7.1 Current Frontend Structure

```
frontend/src/
├── pages/
│   ├── index.astro           # Landing page
│   ├── dashboard/
│   │   ├── index.astro       # Main dashboard
│   │   ├── goals/
│   │   ├── vaults/
│   │   └── ai/
│   └── api/                  # API routes
├── components/
│   ├── vaults/
│   │   └── VaultPositions.tsx
│   ├── wallet/
│   │   ├── ConnectWalletButton.tsx
│   │   └── WagmiProvider.tsx
│   └── goals/
├── layouts/
│   └── Layout.astro
├── lib/
│   ├── api.ts                # API client
│   └── wallet.ts             # Wagmi config
├── stores/
│   └── wallet.ts
└── env.d.ts
```

### 7.2 Improvements Needed

#### 7.2.1 Complete Wallet Integration

```typescript
// frontend/src/lib/wallet.ts - IMPROVED

import { createConfig, http, createConnector } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { injected, walletConnect, safe } from 'wagmi/connectors';

// Contract addresses
export const CONTRACTS = {
    VyoRouter: '0x...', // Deploy after
    USDC: '0x036cBd53842c5426634E92B0C9D5eb112A4E1d4d',
};

// ABI imports (would be generated)
import { VYOROUTER_ABI } from './abis/VyoRouter.js';
import { ERC20_ABI } from './abis/ERC20.js';

// Contract read/write hooks
export function useVyoRouter() {
    const { writeContract, readContract } = useWriteContract();
    
    return {
        createGoal: (params) => writeContract({
            address: CONTRACTS.VyoRouter,
            abi: VYOROUTER_ABI,
            functionName: 'createGoal',
            args: [params.name, params.target, params.deadline, ...]
        }),
        
        batchDeposit: (params) => writeContract({
            address: CONTRACTS.VyoRouter,
            abi: VYOROUTER_ABI,
            functionName: 'batchDeposit',
            args: [params.goalId, params.vaults, params.amounts, params.total]
        }),
        
        getUserGoals: (user) => readContract({
            address: CONTRACTS.VyoRouter,
            abi: VYOROUTER_ABI,
            functionName: 'getUserGoals',
            args: [user]
        }),
    };
}
```

#### 7.2.2 Deposit Flow Component

```typescript
// frontend/src/components/goals/DepositFlow.tsx

export function DepositFlow({ goal, vault }) {
    const [amount, setAmount] = useState('');
    const [preview, setPreview] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    
    // Preview deposit when amount changes
    useEffect(() => {
        if (amount && parseFloat(amount) > 0) {
            previewDeposit();
        }
    }, [amount]);
    
    const previewDeposit = async () => {
        const result = await api.post('/transactions/preview-deposit', {
            vaultId: vault.id,
            amount: parseFloat(amount),
        });
        setPreview(result.data);
    };
    
    const handleDeposit = async () => {
        setIsLoading(true);
        
        try {
            // Build transaction
            const { transaction } = await api.post('/transactions/build-deposit', {
                vaultId: vault.id,
                amount: parseFloat(amount),
                goalId: goal.id,
            });
            
            // Write to wallet
            const hash = await writeContract(transaction);
            
            // Wait for confirmation
            await waitForTransactionReceipt(hash);
            
            // Show success
            toast.success('Deposit successful!');
        } catch (error) {
            toast.error('Deposit failed');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="deposit-flow">
            <Input
                label="Amount (USDC)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
            />
            
            {preview && (
                <div className="preview">
                    <p>You will receive: {preview.expectedShares} shares</p>
                    <p>Current APY: {preview.currentAPY}%</p>
                    <p>Gas estimate: ~${preview.gasEstimate}</p>
                </div>
            )}
            
            <Button onClick={handleDeposit} disabled={isLoading}>
                {isLoading ? 'Confirming...' : 'Deposit'}
            </Button>
        </div>
    );
}
```

### 7.3 Frontend Checklist

| Task | Priority | Status |
|------|----------|--------|
| Update wallet config with contract addresses | HIGH | TODO |
| Add contract ABIs | HIGH | TODO |
| Create useVyoRouter hook | HIGH | TODO |
| Update VaultCard with deposit flow | HIGH | TODO |
| Add transaction preview UI | HIGH | TODO |
| Add transaction confirmation modal | HIGH | TODO |
| Create GoalCard component | MEDIUM | TODO |
| Add progress charts | MEDIUM | TODO |
| Improve AI decisions UI | MEDIUM | TODO |
| Mobile responsive design | LOW | TODO |

---

## 8. Testing & Deployment

### 8.1 Testing Strategy

#### Unit Tests (Smart Contracts)

```solidity
// contracts/test/VyoRouter.t.sol

contract VyoRouterTest is Test {
    function test_CreateGoal() public {
        // Test goal creation
    }
    
    function test_BatchDeposit() public {
        // Test multi-vault deposit
    }
    
    function test_CompoundYield() public {
        // Test yield compounding
    }
    
    function test_AutomationConfig() public {
        // Test automation settings
    }
}
```

#### Integration Tests (Backend)

```typescript
// backend/test/integration.test.ts

describe('YO SDK Integration', () => {
    it('should get vault list', async () => {
        const vaults = await yoService.getVaults();
        expect(vaults.length).toBeGreaterThan(0);
    });
    
    it('should preview deposit', async () => {
        const shares = await yoService.previewDeposit(vaultAddress, amount);
        expect(shares).toBeGreaterThan(0);
    });
});
```

### 8.2 Deployment Steps

#### 1. Smart Contract (Base Sepolia)

```bash
# Deploy to Base Sepolia
cd contracts
forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC --broadcast --verify

# Output will show:
# - VyoRouter address
# - Transaction hash
```

#### 2. Backend

```bash
# Build
pnpm build:backend

# Deploy to server (Railway/Render/Fly.io)
# Set environment variables
YO_CHAIN_ID=84532
DEV_MODE=live
VYOROUTER_ADDRESS=0x...
```

#### 3. Frontend

```bash
# Build
pnpm build:frontend

# Deploy to Vercel/Netlify
# Set environment variables
PUBLIC_WALLET_CONNECT_PROJECT_ID=...
PUBLIC_CHAIN_ID=84532
PUBLIC_VYOROUTER_ADDRESS=0x...
```

### 8.3 Testing Checklist

| Task | Priority | Status |
|------|----------|--------|
| Write VyoRouter unit tests | HIGH | TODO |
| Test Chainlink integration | HIGH | TODO |
| Integration tests for YO SDK | HIGH | TODO |
| E2E deposit flow test | MEDIUM | TODO |
| E2E withdraw flow test | MEDIUM | TODO |
| Automation trigger test | HIGH | TODO |
| Test on Base Sepolia | HIGH | TODO |
| Test on Base Mainnet | HIGH | TODO |

---

## 9. Timeline & Priorities

### 9.1 Phase 1: Foundation 

| Task | Duration | Dependencies |
|------|----------|--------------|
| Update VyoRouter with Chainlink interfaces | 2 days | None |
| Implement compoundYield function | 2 days | None |
| Add automation config to contract | 1 day | None |
| Deploy contracts to Base Sepolia | 1 day | Contract ready |
| **Milestone**: Contracts deployed & verified | | |

### 9.2 Phase 2: Backend 

| Task | Duration | Dependencies |
|------|----------|--------------|
| Complete YO SDK client | 3 days | SDK docs |
| Create Chainlink automation service | 3 days | Contract ready |
| Create automation monitor | 2 days | Automation service |
| Update API routes | 2 days | SDK client ready |
| **Milestone**: Backend handles all operations | | |

### 9.3 Phase 3: Frontend 

| Task | Duration | Dependencies |
|------|----------|--------------|
| Add contract ABIs | 1 day | Contract ready |
| Create wallet integration hooks | 2 days | ABIs ready |
| Build deposit flow UI | 2 days | Backend ready |
| Build withdraw flow UI | 2 days | Backend ready |
| **Milestone**: User can deposit & withdraw | | |

### 9.4 Phase 4: Automation

| Task | Duration | Dependencies |
|------|----------|--------------|
| Test checkUpkeep on testnet | 2 days | Contract ready |
| Register upkeeps | 1 day | Chainlink access |
| Test full automation | 3 days | Upkeeps registered |
| Monitor & fix issues | 2 days | Testing |
| **Milestone**: Automated yield optimization works | | |

### 9.5 Phase 5: Polish 

| Task | Duration | Dependencies |
|------|----------|--------------|
| Write comprehensive tests | 3 days | Features ready |
| Security audit prep | 2 days | Tests ready |
| Deploy to Base Mainnet | 1 day | Tests pass |
| Launch | 1 day | Mainnet ready |

---

## Summary

### Total Features to Build

| Category | Current | New | Total |
|----------|---------|-----|-------|
| Smart Contract | 9 features | 4 features | 13 |
| Backend Services | 8 services | 4 services | 12 |
| Frontend Features | 5 features | 5 features | 10 |
| Integrations | 1 (YO SDK) | 1 (Chainlink) | 2 |

### Key Dependencies

```
YO SDK ──────────────────────▶ VyoRouter (Contract)
    │                              │
    │                              │
    ▼                              ▼
Frontend ◀───────────────── Backend
                 │
                 ▼
         Chainlink Automation
```

### Next Steps

1. **Approve this plan** - Confirm the roadmap
2. **Start Phase 1** - Update VyoRouter.sol with Chainlink interfaces
3. **Iterate** - Build incrementally, test frequently

---

*Last Updated: 2026-03-17*
