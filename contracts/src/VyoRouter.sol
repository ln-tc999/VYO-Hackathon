// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VyoRouter
 * @notice Smart contract for Vyo Apps - Batch deposits, AI permissions, goal management, and Chainlink Automation
 * @dev Interacts with YO Protocol vaults (ERC-4626)
 */
contract VyoRouter is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ============ Chainlink Automation Interface ============
    
    /**
     * @notice Chainlink Automation Compatible Interface
     */
    function checkUpkeep(bytes calldata checkData)
        external
        view
        returns (bool upkeepNeeded, bytes memory performData)
    {
        // Check if enough time has passed since last upkeep
        if (block.timestamp - lastUpkeepTime < upkeepInterval) {
            return (false, bytes("Not time for upkeep"));
        }

        // Decode goalId from checkData
        bytes32 goalId;
        if (checkData.length > 0) {
            goalId = abi.decode(checkData, (bytes32));
        }

        // Check all active goals for automation needs
        return _checkUpkeepConditions(goalId);
    }

    /**
     * @notice Chainlink Automation executes this
     */
    function performUpkeep(bytes calldata performData) external {
        (bytes32 goalId, AutomationAction action) = abi.decode(
            performData,
            (bytes32, AutomationAction)
        );

        lastUpkeepTime = block.timestamp;

        if (action == AutomationAction.Compound) {
            _compoundYield(goalId);
        } else if (action == AutomationAction.Rebalance) {
            // Rebalance handled by agent with approval
            emit UpkeepExecuted(goalId, "Rebalance triggered - requires approval");
        } else if (action == AutomationAction.Check) {
            _checkGoalStatus(goalId);
        }
    }

    // ============ Structs ============

    struct Goal {
        bytes32 id;
        address owner;
        string name;
        uint256 targetAmount;
        uint256 currentAmount;
        uint256 deadline;
        uint8 riskLevel;
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

    struct AutomationConfig {
        bool enabled;
        bool autoCompound;
        bool autoRebalance;
        uint256 compoundIntervalDays;
        uint256 rebalanceThresholdBps;
        uint256 minCompoundAmount;
    }

    // ============ Automation Types ============

    enum AutomationAction {
        None,
        Compound,
        Rebalance,
        Check
    }

    // ============ State Variables ============

    // YO Protocol Vault (placeholder - update with actual)
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

    // Automation
    mapping(bytes32 => AutomationConfig) public automationConfigs;
    mapping(bytes32 => uint256) public lastCompoundTime;
    uint256 public lastUpkeepTime;
    uint256 public upkeepInterval = 1 days;
    address public keeperRegistry;

    // Configuration
    uint256 public constant MAX_DAILY_SPEND_DEFAULT = 1000 * 1e6;
    uint256 public constant DAY_IN_SECONDS = 86400;
    uint256 public constant MIN_COMPOUND_AMOUNT = 10 * 1e6; // $10 minimum

    // USDC on Base Sepolia
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

    // Automation Events
    event AutomationConfigured(
        bytes32 indexed goalId,
        bool autoCompound,
        bool autoRebalance,
        uint256 compoundIntervalDays
    );

    event AutomationDisabled(bytes32 indexed goalId);

    event UpkeepNeeded(
        bytes32 indexed goalId,
        AutomationAction action,
        string reason
    );

    event UpkeepExecuted(
        bytes32 indexed goalId,
        string action
    );

    event YieldCompounded(
        bytes32 indexed goalId,
        uint256 yieldAmount,
        uint256 newTotalShares
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

    modifier onlyKeeper() {
        require(
            msg.sender == keeperRegistry || msg.sender == owner(),
            "VyoRouter: Not authorized keeper"
        );
        _;
    }

    modifier withinSpendLimit(address _user, uint256 _amount) {
        AgentPermission storage perm = agentPermissions[_user];
        require(perm.approved, "VyoRouter: Agent not approved for user");

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

    constructor() Ownable(msg.sender) {
        lastUpkeepTime = block.timestamp;
    }

    // ============ Goal Management ============

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

        uint256 totalPercentage = 0;
        for (uint i = 0; i < _percentages.length; i++) {
            totalPercentage += _percentages[i];
        }
        require(totalPercentage == 100, "VyoRouter: Percentages must sum to 100");

        goalId = keccak256(abi.encodePacked(
            msg.sender,
            _name,
            block.timestamp,
            block.number
        ));

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

        // Initialize automation config with defaults
        automationConfigs[goalId] = AutomationConfig({
            enabled: false,
            autoCompound: false,
            autoRebalance: false,
            compoundIntervalDays: 7,
            rebalanceThresholdBps: 200, // 2%
            minCompoundAmount: MIN_COMPOUND_AMOUNT
        });

        emit GoalCreated(goalId, msg.sender, _name, _targetAmount, _deadline);

        return goalId;
    }

    function getUserGoals(address _user) external view returns (Goal[] memory) {
        return userGoals[_user];
    }

    function getGoalAllocations(bytes32 _goalId) external view returns (VaultAllocation[] memory) {
        return goalAllocations[_goalId];
    }

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

    function batchDeposit(
        bytes32 _goalId,
        address[] calldata _vaults,
        uint256[] calldata _amounts,
        uint256 _totalAmount
    ) external nonReentrant onlyGoalOwner(_goalId) {
        require(_vaults.length == _amounts.length, "VyoRouter: Length mismatch");
        require(_vaults.length > 0, "VyoRouter: Empty deposit");

        USDC.safeTransferFrom(msg.sender, address(this), _totalAmount);

        uint256 totalDeposited = 0;

        for (uint i = 0; i < _vaults.length; i++) {
            if (_amounts[i] == 0) continue;

            IERC20 underlying = IYOVault(_vaults[i]).asset();
            underlying.approve(_vaults[i], _amounts[i]);

            uint256 shares = IYOVault(_vaults[i]).deposit(_amounts[i], address(this));

            userVaultShares[msg.sender][_vaults[i]] += shares;

            VaultAllocation[] storage allocations = goalAllocations[_goalId];
            for (uint j = 0; j < allocations.length; j++) {
                if (allocations[j].vault == _vaults[i]) {
                    allocations[j].depositedAmount += _amounts[i];
                    allocations[j].shares += shares;
                    break;
                }
            }

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

        _updateGoalAmount(_goalId, totalDeposited);

        emit BatchDeposit(msg.sender, _goalId, totalDeposited, _vaults.length);
    }

    function depositToVault(
        address _vault,
        uint256 _amount,
        bytes32 _goalId
    ) external nonReentrant onlyGoalOwner(_goalId) {
        USDC.safeTransferFrom(msg.sender, address(this), _amount);

        IERC20 underlying = IYOVault(_vault).asset();
        underlying.approve(_vault, _amount);

        uint256 shares = IYOVault(_vault).deposit(_amount, address(this));

        userVaultShares[msg.sender][_vault] += shares;

        VaultAllocation[] storage allocations = goalAllocations[_goalId];
        for (uint i = 0; i < allocations.length; i++) {
            if (allocations[i].vault == _vault) {
                allocations[i].depositedAmount += _amount;
                allocations[i].shares += shares;
                break;
            }
        }

        userDeposits[msg.sender].push(DepositRecord({
            timestamp: block.timestamp,
            vault: _vault,
            amount: _amount,
            sharesReceived: shares,
            goalId: _goalId
        }));

        _updateGoalAmount(_goalId, _amount);

        emit SingleDeposit(msg.sender, _vault, _amount, shares, _goalId);
    }

    // ============ Withdrawals ============

    function batchRedeem(
        bytes32 _goalId,
        address[] calldata _vaults,
        uint256[] calldata _shares
    ) external nonReentrant onlyGoalOwner(_goalId) {
        require(_vaults.length == _shares.length, "VyoRouter: Length mismatch");

        uint256 totalAssets = 0;

        for (uint i = 0; i < _vaults.length; i++) {
            if (_shares[i] == 0) continue;

            uint256 assets = IYOVault(_vaults[i]).redeem(
                _shares[i],
                address(this),
                address(this)
            );

            userVaultShares[msg.sender][_vaults[i]] -= _shares[i];

            VaultAllocation[] storage allocations = goalAllocations[_goalId];
            for (uint j = 0; j < allocations.length; j++) {
                if (allocations[j].vault == _vaults[i]) {
                    allocations[j].shares -= _shares[i];
                    uint256 amountRemoved = (allocations[j].depositedAmount * _shares[i]) /
                        (allocations[j].shares + _shares[i]);
                    allocations[j].depositedAmount -= amountRemoved;
                    break;
                }
            }

            totalAssets += assets;
        }

        USDC.safeTransfer(msg.sender, totalAssets);

        _updateGoalAmount(_goalId, 0, true);

        emit BatchRedeem(msg.sender, _goalId, totalAssets, _vaults.length);
    }

    function emergencyExit(bytes32 _goalId) external nonReentrant onlyGoalOwner(_goalId) {
        VaultAllocation[] storage allocations = goalAllocations[_goalId];
        uint256 totalAssets = 0;
        uint256 vaultCount = 0;

        for (uint i = 0; i < allocations.length; i++) {
            if (allocations[i].shares == 0) continue;

            uint256 assets = IYOVault(allocations[i].vault).redeem(
                allocations[i].shares,
                address(this),
                address(this)
            );

            totalAssets += assets;
            vaultCount++;

            userVaultShares[msg.sender][allocations[i].vault] -= allocations[i].shares;
            allocations[i].shares = 0;
            allocations[i].depositedAmount = 0;
        }

        USDC.safeTransfer(msg.sender, totalAssets);

        _deactivateGoal(_goalId);

        emit EmergencyExit(msg.sender, totalAssets, vaultCount);
    }

    // ============ AI Agent Permissions ============

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

    function revokeAgent(address _agent) external {
        require(approvedAgents[_agent], "VyoRouter: Agent not approved");

        agentPermissions[msg.sender].approved = false;

        emit AgentRevoked(_agent);
    }

    function isAgentApproved(address _user, address _agent) external view returns (bool) {
        return approvedAgents[_agent] && agentPermissions[_user].approved;
    }

    function getAgentPermission(address _user) external view returns (AgentPermission memory) {
        return agentPermissions[_user];
    }

    // ============ Agent Actions ============

    function agentRebalance(
        address _user,
        bytes32 _goalId,
        address _fromVault,
        address _toVault,
        uint256 _shares
    ) external onlyAgent withinSpendLimit(_user, _shares) nonReentrant {
        require(isGoalOwner(_user, _goalId), "VyoRouter: Invalid goal");

        uint256 assets = IYOVault(_fromVault).previewRedeem(_shares);

        agentPermissions[_user].spentToday += assets;

        uint256 actualAssets = IYOVault(_fromVault).redeem(
            _shares,
            address(this),
            address(this)
        );

        IERC20 underlying = IYOVault(_toVault).asset();
        underlying.approve(_toVault, actualAssets);
        uint256 newShares = IYOVault(_toVault).deposit(actualAssets, address(this));

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

        userVaultShares[_user][_fromVault] -= _shares;
        userVaultShares[_user][_toVault] += newShares;

        emit AgentAction(msg.sender, _user, _fromVault, _toVault, _shares, _goalId);
    }

    // ============ Automation Configuration ============

    /**
     * @notice Set automation config for a goal
     * @param _goalId Goal ID
     * @param _autoCompound Enable auto-compounding
     * @param _autoRebalance Enable auto-rebalancing
     * @param _compoundIntervalDays Days between compounds
     * @param _rebalanceThresholdBps APY diff threshold in bps (200 = 2%)
     * @param _minCompoundAmount Minimum yield to compound
     */
    function setAutomationConfig(
        bytes32 _goalId,
        bool _autoCompound,
        bool _autoRebalance,
        uint256 _compoundIntervalDays,
        uint256 _rebalanceThresholdBps,
        uint256 _minCompoundAmount
    ) external onlyGoalOwner(_goalId) {
        require(_compoundIntervalDays >= 1 && _compoundIntervalDays <= 365, "VyoRouter: Invalid interval");
        require(_rebalanceThresholdBps <= 10000, "VyoRouter: Invalid threshold");

        automationConfigs[_goalId] = AutomationConfig({
            enabled: true,
            autoCompound: _autoCompound,
            autoRebalance: _autoRebalance,
            compoundIntervalDays: _compoundIntervalDays,
            rebalanceThresholdBps: _rebalanceThresholdBps,
            minCompoundAmount: _minCompoundAmount
        });

        lastCompoundTime[_goalId] = block.timestamp;

        emit AutomationConfigured(
            _goalId,
            _autoCompound,
            _autoRebalance,
            _compoundIntervalDays
        );
    }

    /**
     * @notice Disable automation for a goal
     */
    function disableAutomation(bytes32 _goalId) external onlyGoalOwner(_goalId) {
        automationConfigs[_goalId].enabled = false;

        emit AutomationDisabled(_goalId);
    }

    /**
     * @notice Get automation config for a goal
     */
    function getAutomationConfig(bytes32 _goalId) external view returns (AutomationConfig memory) {
        return automationConfigs[_goalId];
    }

    // ============ Automation Functions ============

    /**
     * @notice Manually trigger yield compounding (anyone can call)
     */
    function compoundYield(bytes32 _goalId) external nonReentrant {
        _compoundYield(_goalId);
    }

    /**
     * @notice Keeper can trigger compound for a specific goal
     */
    function keeperCompound(bytes32 _goalId) external onlyKeeper nonReentrant {
        _compoundYield(_goalId);
    }

    /**
     * @notice Set keeper registry address
     */
    function setKeeperRegistry(address _registry) external onlyOwner {
        keeperRegistry = _registry;
    }

    /**
     * @notice Set upkeep interval
     */
    function setUpkeepInterval(uint256 _interval) external onlyOwner {
        require(_interval >= 1 hours && _interval <= 7 days, "VyoRouter: Invalid interval");
        upkeepInterval = _interval;
    }

    // ============ Internal Automation Functions ============

    function _checkUpkeepConditions(bytes32 _goalId)
        internal
        view
        returns (bool upkeepNeeded, bytes memory performData)
    {
        if (_goalId != 0) {
            return _checkGoalAutomation(_goalId);
        }

        return (false, bytes("No specific goal checked"));
    }

    function _checkGoalAutomation(bytes32 _goalId)
        internal
        view
        returns (bool, bytes memory)
    {
        AutomationConfig memory config = automationConfigs[_goalId];

        if (!config.enabled) {
            return (false, bytes("Automation disabled"));
        }

        // Check compound eligibility
        if (config.autoCompound) {
            uint256 daysSinceCompound = (block.timestamp - lastCompoundTime[_goalId]) /
                1 days;

            if (daysSinceCompound >= config.compoundIntervalDays) {
                // Check if there's enough yield to compound
                VaultAllocation[] memory allocations = goalAllocations[_goalId];
                uint256 totalYield = 0;

                for (uint i = 0; i < allocations.length; i++) {
                    if (allocations[i].shares > 0) {
                        uint256 currentValue = IYOVault(allocations[i].vault).previewRedeem(
                            allocations[i].shares
                        );
                        if (currentValue > allocations[i].depositedAmount) {
                            totalYield += currentValue - allocations[i].depositedAmount;
                        }
                    }
                }

                if (totalYield >= config.minCompoundAmount) {
                    return (
                        true,
                        abi.encode(_goalId, AutomationAction.Compound)
                    );
                }
            }
        }

        return (false, bytes("No action needed"));
    }

    function _compoundYield(bytes32 _goalId) internal {
        AutomationConfig memory config = automationConfigs[_goalId];
        VaultAllocation[] storage allocations = goalAllocations[_goalId];
        uint256 totalYieldCompounded = 0;
        uint256 newTotalShares = 0;

        for (uint i = 0; i < allocations.length; i++) {
            if (allocations[i].shares == 0) continue;

            uint256 currentValue = IYOVault(allocations[i].vault).previewRedeem(
                allocations[i].shares
            );

            if (currentValue > allocations[i].depositedAmount) {
                uint256 yieldAmount = currentValue - allocations[i].depositedAmount;

                // Skip if below minimum
                if (yieldAmount < config.minCompoundAmount) continue;

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

                totalYieldCompounded += redeemed;
                newTotalShares += allocations[i].shares;
            }
        }

        lastCompoundTime[_goalId] = block.timestamp;

        if (totalYieldCompounded > 0) {
            emit YieldCompounded(_goalId, totalYieldCompounded, newTotalShares);
        }

        emit UpkeepExecuted(_goalId, "Compound executed");
    }

    function _checkGoalStatus(bytes32 _goalId) internal {
        Goal[] memory goals = userGoals[msg.sender];
        for (uint i = 0; i < goals.length; i++) {
            if (goals[i].id == _goalId) {
                // Emit status for off-chain monitoring
                emit UpkeepNeeded(
                    _goalId,
                    AutomationAction.Check,
                    "Goal status check completed"
                );
                break;
            }
        }
    }

    // ============ View Functions ============

    function getUserVaultPosition(address _user, address _vault)
        external
        view
        returns (uint256 shares, uint256 assets)
    {
        shares = userVaultShares[_user][_vault];
        assets = IYOVault(_vault).previewRedeem(shares);
    }

    function getUserDeposits(address _user) external view returns (DepositRecord[] memory) {
        return userDeposits[_user];
    }

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

    function getApprovedAgents() external view returns (address[] memory) {
        return agentList;
    }

    function getGoalCount(address _user) external view returns (uint256) {
        return userGoals[_user].length;
    }

    // ============ Internal Helpers ============

    function _updateGoalAmount(bytes32 _goalId, uint256 _addedAmount, bool _subtract) internal {
        Goal[] storage goals = userGoals[msg.sender];
        for (uint i = 0; i < goals.length; i++) {
            if (goals[i].id == _goalId) {
                if (_subtract) {
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
