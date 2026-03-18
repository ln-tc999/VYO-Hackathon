import { createConfig, http } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

const chainId = parseInt(import.meta.env.PUBLIC_CHAIN_ID || '84532');
const chain = chainId === 8453 ? base : baseSepolia;

export const wagmiConfig = createConfig({
  chains: [chain],
  connectors: [injected()],
  transports: {
    [chain.id]: http(),
  } as any,
});

export const currentChainId = chainId;

export const CONTRACTS = {
  VyoRouter: '0x94B98209622EF89426dA8FCCa73BeA096AA43Ff5' as `0x${string}`,
  USDC:      '0x036cBd53842c5426634E92B0C9D5eb112A4E1d4d' as `0x${string}`,
};

export const CHAIN_INFO: Record<number, { name: string; explorer: string }> = {
  84532: { name: 'Base Sepolia', explorer: 'https://sepolia.basescan.org' },
  8453:  { name: 'Base',         explorer: 'https://basescan.org' },
};

export const chainInfo = CHAIN_INFO[chainId] ?? CHAIN_INFO[84532];
