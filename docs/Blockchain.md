# Vyo Apps — Blockchain + Smart Contract Agent Instructions

> **Role:** Blockchain + Smart Contract Lead
> **Stack:** YO SDK, Ethers.js, Foundry, Solidity, WalletConnect, zkSync Era
> **Chain Priority:** Base → Arbitrum → Ethereum (gas cost order)

---

## 🎯 Your Mission

You own **everything on-chain** for Vyo Apps:
1. **YO SDK wrapper** — clean service layer for all vault interactions
2. **WalletConnect** — user wallet connection and tx signing
3. **WealthOSRouter.sol** — smart contract for batch deposits + agent permissions
4. **zkSync Era deployment** — ZK quick win for demo
5. **Transaction management** — retry logic, error handling, gas estimation

**Core rule:** Never let a raw blockchain error reach the backend or frontend. Always translate to human-readable messages.

---

## 📁 Your Folder Ownership

```
backend/src/services/yo-sdk/        # YO SDK wrapper (consumed by backend)
contracts/                          # Smart contracts
├── src/
│   ├── WealthOSRouter.sol          # Main contract
│   └── interfaces/
│       └── IYOVault.sol
├── test/
│   └── WealthOSRouter.t.sol        # Foundry tests
├── script/
│   └── Deploy.s.sol                # Deployment script
└── foundry.toml

frontend/src/lib/
└── wallet.ts                       # WalletConnect frontend helpers
```

---

## 🔌 YO SDK Wrapper Service

This is the **single source of truth** for all YO Protocol interactions. Backend never calls YO SDK directly — always through this wrapper.

```typescript
// backend/src/services/yo-sdk/index.ts
import { YO } from '@yo-protocol/sdk';

const yo = new YO({
  apiKey: process.env.YO_SDK_API_KEY,
  chainId: getChainId(),           // prefer Base, fallback Arbitrum
});

// ─────────────────────────────────────
// 1. GET ALL VAULTS
// ─────────────────────────────────────
export async function getVaults(): Promise<Vault[]> {
  try {
    const vaults = await yo.getVaults();
    return vaults.map(normalizeVault);
  } catch (err) {
    throw new VyoError('Failed to fetch vaults', err);
  }
}

// ─────────────────────────────────────
// 2. GET VAULT DETAILS
// ─────────────────────────────────────
export async function getVaultDetails(vaultId: string): Promise<VaultDetail> {
  try {
    const detail = await yo.getVaultDetails(vaultId);
    return normalizeVaultDetail(detail);
  } catch (err) {
    throw new VyoError(`Failed to fetch vault ${vaultId}`, err);
  }
}

// ─────────────────────────────────────
// 3. SINGLE DEPOSIT
// ─────────────────────────────────────
export async function deposit(
  vaultId: string,
  amount: number,
  userAddress: string
): Promise<TxResult> {
  try {
    const tx = await yo.deposit(vaultId, amount, userAddress);
    await tx.wait();
    return { txHash: tx.hash, status: 'confirmed', amount, vaultId };
  } catch (err) {
    return handleTxError(err, 'deposit');
  }
}

// ─────────────────────────────────────
// 4. REDEEM / WITHDRAW
// ─────────────────────────────────────
export async function redeem(
  vaultId: string,
  amount: number,
  userAddress: string
): Promise<TxResult> {
  try {
    const tx = await yo.redeem(vaultId, amount, userAddress);
    await tx.wait();
    return { txHash: tx.hash, status: 'confirmed', amount, vaultId };
  } catch (err) {
    return handleTxError(err, 'redeem');
  }
}

// ─────────────────────────────────────
// 5. GET USER POSITION
// ─────────────────────────────────────
export async function getUserPosition(
  vaultId: string,
  userAddress: string
): Promise<UserPosition> {
  try {
    return await yo.getUserPosition(vaultId, userAddress);
  } catch (err) {
    throw new VyoError('Failed to fetch position', err);
  }
}

// ─────────────────────────────────────
// 6. GET YIELD EARNED
// ─────────────────────────────────────
export async function getYieldEarned(
  vaultId: string,
  userAddress: string
): Promise<number> {
  try {
    return await yo.getYieldEarned(vaultId, userAddress);
  } catch (err) {
    throw new VyoError('Failed to fetch yield', err);
  }
}

// ─────────────────────────────────────
// MULTI-VAULT BATCH DEPOSIT (core pattern)
// ─────────────────────────────────────
export async function batchDepositToGoal(
  allocations: VaultAllocation[],
  totalAmount: number,
  userAddress: string
): Promise<BatchResult> {
  const txPromises = allocations.map(allocation => {
    const amount = (allocation.percentage / 100) * totalAmount;
    return deposit(allocation.vaultId, amount, userAddress);
  });

  const results = await Promise.allSettled(txPromises);

  const succeeded = results.filter(r => r.status === 'fulfilled');
  const failed = results.filter(r => r.status === 'rejected');

  if (failed.length > 0) {
    // Log failed legs, retry once
    await retryFailedDeposits(failed, userAddress);
  }

  return {
    total: totalAmount,
    succeeded: succeeded.length,
    failed: failed.length,
    txHashes: succeeded.map(r => (r as PromiseFulfilledResult<TxResult>).value.txHash),
  };
}

// ─────────────────────────────────────
// GAS ESTIMATION
// ─────────────────────────────────────
export async function estimateGas(
  operation: 'deposit' | 'redeem' | 'rebalance'
): Promise<GasEstimate> {
  const gasPrice = await provider.getFeeData();
  const gasUnits = { deposit: 150000, redeem: 120000, rebalance: 280000 };
  const gasCostWei = gasPrice.maxFeePerGas! * BigInt(gasUnits[operation]);
  const gasCostUSD = await weiToUSD(gasCostWei);
  return { gasCostUSD, gasCostWei: gasCostWei.toString() };
}

// ─────────────────────────────────────
// ERROR TRANSLATOR
// ─────────────────────────────────────
function handleTxError(err: any, operation: string): never {
  const errorMap: Record<string, string> = {
    'insufficient funds':     'Not enough balance to complete this transaction.',
    'user rejected':          'Transaction was cancelled.',
    'nonce too low':          'Please try again — transaction conflict detected.',
    'execution reverted':     'Transaction failed. The vault may be paused.',
  };

  const matched = Object.entries(errorMap).find(([key]) =>
    err.message?.toLowerCase().includes(key)
  );

  throw new VyoError(
    matched ? matched[1] : `${operation} failed. Please try again.`,
    err
  );
}
```

