// ============================================================
// Wallet Configuration
// Wagmi + WalletConnect + Contract ABIs for Vyo Apps
// ============================================================

import { createConfig, http, type Config } from 'wagmi';
import { baseSepolia, base } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

const projectId = import.meta.env.PUBLIC_WALLET_CONNECT_PROJECT_ID || '';

const chainId = parseInt(import.meta.env.PUBLIC_CHAIN_ID || '84532');
const currentChain = chainId === 8453 ? base : baseSepolia;

// Create wagmi config
export const wagmiConfig: Config = createConfig({
  chains: [currentChain],
  connectors: [
    injected({ target: 'metaMask' }),
    projectId ? walletConnect({
      projectId,
      showQrModal: true,
      metadata: {
        name: 'Vyo Apps',
        description: 'AI-powered DeFi savings platform',
        url: 'https://vyo.finance',
        icons: ['https://vyo.finance/icon.png'],
      },
    }) : undefined,
  ].filter(Boolean) as any,
  transports: {
    [currentChain.id]: http(),
  },
});

// Contract addresses - Updated after deployment
export const CONTRACTS = {
  VyoRouter: '0x94B98209622EF89426dA8FCCa73BeA096AA43Ff5' as `0x${string}`,
  USDC: '0x036cBd53842c5426634E92B0C9D5eb112A4E1d4d' as `0x${string}`,
  LINK: '0xE4aB69F9778dA6FB41D87d28E9D5f2A3cF9E0E8F' as `0x${string}`,
};

export const currentChainId = chainId;

export const CHAIN_INFO = {
  84532: {
    name: 'Base Sepolia',
    explorer: 'https://sepolia.basescan.org',
    faucet: 'https://www.coinbase.com/faucets/base-sepolia-faucet',
  },
  8453: {
    name: 'Base',
    explorer: 'https://basescan.org',
    faucet: null,
  },
};

export const chainInfo = CHAIN_INFO[chainId as keyof typeof CHAIN_INFO] || CHAIN_INFO[84532];
