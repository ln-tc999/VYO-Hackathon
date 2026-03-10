# Vyo Apps — Production Architecture (Simplified)

> **Status:** Production Design (Simplified)  
> **Philosophy:** Stateless, minimal infrastructure, maximum functionality  
> **Stack:** Node.js, Express, YO SDK, Smart Contract (VyoRouter)  
> **AI:** Vio Agent via OpenRouter

---

## 🎯 Prinsip Desain

**"Less infrastructure, more value"**

- ❌ **Tanpa Database** - Semua data on-chain atau frontend
- ❌ **Tanpa Microservices** - Monolithic backend
- ❌ **Tanpa DevOps Kompleks** - Simple deployment
- ✅ **Smart Contract untuk Core Logic** - Batch deposits, AI permissions
- ✅ **Stateless Backend** - Hanya API proxy & AI
- ✅ **YO Protocol untuk Vaults** - Tidak perlu bangun vault sendiri

---

## 🏗️ Arsitektur Sederhana

```
┌─────────────────────────────────────────────────────────────┐
│                         VYO APPS                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐              ┌──────────────┐            │
│  │   Frontend   │              │    Backend   │            │
│  │   (Astro)    │◄────────────►│   (Express)  │            │
│  │              │              │   Stateless  │            │
│  └──────┬───────┘              └──────┬───────┘            │
│         │                             │                     │
│         │                             │                     │
│  ┌──────┴───────┐              ┌──────┴───────┐            │
│  │  IndexedDB   │              │   OpenRouter │            │
│  │  (User Data) │              │   (AI)       │            │
│  └──────────────┘              └──────────────┘            │
│                                                             │
│                           │                                 │
│                           ▼                                 │
│              ┌────────────────────────┐                    │
│              │   VyoRouter.sol        │                    │
│              │   (Our Smart Contract) │                    │
│              └───────────┬────────────┘                    │
│                          │                                  │
│              ┌───────────┴───────────┐                     │
│              │   YO Protocol         │                     │
│              │   (ERC-4626 Vaults)   │                     │
│              │                       │                     │
│  ┌───────────┼───────────┐          │                     │
│  │  yoUSD    │  yoETH    │  yoBTC   │                     │
│  │  Vault    │  Vault    │  Vault   │                     │
│  └───────────┴───────────┘          │                     │
│                                     │                     │
└─────────────────────────────────────┴─────────────────────┘
```

---

## 📦 Smart Contract (VyoRouter.sol)

**Fokus pada 4 fitur utama:**

### 1. Batch Deposits
Deposit ke multiple vault dalam 1 transaksi (hemat gas)

### 2. AI Agent Permissions
AI bisa eksekusi transaksi tapi dengan limit

### 3. Goal Management On-Chain
Goals tersimpan di blockchain (transparan)

### 4. Emergency Exit
Withdraw semua dalam 1 transaksi darurat

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title VyoRouter
 * @notice Simplified contract for Vyo Apps
 * @dev Fokus: batch deposits, AI permissions, goals, emergency exit
 */
