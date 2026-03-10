# VyoRouter Smart Contract

Smart contract untuk Vyo Apps - Platform DeFi savings dengan AI-powered yield optimization.

## Fitur Utama

### 1. Batch Deposits
- Deposit ke multiple YO vaults dalam 1 transaksi
- Gas efficiency: Hemat gas untuk multi-vault deposits
- Auto-approval handling

### 2. AI Agent Permissions
- Approve AI agent dengan spending limits
- Daily spend limits untuk keamanan
- Agent dapat rebalance funds otomatis

### 3. Goal Management
- Create savings goals on-chain
- Track progress per goal
- Allocasi otomatis ke multiple vaults

### 4. Emergency Exit
- Withdraw all funds instantly
- Panic button functionality
- Priority untuk user safety

## Contract Architecture

```
VyoRouter
├── Goal Management
│   ├── createGoal()
│   ├── getUserGoals()
│   └── getGoalAllocations()
├── Batch Operations
│   ├── batchDeposit()
│   ├── batchRedeem()
│   └── emergencyExit()
├── AI Agent System
│   ├── approveAgent()
│   ├── revokeAgent()
│   └── agentRebalance()
└── View Functions
    ├── getUserVaultPosition()
    ├── calculateGoalYield()
    └── getUserDeposits()
```

## Deployed Addresses

### Base Mainnet
- **VyoRouter**: `TBD` (Not deployed yet)
- **USDC**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **yoUSD**: `0x3A43AEC53490CB9Fa922847385d82fe25d0e9dE7`

## Integration dengan YO Protocol

VyoRouter berinteraksi dengan YO vaults menggunakan interface ERC-4626:

```solidity
interface IYOVault {
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);
    function previewDeposit(uint256 assets) external view returns (uint256 shares);
    function previewRedeem(uint256 shares) external view returns (uint256 assets);
}
```

### Yield Mechanism

YO menggunakan ERC-4626 standard dimana:
- User deposit assets → Get shares
- Shares appreciate over time (exchange rate naik)
- Redeem shares → Get original assets + yield

## Usage Examples

### Create Goal
```solidity
bytes32 goalId = vyoRouter.createGoal(
    "Emergency Fund",           // name
    10000 * 1e6,               // target: 10,000 USDC
    block.timestamp + 365 days,// deadline
    3,                          // risk level (1-10)
    [yoUSD, yoETH],            // vaults
    [70, 30]                   // allocations: 70%, 30%
);
```

### Batch Deposit
```solidity
vyoRouter.batchDeposit(
    goalId,
    [yoUSD, yoETH],
    [7000 * 1e6, 3000 * 1e6],  // amounts
    10000 * 1e6               // total
);
```

### Approve AI Agent
```solidity
vyoRouter.approveAgent(
    agentAddress,
    500 * 1e6,                 // per-transaction limit: 500 USDC
    1000 * 1e6                // daily limit: 1000 USDC
);
```

### Emergency Exit
```solidity
vyoRouter.emergencyExit(goalId);
```

## Development

### Install Dependencies
```bash
cd contracts
forge install OpenZeppelin/openzeppelin-contracts
```

### Compile
```bash
forge build
```

### Test
```bash
forge test
```

### Deploy (Base Testnet)
```bash
forge script script/Deploy.s.sol --rpc-url $BASE_TESTNET_RPC --broadcast
```

## Security Considerations

1. **ReentrancyGuard**: All external functions protected
2. **Access Control**: Goal ownership checks
3. **Spend Limits**: AI agents have spending caps
4. **Non-custodial**: User maintains full control
5. **Emergency Exit**: Always available

## Events

- `GoalCreated`: New goal created
- `BatchDeposit`: Multi-vault deposit executed
- `AgentApproved`: AI agent authorized
- `AgentAction`: AI executed rebalance
- `EmergencyExit`: Emergency withdrawal executed

## License

MIT License - See LICENSE file