---

## 📜 Smart Contract: WealthOSRouter.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IYOVault {
    function deposit(uint256 amount) external returns (uint256 shares);
    function redeem(uint256 shares) external returns (uint256 amount);
    function balanceOf(address user) external view returns (uint256);
}

contract WealthOSRouter is Ownable, ReentrancyGuard {

    // ─────────────────────────────────────
    // STATE
    // ─────────────────────────────────────
    mapping(address => bool)    public approvedAgents;
    mapping(address => uint256) public agentSpendLimit;   // max USD per tx (in wei)
    mapping(address => bool)    public approvedVaults;    // whitelist YO vaults only

    // ─────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────
    event BatchDeposit(address indexed user, uint256 totalAmount, uint256 vaultCount);
    event AgentRebalance(address indexed agent, address from, address to, uint256 amount);
    event EmergencyExit(address indexed user, uint256 vaultCount);
    event AgentAdded(address agent, uint256 spendLimit);
    event VaultApproved(address vault);

    constructor() Ownable(msg.sender) {}

    // ─────────────────────────────────────
    // BATCH DEPOSIT: 1 tx → multiple vaults
    // Saves gas vs 3 separate txs
    // ─────────────────────────────────────
    function batchDeposit(
        address   token,
        address[] calldata vaults,
        uint256[] calldata amounts
    ) external nonReentrant {
        require(vaults.length == amounts.length, "Array length mismatch");
        require(vaults.length <= 10, "Max 10 vaults per batch");

        uint256 totalAmount = 0;
        for (uint i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }

        // Pull total from user in one transfer
        IERC20(token).transferFrom(msg.sender, address(this), totalAmount);

        // Distribute to each vault
        for (uint i = 0; i < vaults.length; i++) {
            require(approvedVaults[vaults[i]], "Vault not approved");
            IERC20(token).approve(vaults[i], amounts[i]);
            IYOVault(vaults[i]).deposit(amounts[i]);
        }

        emit BatchDeposit(msg.sender, totalAmount, vaults.length);
    }

    // ─────────────────────────────────────
    // AGENT REBALANCE: Vera executes autonomously
    // Agent has scoped permissions — not full custody
    // ─────────────────────────────────────
    function agentRebalance(
        address token,
        address fromVault,
        address toVault,
        uint256 amount,
        address userAddress
    ) external nonReentrant onlyAgent {
        require(amount <= agentSpendLimit[msg.sender], "Exceeds agent spend limit");
        require(approvedVaults[fromVault], "Source vault not approved");
        require(approvedVaults[toVault], "Target vault not approved");

        // Redeem from source vault
        IYOVault(fromVault).redeem(amount);

        // Re-deposit to target vault
        IERC20(token).approve(toVault, amount);
        IYOVault(toVault).deposit(amount);

        emit AgentRebalance(msg.sender, fromVault, toVault, amount);
    }

    // ─────────────────────────────────────
    // EMERGENCY EXIT: Panic button
    // Pulls everything back to stablecoin
    // ─────────────────────────────────────
    function emergencyExit(
        address[] calldata vaults
    ) external nonReentrant {
        for (uint i = 0; i < vaults.length; i++) {
            require(approvedVaults[vaults[i]], "Vault not approved");
            uint256 balance = IYOVault(vaults[i]).balanceOf(msg.sender);
            if (balance > 0) {
                IYOVault(vaults[i]).redeem(balance);
            }
        }
        emit EmergencyExit(msg.sender, vaults.length);
    }

    // ─────────────────────────────────────
    // ADMIN: Manage agents and vaults
    // ─────────────────────────────────────
    function addAgent(address agent, uint256 spendLimit) external onlyOwner {
        approvedAgents[agent] = true;
        agentSpendLimit[agent] = spendLimit;
        emit AgentAdded(agent, spendLimit);
    }

    function removeAgent(address agent) external onlyOwner {
        approvedAgents[agent] = false;
    }

    function approveVault(address vault) external onlyOwner {
        approvedVaults[vault] = true;
        emit VaultApproved(vault);
    }

    modifier onlyAgent() {
        require(approvedAgents[msg.sender], "Caller is not an approved agent");
        _;
    }
}
```

---

## 🧪 Contract Tests (Foundry)

```solidity
// contracts/test/WealthOSRouter.t.sol
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/WealthOSRouter.sol";

