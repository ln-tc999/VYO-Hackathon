// ============================================================
// Connect Wallet Button Component
// WalletConnect + MetaMask integration
// ============================================================

import { useAccount, useConnect, useDisconnect, useChainId } from 'wagmi';
import { useEffect } from 'react';
import { walletActions } from '../../stores/wallet';

export function ConnectWalletButton() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  // Sync wallet state to store
  useEffect(() => {
    if (isConnected && address && chainId) {
      walletActions.connect(address, chainId);
    } else {
      walletActions.disconnect();
    }
  }, [isConnected, address, chainId]);

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {connectors.map((connector) => (
        <button
          key={connector.id}
          onClick={() => connect({ connector })}
          disabled={isPending}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Connecting...' : connector.name}
        </button>
      ))}
    </div>
  );
}
