// ============================================================
// VyoRouter Contract ABI
// Generated from VyoRouter.sol
// ============================================================

export const VYOROUTER_ABI = [
  // Goal Management
  "function createGoal(string name, uint256 targetAmount, uint256 deadline, uint8 riskLevel, address[] vaults, uint256[] percentages) external returns (bytes32)",
  "function getUserGoals(address user) external view returns (tuple(bytes32 id, address owner, string name, uint256 targetAmount, uint256 currentAmount, uint256 deadline, uint8 riskLevel, bool active, bytes32[] vaultAllocations)[])",
  "function getGoalAllocations(bytes32 goalId) external view returns (tuple(bytes32 goalId, address vault, uint256 percentage, uint256 depositedAmount, uint256 shares)[])",
  "function getGoalCount(address user) external view returns (uint256)",
  
  // Deposits
  "function batchDeposit(bytes32 goalId, address[] vaults, uint256[] amounts, uint256 totalAmount) external",
  "function depositToVault(address vault, uint256 amount, bytes32 goalId) external",
  
  // Withdrawals
  "function batchRedeem(bytes32 goalId, address[] vaults, uint256[] shares) external",
  "function emergencyExit(bytes32 goalId) external",
  
  // AI Agent
  "function approveAgent(address agent, uint256 spendLimit, uint256 maxDailySpend) external",
  "function revokeAgent(address agent) external",
  "function isAgentApproved(address user, address agent) external view returns (bool)",
  "function getAgentPermission(address user) external view returns (tuple(bool approved, uint256 spendLimit, uint256 spentToday, uint256 lastResetTime, uint256 maxDailySpend))",
  "function agentRebalance(address user, bytes32 goalId, address fromVault, address toVault, uint256 shares) external",
  
  // Automation
  "function setAutomationConfig(bytes32 goalId, bool autoCompound, bool autoRebalance, uint256 compoundIntervalDays, uint256 rebalanceThresholdBps, uint256 minCompoundAmount) external",
  "function disableAutomation(bytes32 goalId) external",
  "function getAutomationConfig(bytes32 goalId) external view returns (tuple(bool enabled, bool autoCompound, bool autoRebalance, uint256 compoundIntervalDays, uint256 rebalanceThresholdBps, uint256 minCompoundAmount))",
  "function compoundYield(bytes32 goalId) external",
  "function keeperCompound(bytes32 goalId) external",
  "function lastCompoundTime(bytes32 goalId) external view returns (uint256)",
  "function setKeeperRegistry(address registry) external",
  "function setUpkeepInterval(uint256 interval) external",
  "function keeperRegistry() external view returns (address)",
  "function lastUpkeepTime() external view returns (uint256)",
  "function upkeepInterval() external view returns (uint256)",
  
  // View Functions
  "function getUserVaultPosition(address user, address vault) external view returns (uint256 shares, uint256 assets)",
  "function getUserDeposits(address user) external view returns (tuple(uint256 timestamp, address vault, uint256 amount, uint256 sharesReceived, bytes32 goalId)[])",
  "function calculateGoalYield(bytes32 goalId) external view returns (uint256)",
  "function getApprovedAgents() external view returns (address[])",
  
  // Events
  "event GoalCreated(bytes32 indexed goalId, address indexed owner, string name, uint256 targetAmount, uint256 deadline)",
  "event BatchDeposit(address indexed user, bytes32 indexed goalId, uint256 totalAmount, uint256 vaultCount)",
  "event SingleDeposit(address indexed user, address indexed vault, uint256 amount, uint256 shares, bytes32 indexed goalId)",
  "event BatchRedeem(address indexed user, bytes32 indexed goalId, uint256 totalShares, uint256 vaultCount)",
  "event EmergencyExit(address indexed user, uint256 totalAmount, uint256 vaultCount)",
  "event AgentApproved(address indexed agent, uint256 spendLimit, uint256 maxDailySpend)",
  "event AgentRevoked(address indexed agent)",
  "event AgentAction(address indexed agent, address indexed user, address indexed fromVault, address toVault, uint256 amount, bytes32 goalId)",
  "event AutomationConfigured(bytes32 indexed goalId, bool autoCompound, bool autoRebalance, uint256 compoundIntervalDays)",
  "event AutomationDisabled(bytes32 indexed goalId)",
  "event YieldCompounded(bytes32 indexed goalId, uint256 yieldAmount, uint256 newTotalShares)",
  "event UpkeepExecuted(bytes32 indexed goalId, string action)",
] as const;

// ERC20 ABI for approvals
export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
] as const;

// Type definitions
export interface Goal {
  id: string;
  owner: string;
  name: string;
  targetAmount: bigint;
  currentAmount: bigint;
  deadline: bigint;
  riskLevel: number;
  active: boolean;
  vaultAllocations: string[];
}

export interface VaultAllocation {
  goalId: string;
  vault: string;
  percentage: number;
  depositedAmount: bigint;
  shares: bigint;
}

export interface AgentPermission {
  approved: boolean;
  spendLimit: bigint;
  spentToday: bigint;
  lastResetTime: bigint;
  maxDailySpend: bigint;
}

export interface AutomationConfig {
  enabled: boolean;
  autoCompound: boolean;
  autoRebalance: boolean;
  compoundIntervalDays: number;
  rebalanceThresholdBps: number;
  minCompoundAmount: bigint;
}