contract WealthOSRouterTest is Test {
    WealthOSRouter router;
    address user    = address(0x1);
    address agent   = address(0x2);
    address vault1  = address(0x3);
    address vault2  = address(0x4);

    function setUp() public {
        router = new WealthOSRouter();
        router.addAgent(agent, 1000 ether);
        router.approveVault(vault1);
        router.approveVault(vault2);
    }

    function test_BatchDeposit() public {
        // setup mock token + vaults
        // assert 1 tx = 2 deposits
    }

    function test_AgentRebalance_WithinLimit() public {
        vm.prank(agent);
        // assert rebalance executes
    }

    function test_AgentRebalance_ExceedsLimit_Reverts() public {
        vm.prank(agent);
        vm.expectRevert("Exceeds agent spend limit");
        // assert revert
    }

    function test_EmergencyExit() public {
        vm.prank(user);
        // assert all positions redeemed
    }

    function test_UnapprovedVault_Reverts() public {
        vm.expectRevert("Vault not approved");
        // assert revert
    }
}
```

---

## 🚀 Deployment: zkSync Era (Hackathon)

Deploy on **zkSync Era Sepolia testnet** for ZK-proven transactions:

```bash
# Install zkSync Foundry plugin
forge install matter-labs/foundry-zksync

# Deploy to zkSync Era Sepolia
forge create contracts/src/WealthOSRouter.sol:WealthOSRouter \
  --rpc-url https://sepolia.era.zksync.dev \
  --private-key $DEPLOYER_PK \
  --zksync

# Verify contract
forge verify-contract $CONTRACT_ADDRESS WealthOSRouter \
  --chain 300 \
  --zksync
