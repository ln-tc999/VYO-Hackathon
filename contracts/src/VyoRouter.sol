// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VyoRouter
 * @notice Smart contract for Vyo Apps - Batch deposits, AI permissions, and goal management
 * @dev Interacts with YO Protocol vaults (ERC-4626)
 */
contract VyoRouter is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ============ Structs ============
    
    struct Goal {
        bytes32 id;
        address owner;
        string name;
        uint256 targetAmount;
        uint256 currentAmount;
        uint256 deadline;
        uint8 riskLevel; // 1-10 (1=conservative, 10=aggressive)
        bool active;
        bytes32[] vaultAllocations;
    }

    struct VaultAllocation {
        bytes32 goalId;
        address vault;
        uint256 percentage;
        uint256 depositedAmount;
        uint256 shares;
    }

    struct AgentPermission {
        bool approved;
        uint256 spendLimit;
        uint256 spentToday;
        uint256 lastResetTime;
        uint256 maxDailySpend;
    }

    struct DepositRecord {
        uint256 timestamp;
        address vault;
        uint256 amount;
        uint256 sharesReceived;
        bytes32 goalId;
    }

    // ============ State Variables ============
    
    // YO Protocol Vault Interface
    // TODO: Update with actual testnet vault address
    IYOVault public constant yoUSD = IYOVault(0x0000000000000000000000000000000000000000);
    
    // User data
    mapping(address => Goal[]) public userGoals;
    mapping(bytes32 => VaultAllocation[]) public goalAllocations;
    mapping(address => AgentPermission) public agentPermissions;
    mapping(address => DepositRecord[]) public userDeposits;
    mapping(address => mapping(address => uint256)) public userVaultShares;
    
    // AI Agents
    mapping(address => bool) public approvedAgents;
    address[] public agentList;
    
    // Configuration
    uint256 public constant MAX_DAILY_SPEND_DEFAULT = 1000 * 1e6; // 1000 USDC
    uint256 public constant DAY_IN_SECONDS = 86400;
    
    // USDC on Base Sepolia Testnet
    IERC20 public constant USDC = IERC20(0x036cBd53842c5426634E92B0C9D5eb112A4E1d4d);
    
    // ============ Events ============
    
    event GoalCreated(
        bytes32 indexed goalId,
        address indexed owner,
        string name,
        uint256 targetAmount,
        uint256 deadline
    );
    
    event GoalUpdated(
        bytes32 indexed goalId,
        uint256 currentAmount,
        uint256 newTargetAmount
    );
    
    event BatchDeposit(
        address indexed user,
        bytes32 indexed goalId,
        uint256 totalAmount,
        uint256 vaultCount
    );
    
    event SingleDeposit(
        address indexed user,
        address indexed vault,
        uint256 amount,
        uint256 shares,
        bytes32 indexed goalId
    );
    
    event BatchRedeem(
        address indexed user,
        bytes32 indexed goalId,
        uint256 totalShares,
        uint256 vaultCount
    );
    
    event AgentApproved(
        address indexed agent,
        uint256 spendLimit,
        uint256 maxDailySpend
    );
    
    event AgentRevoked(address indexed agent);
    
    event AgentAction(
        address indexed agent,
        address indexed user,
        address indexed fromVault,
        address toVault,
        uint256 amount,
        bytes32 goalId
    );
    
    event EmergencyExit(
        address indexed user,
        uint256 totalAmount,
        uint256 vaultCount
    );
    
    event YieldHarvested(
        address indexed user,
        address indexed vault,
        uint256 yieldAmount
    );

    // ============ Modifiers ============
    
    modifier onlyAgent() {
        require(approvedAgents[msg.sender], "VyoRouter: Not authorized agent");
        _;
    }
    
    modifier onlyGoalOwner(bytes32 _goalId) {
        require(isGoalOwner(msg.sender, _goalId), "VyoRouter: Not goal owner");
        _;
    }
    
    modifier withinSpendLimit(address _user, uint256 _amount) {
        AgentPermission storage perm = agentPermissions[_user];
        require(perm.approved, "VyoRouter: Agent not approved for user");
        
        // Reset daily spend if needed
        if (block.timestamp >= perm.lastResetTime + DAY_IN_SECONDS) {
            perm.spentToday = 0;
            perm.lastResetTime = block.timestamp;
        }
        
        require(
            perm.spentToday + _amount <= perm.maxDailySpend,
            "VyoRouter: Daily spend limit exceeded"
        );
        require(_amount <= perm.spendLimit, "VyoRouter: Exceeds spend limit");
        _;
    }

    // ============ Constructor ============
    
    constructor() Ownable(msg.sender) {}

    // ============ Goal Management ============
    
    /**
     * @notice Create a new savings goal
     * @param _name Goal name
     * @param _targetAmount Target amount in USDC (6 decimals)
     * @param _deadline Deadline timestamp
     * @param _riskLevel Risk level (1-10)
     * @param _vaults Array of vault addresses
     * @param _percentages Allocation percentages (must sum to 100)
     */
    function createGoal(
        string calldata _name,
        uint256 _targetAmount,
        uint256 _deadline,
        uint8 _riskLevel,
        address[] calldata _vaults,
        uint256[] calldata _percentages
    ) external returns (bytes32 goalId) {
        require(_vaults.length == _percentages.length, "VyoRouter: Length mismatch");
        require(_vaults.length > 0, "VyoRouter: Empty allocation");
        require(_riskLevel >= 1 && _riskLevel <= 10, "VyoRouter: Invalid risk level");
        require(_deadline > block.timestamp, "VyoRouter: Invalid deadline");
        
        // Verify percentages sum to 100
        uint256 totalPercentage = 0;
        for (uint i = 0; i < _percentages.length; i++) {
            totalPercentage += _percentages[i];
        }
        require(totalPercentage == 100, "VyoRouter: Percentages must sum to 100");
        
        // Generate goal ID
        goalId = keccak256(abi.encodePacked(
            msg.sender,
            _name,
            block.timestamp,
            block.number
        ));
        
        // Create goal
        Goal memory newGoal = Goal({
            id: goalId,
            owner: msg.sender,
            name: _name,
            targetAmount: _targetAmount,
            currentAmount: 0,
            deadline: _deadline,
            riskLevel: _riskLevel,
            active: true,
            vaultAllocations: new bytes32[](_vaults.length)
        });
        
        // Create allocations
        for (uint i = 0; i < _vaults.length; i++) {
            bytes32 allocationId = keccak256(abi.encodePacked(
                goalId,
                _vaults[i],
                i
            ));
            
            goalAllocations[goalId].push(VaultAllocation({
                goalId: goalId,
                vault: _vaults[i],
                percentage: _percentages[i],
                depositedAmount: 0,
                shares: 0
            }));
            
            newGoal.vaultAllocations[i] = allocationId;
        }
        
        userGoals[msg.sender].push(newGoal);
        
        emit GoalCreated(goalId, msg.sender, _name, _targetAmount, _deadline);
        
        return goalId;
    }
    
    /**
     * @notice Get user's goals
     */
    function getUserGoals(address _user) external view returns (Goal[] memory) {
        return userGoals[_user];
    }
    
    /**
     * @notice Get goal allocations
     */
    function getGoalAllocations(bytes32 _goalId) external view returns (VaultAllocation[] memory) {
        return goalAllocations[_goalId];
    }
    
    /**
     * @notice Check if user owns a goal
     */
    function isGoalOwner(address _user, bytes32 _goalId) internal view returns (bool) {
        Goal[] memory goals = userGoals[_user];
        for (uint i = 0; i < goals.length; i++) {
            if (goals[i].id == _goalId) {
                return true;
            }
        }
        return false;
    }

    // ============ Batch Deposits ============
    
    /**
     * @notice Deposit to multiple vaults in one transaction (for a goal)
     * @param _goalId Goal ID
     * @param _vaults Array of vault addresses
     * @param _amounts Amounts to deposit to each vault (USDC)
     * @param _totalAmount Total USDC amount (must be approved)
     */
    function batchDeposit(
        bytes32 _goalId,
        address[] calldata _vaults,
        uint256[] calldata _amounts,
        uint256 _totalAmount
    ) external nonReentrant onlyGoalOwner(_goalId) {
        require(_vaults.length == _amounts.length, "VyoRouter: Length mismatch");
        require(_vaults.length > 0, "VyoRouter: Empty deposit");
        
        // Transfer USDC from user
        USDC.safeTransferFrom(msg.sender, address(this), _totalAmount);
        
        uint256 totalDeposited = 0;
        
        for (uint i = 0; i < _vaults.length; i++) {
            if (_amounts[i] == 0) continue;
            
            // Approve vault to spend
            IERC20 underlying = IYOVault(_vaults[i]).asset();
            underlying.approve(_vaults[i], _amounts[i]);
            
            // Deposit to YO vault
            uint256 shares = IYOVault(_vaults[i]).deposit(_amounts[i], address(this));
            
            // Track shares
            userVaultShares[msg.sender][_vaults[i]] += shares;
            
            // Update allocation
            VaultAllocation[] storage allocations = goalAllocations[_goalId];
            for (uint j = 0; j < allocations.length; j++) {
                if (allocations[j].vault == _vaults[i]) {
                    allocations[j].depositedAmount += _amounts[i];
                    allocations[j].shares += shares;
                    break;
                }
            }
            
            // Record deposit
            userDeposits[msg.sender].push(DepositRecord({
                timestamp: block.timestamp,
                vault: _vaults[i],
                amount: _amounts[i],
                sharesReceived: shares,
                goalId: _goalId
            }));
            
            totalDeposited += _amounts[i];
            
            emit SingleDeposit(msg.sender, _vaults[i], _amounts[i], shares, _goalId);
        }
        
        // Update goal current amount
        _updateGoalAmount(_goalId, totalDeposited);
        
        emit BatchDeposit(msg.sender, _goalId, totalDeposited, _vaults.length);
    }
    
    /**
     * @notice Simple deposit to single vault
     */
    function depositToVault(
        address _vault,
        uint256 _amount,
        bytes32 _goalId
    ) external nonReentrant onlyGoalOwner(_goalId) {
        // Transfer USDC
        USDC.safeTransferFrom(msg.sender, address(this), _amount);
        
        // Approve and deposit
        IERC20 underlying = IYOVault(_vault).asset();
        underlying.approve(_vault, _amount);
        
        uint256 shares = IYOVault(_vault).deposit(_amount, address(this));
        
        // Track shares
        userVaultShares[msg.sender][_vault] += shares;
        
        // Update allocation
        VaultAllocation[] storage allocations = goalAllocations[_goalId];
        for (uint i = 0; i < allocations.length; i++) {
            if (allocations[i].vault == _vault) {
                allocations[i].depositedAmount += _amount;
                allocations[i].shares += shares;
                break;
            }
        }
        
        // Record deposit
        userDeposits[msg.sender].push(DepositRecord({
            timestamp: block.timestamp,
            vault: _vault,
            amount: _amount,
            sharesReceived: shares,
            goalId: _goalId
        }));
        
        // Update goal
        _updateGoalAmount(_goalId, _amount);
        
        emit SingleDeposit(msg.sender, _vault, _amount, shares, _goalId);
    }

    // ============ Withdrawals ============
    
    /**
     * @notice Batch redeem from multiple vaults
     */
    function batchRedeem(
        bytes32 _goalId,
        address[] calldata _vaults,
        uint256[] calldata _shares
    ) external nonReentrant onlyGoalOwner(_goalId) {
        require(_vaults.length == _shares.length, "VyoRouter: Length mismatch");
        
        uint256 totalAssets = 0;
        
        for (uint i = 0; i < _vaults.length; i++) {
            if (_shares[i] == 0) continue;
            
            // Redeem from vault
            uint256 assets = IYOVault(_vaults[i]).redeem(
                _shares[i],
                address(this),
                address(this)
            );
            
            // Update shares tracking
            userVaultShares[msg.sender][_vaults[i]] -= _shares[i];
            
            // Update allocation
            VaultAllocation[] storage allocations = goalAllocations[_goalId];
            for (uint j = 0; j < allocations.length; j++) {
                if (allocations[j].vault == _vaults[i]) {
                    allocations[j].shares -= _shares[i];
                    // Calculate proportional amount removed
                    uint256 amountRemoved = (allocations[j].depositedAmount * _shares[i]) / 
                        (allocations[j].shares + _shares[i]); // Original shares
                    allocations[j].depositedAmount -= amountRemoved;
                    break;
                }
            }
            
            totalAssets += assets;
        }
        
        // Transfer USDC to user
        USDC.safeTransfer(msg.sender, totalAssets);
        
        // Update goal
        _updateGoalAmount(_goalId, 0, true);
        
        emit BatchRedeem(msg.sender, _goalId, totalAssets, _vaults.length);
    }
    
    /**
     * @notice Emergency exit - withdraw everything from all vaults
     */
    function emergencyExit(bytes32 _goalId) external nonReentrant onlyGoalOwner(_goalId) {
        VaultAllocation[] storage allocations = goalAllocations[_goalId];
        uint256 totalAssets = 0;
        uint256 vaultCount = 0;
        
        for (uint i = 0; i < allocations.length; i++) {
            if (allocations[i].shares == 0) continue;
            
            // Redeem all shares
            uint256 assets = IYOVault(allocations[i].vault).redeem(
                allocations[i].shares,
                address(this),
                address(this)
            );
            
            totalAssets += assets;
            vaultCount++;
            
            // Clear shares
            userVaultShares[msg.sender][allocations[i].vault] -= allocations[i].shares;
            allocations[i].shares = 0;
            allocations[i].depositedAmount = 0;
        }
        
        // Transfer all USDC to user
        USDC.safeTransfer(msg.sender, totalAssets);
        
        // Mark goal as inactive
        _deactivateGoal(_goalId);
        
        emit EmergencyExit(msg.sender, totalAssets, vaultCount);
    }

    // ============ AI Agent Permissions ============
    
    /**
     * @notice Approve an AI agent to manage funds
     * @param _agent Agent address
     * @param _spendLimit Max per-transaction spend
     * @param _maxDailySpend Max daily spend limit
     */
    function approveAgent(
        address _agent,
        uint256 _spendLimit,
        uint256 _maxDailySpend
    ) external {
        require(_agent != address(0), "VyoRouter: Invalid agent");
        require(_spendLimit > 0, "VyoRouter: Invalid spend limit");
        
        if (!approvedAgents[_agent]) {
            approvedAgents[_agent] = true;
            agentList.push(_agent);
        }
        
        agentPermissions[msg.sender] = AgentPermission({
            approved: true,
            spendLimit: _spendLimit,
            spentToday: 0,
            lastResetTime: block.timestamp,
            maxDailySpend: _maxDailySpend > 0 ? _maxDailySpend : MAX_DAILY_SPEND_DEFAULT
        });
        
        emit AgentApproved(_agent, _spendLimit, _maxDailySpend);
    }
    
    /**
     * @notice Revoke agent approval
     */
    function revokeAgent(address _agent) external {
        require(approvedAgents[_agent], "VyoRouter: Agent not approved");
        
        agentPermissions[msg.sender].approved = false;
        
        emit AgentRevoked(_agent);
    }
    
    /**
     * @notice Check if agent is approved for user
     */
    function isAgentApproved(address _user, address _agent) external view returns (bool) {
        return approvedAgents[_agent] && agentPermissions[_user].approved;
    }
    
    /**
     * @notice Get agent permission details
     */
    function getAgentPermission(address _user) external view returns (AgentPermission memory) {
        return agentPermissions[_user];
    }

    // ============ Agent Actions ============
    
    /**
     * @notice Agent rebalances funds between vaults (with user approval)
     * @param _user User address
     * @param _goalId Goal ID
     * @param _fromVault Vault to withdraw from
     * @param _toVault Vault to deposit to
     * @param _shares Amount of shares to move
     */
    function agentRebalance(
        address _user,
        bytes32 _goalId,
        address _fromVault,
        address _toVault,
        uint256 _shares
    ) external onlyAgent withinSpendLimit(_user, _shares) nonReentrant {
        require(isGoalOwner(_user, _goalId), "VyoRouter: Invalid goal");
        
        // Calculate asset value
        uint256 assets = IYOVault(_fromVault).previewRedeem(_shares);
        
        // Update spend tracking
        agentPermissions[_user].spentToday += assets;
        
        // 1. Redeem from source vault
        uint256 actualAssets = IYOVault(_fromVault).redeem(
            _shares,
            address(this),
            address(this)
        );
        
        // 2. Deposit to target vault
        IERC20 underlying = IYOVault(_toVault).asset();
        underlying.approve(_toVault, actualAssets);
        uint256 newShares = IYOVault(_toVault).deposit(actualAssets, address(this));
        
        // 3. Update allocations
        VaultAllocation[] storage allocations = goalAllocations[_goalId];
        for (uint i = 0; i < allocations.length; i++) {
            if (allocations[i].vault == _fromVault) {
                allocations[i].shares -= _shares;
                uint256 amountRemoved = (allocations[i].depositedAmount * _shares) / 
                    (allocations[i].shares + _shares);
                allocations[i].depositedAmount -= amountRemoved;
            }
            if (allocations[i].vault == _toVault) {
                allocations[i].shares += newShares;
                allocations[i].depositedAmount += actualAssets;
            }
        }
        
        // 4. Update user shares tracking
        userVaultShares[_user][_fromVault] -= _shares;
        userVaultShares[_user][_toVault] += newShares;
        
        emit AgentAction(msg.sender, _user, _fromVault, _toVault, _shares, _goalId);
    }

    // ============ View Functions ============
    
    /**
     * @notice Get user's position in a vault
     */
    function getUserVaultPosition(address _user, address _vault) 
        external 
        view 
        returns (uint256 shares, uint256 assets) 
    {
        shares = userVaultShares[_user][_vault];
        assets = IYOVault(_vault).previewRedeem(shares);
    }
    
    /**
     * @notice Get user's deposit history
     */
    function getUserDeposits(address _user) external view returns (DepositRecord[] memory) {
        return userDeposits[_user];
    }
    
    /**
     * @notice Calculate yield for a goal
     */
    function calculateGoalYield(bytes32 _goalId) external view returns (uint256) {
        VaultAllocation[] memory allocations = goalAllocations[_goalId];
        uint256 currentValue = 0;
        uint256 deposited = 0;
        
        for (uint i = 0; i < allocations.length; i++) {
            if (allocations[i].shares > 0) {
                currentValue += IYOVault(allocations[i].vault).previewRedeem(allocations[i].shares);
                deposited += allocations[i].depositedAmount;
            }
        }
        
        return currentValue > deposited ? currentValue - deposited : 0;
    }
    
    /**
     * @notice Get all approved agents
     */
    function getApprovedAgents() external view returns (address[] memory) {
        return agentList;
    }

    // ============ Internal Functions ============
    
    function _updateGoalAmount(bytes32 _goalId, uint256 _addedAmount, bool _subtract) internal {
        Goal[] storage goals = userGoals[msg.sender];
        for (uint i = 0; i < goals.length; i++) {
            if (goals[i].id == _goalId) {
                if (_subtract) {
                    // Recalculate from allocations
                    VaultAllocation[] memory allocations = goalAllocations[_goalId];
                    uint256 total = 0;
                    for (uint j = 0; j < allocations.length; j++) {
                        total += allocations[j].depositedAmount;
                    }
                    goals[i].currentAmount = total;
                } else {
                    goals[i].currentAmount += _addedAmount;
                }
                break;
            }
        }
    }
    
    function _updateGoalAmount(bytes32 _goalId, uint256 _addedAmount) internal {
        _updateGoalAmount(_goalId, _addedAmount, false);
    }
    
    function _deactivateGoal(bytes32 _goalId) internal {
        Goal[] storage goals = userGoals[msg.sender];
        for (uint i = 0; i < goals.length; i++) {
            if (goals[i].id == _goalId) {
                goals[i].active = false;
                goals[i].currentAmount = 0;
                break;
            }
        }
    }
}

// ============ Interfaces ============

interface IYOVault {
    function asset() external view returns (IERC20);
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);
    function previewDeposit(uint256 assets) external view returns (uint256 shares);
    function previewRedeem(uint256 shares) external view returns (uint256 assets);
    function balanceOf(address account) external view returns (uint256);
}
