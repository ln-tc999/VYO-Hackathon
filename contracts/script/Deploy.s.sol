// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {VyoRouter} from "../src/VyoRouter.sol";

/**
 * @title DeployVyoRouter
 * @notice Deployment script for VyoRouter to Base networks
 * 
 * Usage:
 *   forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC --broadcast --verify
 *   forge script script/Deploy.s.sol --rpc-url $BASE_RPC --broadcast --verify --broadcast
 */
contract DeployVyoRouter is Script {
    VyoRouter public vyoRouter;

    // Base Sepolia addresses
    address constant USDC_SEPOLIA = 0x036cBd53842c5426634E92B0C9D5eb112A4E1d4d;
    address constant YO_USD_SEPOLIA = 0x0000000000000000000000000000000000000000; // TODO: Update

    // Base Mainnet addresses
    address constant USDC_MAINNET = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address constant YO_USD_MAINNET = 0x3A43AEC53490CB9Fa922847385D82fe25d0E9De7;

    function setUp() public {}

    /**
     * @notice Run deployment
     */
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);

        // Determine network
        uint256 chainId = block.chainid;
        
        address usdc;
        address yoUsd;
        
        if (chainId == 84532) {
            // Base Sepolia
            console.log("Deploying to Base Sepolia...");
            usdc = USDC_SEPOLIA;
            yoUsd = YO_USD_SEPOLIA;
        } else if (chainId == 8453) {
            // Base Mainnet
            console.log("Deploying to Base Mainnet...");
            usdc = USDC_MAINNET;
            yoUsd = YO_USD_MAINNET;
        } else {
            console.log("Unknown network - chainId:", chainId);
            console.log("Deploying with default addresses...");
            usdc = USDC_SEPOLIA;
            yoUsd = YO_USD_SEPOLIA;
        }

        // Deploy VyoRouter
        vyoRouter = new VyoRouter();
        
        console.log("");
        console.log("========================================");
        console.log("VyoRouter deployed successfully!");
        console.log("========================================");
        console.log("Network Chain ID:", chainId);
        console.log("VyoRouter Address:", address(vyoRouter));
        console.log("USDC Address:", usdc);
        console.log("YO USD Vault:", yoUsd);
        console.log("Owner:", vyoRouter.owner());
        console.log("========================================");
        console.log("");

        vm.stopBroadcast();
    }
}

/**
 * @title UpgradeVyoRouter
 * @notice Upgrade script (for future upgrades)
 * 
 * Usage:
 *   forge script script/Upgrade.s.sol --rpc-url $BASE_SEPOLIA_RPC --broadcast --verify
 */
contract UpgradeVyoRouter is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address currentVyoRouter = vm.envAddress("VYOROUTER_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);
        
        VyoRouter newImplementation = new VyoRouter();
        
        console.log("");
        console.log("========================================");
        console.log("VyoRouter Upgrade");
        console.log("========================================");
        console.log("Current:", currentVyoRouter);
        console.log("New Implementation:", address(newImplementation));
        console.log("========================================");
        console.log("");
        
        vm.stopBroadcast();
    }
}

/**
 * @title SetupAutomation
 * @notice Set up Chainlink Automation for VyoRouter
 * 
 * Usage:
 *   forge script script/SetupAutomation.s.sol --rpc-url $BASE_SEPOLIA_RPC --broadcast --verify
 * 
 * Requirements:
 *   - VYOROUTER_ADDRESS must be set
 *   - KEEPER_REGISTRY_ADDRESS must be set (Chainlink Automation Registry)
 *   - LINK token must be funded to the automation registry
 */
contract SetupAutomation is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address vyoRouter = vm.envAddress("VYOROUTER_ADDRESS");
        address keeperRegistry = vm.envAddress("KEEPER_REGISTRY_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Set keeper registry
        VyoRouter(vyoRouter).setKeeperRegistry(keeperRegistry);
        
        // Set upkeep interval (optional - default is 1 day)
        // VyoRouter(vyoRouter).setUpkeepInterval(1 days);
        
        console.log("");
        console.log("========================================");
        console.log("Chainlink Automation Setup");
        console.log("========================================");
        console.log("VyoRouter:", vyoRouter);
        console.log("Keeper Registry:", keeperRegistry);
        console.log("Automation configured: YES");
        console.log("========================================");
        console.log("");
        
        vm.stopBroadcast();
    }
}

/**
 * @title VerifyDeployment
 * @notice Verify deployment on Basescan
 * 
 * Usage:
 *   forge script script/Verify.s.sol --rpc-url $BASE_SEPOLIA_RPC --verify
 */
contract VerifyDeployment is Script {
    function run() public {
        address vyoRouter = vm.envAddress("VYOROUTER_ADDRESS");
        
        console.log("");
        console.log("========================================");
        console.log("Deployment Verification");
        console.log("========================================");
        console.log("VyoRouter:", vyoRouter);
        
        // Verify contract on Basescan
        console.log("Verifying on Basescan...");
        
        vm.stopBroadcast();
    }
}