```

**Why zkSync Era:**
- All transactions are ZK-proven automatically — zero extra code
- Testnet faucet available for demo
- Compatible with standard Solidity + Ethers.js

---

## 🔗 WalletConnect Frontend Integration

```typescript
// frontend/src/lib/wallet.ts
import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi';
import { base, arbitrum, zkSync } from 'wagmi/chains';

const chains = [base, arbitrum, zkSync] as const;

export const config = defaultWagmiConfig({
  chains,
  projectId: import.meta.env.PUBLIC_WALLETCONNECT_ID,
  metadata: {
    name: 'Vyo',
    description: 'Your intelligent financial OS',
    url: 'https://vyo.finance',
    icons: ['/logo.png'],
  },
});

// Connect wallet
export async function connectWallet() {
  const modal = createWeb3Modal({ wagmiConfig: config, projectId });
  await modal.open();
}

// Sign message for SIWE auth
export async function signInWithEthereum(nonce: string) {
  const { address } = getAccount(config);
  const message = new SiweMessage({
    domain: window.location.host,
    address,
    statement: 'Sign in to Vyo',
    uri: window.location.origin,
    version: '1',
    chainId: 1,
    nonce,
  });
  const signature = await signMessage(config, { message: message.prepareMessage() });
  return { message: message.prepareMessage(), signature };
}
```

---

## ⛽ Gas Optimization Rules

1. **Prefer Base or zkSync** — L2 gas is 10-100x cheaper than Ethereum mainnet.
2. **Batch deposits always** — 1 tx via WealthOSRouter vs 3 separate tx = 60% gas savings.
3. **Check gas before rebalance** — never execute if gas > 50% of expected annual yield gain.
4. **Cache vault data** — don't call `getVaults()` on every request; cache in Redis 5 min.
5. **Agent rebalances off-peak** — schedule for low-gas windows (weekends, late night UTC).

---

## 🔐 Security Checklist

- [ ] ReentrancyGuard on all state-changing functions
- [ ] Vault whitelist — only approved YO vaults can be used
- [ ] Agent spend limit — hard cap per transaction
- [ ] onlyOwner for admin functions
- [ ] No selfdestruct, no delegatecall to unknown addresses
- [ ] All amounts validated > 0 before execution
- [ ] Events emitted for all state changes (for transparency log)

---

## 📅 10-Day Sprint

| Hari | Deliverable |
|---|---|
| 1 | YO SDK wrapper skeleton + all 6 functions stubbed |
| 2 | YO SDK wrapper complete + error translator |
| 3 | batchDepositToGoal + gas estimation functions |
| 4 | WalletConnect integration (frontend/src/lib/wallet.ts) |
| 5 | WealthOSRouter.sol complete (batchDeposit + agentRebalance + emergencyExit) |
| 6 | Foundry tests for all contract functions |
| 7 | Deploy to zkSync Era Sepolia testnet |
| 8 | Emergency exit flow end-to-end test |
| 9 | Integration test with backend (full deposit → vault → position fetch) |
| 10 | Demo transactions setup (pre-funded wallets, test vaults) |

---

## 🤝 Interfaces with Other Agents

- **Backend Agent** — exports `batchDepositToGoal`, `redeem`, `getVaults`, `estimateGas`, `getUserPosition`
- **Frontend Agent** — exports `connectWallet`, `signInWithEthereum` from `wallet.ts`
- **SC Agent** — this file IS the SC agent; contract address shared via `process.env.ROUTER_CONTRACT_ADDRESS`

---

## 📋 Shared Environment Variables

```bash
# Blockchain
YO_SDK_API_KEY=...
DEPLOYER_PK=...                          # For contract deployment only
ROUTER_CONTRACT_ADDRESS=...              # After deploy, share with backend agent
RPC_URL_BASE=https://mainnet.base.org
RPC_URL_ZKSYNC=https://mainnet.era.zksync.io
RPC_URL_SEPOLIA_ZKSYNC=https://sepolia.era.zksync.dev

# Frontend
PUBLIC_WALLETCONNECT_ID=...
PUBLIC_ROUTER_CONTRACT=...               # Same as ROUTER_CONTRACT_ADDRESS
```