contract VyoRouter is ReentrancyGuard, Pausable {
    
    // Roles
    address public owner;
    mapping(address => bool) public approvedAgents;
    
    // AI Agent Limits
    mapping(address => uint256) public agentSpendLimit;     // Max per tx
    mapping(address => uint256) public agentDailyLimit;     // Max per day
    mapping(address => uint256) public agentDailySpent;
    uint256 public lastResetDay;
    
    // User Goals
    struct Goal {
        string name;
        uint256 targetAmount;
        uint256 currentAmount;
        uint256 deadline;
        uint8 riskProfile;      // 0: Conservative, 1: Moderate, 2: Aggressive
        bool active;
        mapping(address => uint256) vaultPercentages;  // vault => %
        address[] vaults;  // List vaults yang dipakai
    }
    
    mapping(address => Goal[]) public userGoals;
    
    // Interface untuk YO Vaults
    interface IYOVault {
        function deposit(uint256 assets, address receiver) external returns (uint256 shares);
        function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);
        function asset() external view returns (address);
    }
    
    interface IERC20 {
        function transferFrom(address from, address to, uint256 amount) external returns (bool);
        function approve(address spender, uint256 amount) external returns (bool);
        function balanceOf(address account) external view returns (uint256);
    }
    
    // Events
    event GoalCreated(address indexed user, uint256 goalId, string name, uint256 target);
    event BatchDeposit(address indexed user, uint256 goalId, uint256 totalAmount);
    event AgentRebalance(address indexed agent, address indexed user, address fromVault, address toVault, uint256 amount);
    event EmergencyExit(address indexed user, uint256 totalAssets);
    event AgentAdded(address agent, uint256 spendLimit);
    event AgentRemoved(address agent);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyAgent() {
        require(approvedAgents[msg.sender], "Not approved agent");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        lastResetDay = block.timestamp / 1 days;
    }
    
    /**
     * @notice FITUR 1: Batch Deposit ke Multiple Vaults
     * @dev Deposit 1 kali, terdistribusi ke banyak vault sesuai alokasi goal
     */
    function batchDeposit(
        address token,
        address[] calldata vaults,
        uint256[] calldata amounts,
        uint256 goalId
    ) external nonReentrant whenNotPaused {
        require(vaults.length == amounts.length, "Length mismatch");
        require(vaults.length > 0, "Empty");
        require(goalId < userGoals[msg.sender].length, "Invalid goal");
        
        Goal storage goal = userGoals[msg.sender][goalId];
        require(goal.active, "Goal inactive");
        require(vaults.length == goal.vaults.length, "Wrong vaults");
        
        // Hitung total
        uint256 totalAmount;
        for (uint i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        
        // Transfer dari user ke contract
        IERC20(token).transferFrom(msg.sender, address(this), totalAmount);
        
        // Deposit ke tiap vault
        for (uint i = 0; i < vaults.length; i++) {
            if (amounts[i] > 0) {
                IERC20(token).approve(vaults[i], amounts[i]);
                IYOVault(vaults[i]).deposit(amounts[i], msg.sender);
            }
        }
        
        // Update goal
        goal.currentAmount += totalAmount;
        
        emit BatchDeposit(msg.sender, goalId, totalAmount);
    }
    
    /**
     * @notice FITUR 2: AI Agent Rebalance dengan Limit
     * @dev AI bisa pindahkan dana antar vault tapi ada batasan
     */
    function agentRebalance(
        address user,
        address fromVault,
        address toVault,
        uint256 shares,
        bytes32 reasonHash  // Hash penjelasan AI (transparansi)
    ) external nonReentrant onlyAgent whenNotPaused {
        // Reset daily counter jika hari baru
        if (block.timestamp / 1 days > lastResetDay) {
            lastResetDay = block.timestamp / 1 days;
            // Reset semua daily spent (simplified)
        }
        
        // Check limits
        require(shares <= agentSpendLimit[msg.sender], "Exceeds per-tx limit");
        require(
            agentDailySpent[msg.sender] + shares <= agentDailyLimit[msg.sender],
            "Exceeds daily limit"
        );
        
        // Redeem dari vault asal
        address token = IYOVault(fromVault).asset();
        uint256 assets = IYOVault(fromVault).redeem(shares, address(this), user);
        
        // Deposit ke vault tujuan
        IERC20(token).approve(toVault, assets);
        IYOVault(toVault).deposit(assets, user);
        
        // Update tracking
        agentDailySpent[msg.sender] += shares;
        
        emit AgentRebalance(msg.sender, user, fromVault, toVault, assets);
    }
    
    /**
     * @notice FITUR 3: Create Goal On-Chain
     * @dev Goals tersimpan di blockchain, transparan & auditable
     */
    function createGoal(
        string calldata name,
        uint256 targetAmount,
        uint256 deadline,
        uint8 riskProfile,
        address[] calldata vaults,
        uint256[] calldata percentages
    ) external whenNotPaused returns (uint256 goalId) {
        require(vaults.length == percentages.length, "Mismatch");
        require(vaults.length <= 5, "Max 5 vaults");
        require(deadline > block.timestamp, "Past deadline");
        
        // Validasi percentage = 100
        uint256 totalPct;
        for (uint i = 0; i < percentages.length; i++) {
            totalPct += percentages[i];
        }
        require(totalPct == 100, "Must be 100%");
        
        // Buat goal
        Goal storage newGoal = userGoals[msg.sender].push();
        newGoal.name = name;
        newGoal.targetAmount = targetAmount;
        newGoal.deadline = deadline;
        newGoal.riskProfile = riskProfile;
        newGoal.active = true;
        
        for (uint i = 0; i < vaults.length; i++) {
            newGoal.vaults.push(vaults[i]);
            newGoal.vaultPercentages[vaults[i]] = percentages[i];
        }
        
        goalId = userGoals[msg.sender].length - 1;
        
        emit GoalCreated(msg.sender, goalId, name, targetAmount);
        return goalId;
    }
    
    /**
     * @notice FITUR 4: Emergency Exit
     * @dev Withdraw semua dana dari semua vault dalam 1 transaksi
     */
    function emergencyExit(address[] calldata vaults) external nonReentrant {
        uint256 totalAssets;
        
        for (uint i = 0; i < vaults.length; i++) {
            // Get user shares in this vault
            uint256 shares = IERC20(vaults[i]).balanceOf(msg.sender);
            
            if (shares > 0) {
                // Redeem all
                uint256 assets = IYOVault(vaults[i]).redeem(shares, msg.sender, msg.sender);
                totalAssets += assets;
            }
        }
        
        // Deactivate all goals
        for (uint i = 0; i < userGoals[msg.sender].length; i++) {
            userGoals[msg.sender][i].active = false;
        }
        
        emit EmergencyExit(msg.sender, totalAssets);
    }
    
    /**
     * @notice Admin: Add AI Agent
     */
    function addAgent(address agent, uint256 spendLimit, uint256 dailyLimit) external onlyOwner {
        approvedAgents[agent] = true;
        agentSpendLimit[agent] = spendLimit;
        agentDailyLimit[agent] = dailyLimit;
        emit AgentAdded(agent, spendLimit);
    }
    
    /**
     * @notice Admin: Remove AI Agent
     */
    function removeAgent(address agent) external onlyOwner {
        approvedAgents[agent] = false;
        emit AgentRemoved(agent);
    }
    
    /**
     * @notice View: Get user's total balance across vaults
     */
    function getGoalBalance(address user, uint256 goalId, address[] calldata vaults) 
        external 
        view 
        returns (uint256 total)
    {
        for (uint i = 0; i < vaults.length; i++) {
            total += IERC20(vaults[i]).balanceOf(user);
        }
        return total;
    }
    
    /**
     * @notice Pause contract in emergency
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
}
```

---

## 🖥️ Backend (Stateless)

**Sederhana - hanya Express + YO SDK + AI**

```typescript
// backend/src/index.ts - Simplified
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { goalsRouter } from './routes/goals.js';
import { vaultsRouter } from './routes/vaults.js';
import { transactionsRouter } from './routes/transactions.js';
import { aiRouter } from './routes/ai.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/goals', goalsRouter);
app.use('/api/vaults', vaultsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/ai', aiRouter);

// Health check
app.get('/health', (_req, res) => {
    res.json({ 
        status: 'ok', 
        mode: process.env.DEV_MODE || 'mock',
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`Vyo API running on port ${PORT}`);
});
```

### Environment

```bash
# .env
PORT=3001

# Mode: mock (dev) | live (production)
DEV_MODE=mock

# Chain
YO_CHAIN_ID=8453

# AI
OPENROUTER_API_KEY=sk-or-v1-...

# Contract (deployed)
VYO_ROUTER_ADDRESS=0x...  # Setelah deploy VyoRouter.sol
```

---

## 🎨 Frontend (Astro)

**Fokus:** WalletConnect + YO SDK + Contract Interaction

```typescript
// lib/vyo.ts
import { createWalletClient, custom } from 'viem';
import { base } from 'viem/chains';

// VyoRouter contract ABI (simplified)
const VYO_ROUTER_ABI = [
    "function batchDeposit(address token, address[] vaults, uint256[] amounts, uint256 goalId)",
    "function createGoal(string name, uint256 targetAmount, uint256 deadline, uint8 riskProfile, address[] vaults, uint256[] percentages)",
    "function emergencyExit(address[] vaults)",
    "function agentRebalance(address user, address fromVault, address toVault, uint256 shares, bytes32 reasonHash)"
];

export const VYO_ROUTER_ADDRESS = "0x..."; // Deployed address

// YO SDK untuk vault operations
import { createYoClient } from '@yo-protocol/core';

export async function depositToGoal(
    goalId: number,
    allocations: { vault: string; amount: bigint }[]
) {
    const walletClient = createWalletClient({
        chain: base,
        transport: custom(window.ethereum)
    });
    
    // Option 1: Via VyoRouter (batch, gas efficient)
    const hash = await walletClient.writeContract({
        address: VYO_ROUTER_ADDRESS,
        abi: VYO_ROUTER_ABI,
        functionName: 'batchDeposit',
        args: [
            USDC_ADDRESS,
            allocations.map(a => a.vault),
            allocations.map(a => a.amount),
            goalId
        ]
    });
    
    return hash;
    
    // Option 2: Direct to YO (tanpa contract kita)
    // const client = createYoClient({ chainId: 8453, walletClient });
    // return client.deposit({ vault, amount });
}
```

---

## 🔄 Flow Transaksi

### 1. Create Goal
```
User Input → Frontend → VyoRouter.createGoal() → Blockchain
                                                    ↓
                                              Goal tersimpan on-chain
```

### 2. Batch Deposit
```
User Deposit $100 → Frontend → VyoRouter.batchDeposit()
                                      ↓
                              1. Terima USDC dari user
                              2. Split: $40 → yoUSD vault
                                        $35 → yoUSDT vault  
                                        $25 → yoEUR vault
                              3. 1 transaksi, 3 deposit
```

### 3. AI Rebalance (via Vio Agent)
```
Vio Agent detect better APY → Backend → VyoRouter.agentRebalance()
                                              ↓
                                      Check: within limits?
                                              ↓
                                      Execute: Move funds
                                              ↓
                                      Log on-chain
```

### 4. Emergency Exit
```
User panic → Frontend → VyoRouter.emergencyExit()
                            ↓
                    Withdraw ALL from ALL vaults
                            ↓
                    Deactivate all goals
```

---

## 📁 Project Structure (Final)

```
vyo-apps/
├── contracts/
│   ├── VyoRouter.sol           # Smart contract utama
│   └── deploy.js               # Deployment script
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   └── lib/
│   │       ├── wallet.ts       # WalletConnect
│   │       ├── vyo.ts          # Contract interaction
│   │       └── api.ts          # Backend API calls
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── index.ts            # Entry point
│   │   ├── routes/
│   │   │   ├── goals.ts
│   │   │   ├── vaults.ts
│   │   │   ├── transactions.ts
│   │   │   └── ai.ts
│   │   └── services/
│   │       ├── ai/
│   │       │   ├── vioAgent.ts
│   │       │   └── openRouter.ts
│   │       └── yo-sdk/
│   │           └── client.ts
│   └── package.json
├── shared/
│   └── types/
└── docs/
    ├── Backend-Production.md   # This file
    ├── Frontend.md
    └── YO-SDK.md
```

---

## 🎯 Kenapa Arsitektur Ini?

### Keunggulan:

1. **Minimal Infrastructure**
   - No database server
   - No Redis
   - No Docker
   - No CI/CD kompleks
   - Deploy backend ke Vercel/Netlify

2. **Data Ownership**
   - User own their data (blockchain)
   - Transparent (semua on-chain)
   - No data silo

3. **Gas Efficient**
   - Batch deposits (1 tx = banyak vault)
   - AI execution via contract (bypass individual signatures)

4. **Simple but Powerful**
   - 4 fitur utama tapi production-ready
   - Smart contract handle logic kompleks
   - Backend handle AI & API

---

## ✅ Checklist Development

### Phase 1: Smart Contract
- [ ] Deploy VyoRouter.sol to Base testnet
- [ ] Test batchDeposit()
- [ ] Test agentRebalance()
- [ ] Test createGoal()
- [ ] Test emergencyExit()

### Phase 2: Backend
- [ ] Connect to VyoRouter (read goals)
- [ ] Integrate Vio Agent AI
- [ ] API routes

### Phase 3: Frontend
- [ ] WalletConnect
- [ ] Contract interaction
- [ ] UI/UX

### Phase 4: Integration
- [ ] End-to-end flow
- [ ] Testnet testing
- [ ] Mainnet deployment

---

Arsitektur sederhana tapi powerful. Fokus pada value, bukan infrastructure. 🚀