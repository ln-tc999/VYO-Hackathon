// ============================================================
// Wallet Configuration
// Wagmi + WalletConnect setup for Vyo Apps
// ============================================================

import { createConfig, http } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

// WalletConnect project ID from environment
const projectId = import.meta.env.PUBLIC_WALLET_CONNECT_PROJECT_ID || '';

if (!projectId) {
  console.warn('[WALLET] WalletConnect project ID not configured. Please set PUBLIC_WALLET_CONNECT_PROJECT_ID in .env.local');
}

// Using Base Sepolia Testnet (chain ID: 84532)
// For mainnet, change PUBLIC_CHAIN_ID to 8453 in .env.local
const chainId = parseInt(import.meta.env.PUBLIC_CHAIN_ID || '84532');

// Supported chains - testnet only
export const supportedChains = [baseSepolia] as const;

// Create wagmi config
export const wagmiConfig = createConfig({
  chains: supportedChains,
  connectors: [
    injected({ target: 'metaMask' }),
    walletConnect({
      projectId,
      showQrModal: true,
      metadata: {
        name: 'Vyo Apps',
        description: 'AI-powered DeFi savings platform',
        url: 'https://vyo.finance',
        icons: ['https://vyo.finance/icon.png'],
      },
    }),
  ],
  transports: {
    [baseSepolia.id]: http(),
  },
});

// Contract addresses on Base Sepolia Testnet
// TODO: Update with actual testnet addresses after deployment
export const CONTRACTS = {
  VyoRouter: '0x0000000000000000000000000000000000000000', // Deploy to testnet first
  USDC: '0x036cBd53842c5426634E92B0C9D5eb112A4E1d4d', // Base Sepolia USDC
  yoUSD: '0x0000000000000000000000000000000000000000', // TODO: YO testnet vault address
};

// YO Vault addresses on Testnet
// TODO: Update with actual YO testnet vault addresses
export const YO_VAULTS = {
  yoUSD: {
    address: '0x0000000000000000000000000000000000000000', // TODO: Deploy or get from YO
    asset: '0x036CbD53842c5426634e92b0c9D5eB112A4E1D4D', // Base Sepolia USDC
  },
  // Add more vaults as needed
};

// Testnet faucet: https://www.coinbase.com/faucets/base-sepolia-faucet
// Block explorer: https://sepolia.basescan.org
