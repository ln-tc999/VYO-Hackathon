import { useState, useEffect } from 'react';
import { WagmiProvider, useAccount, useConnect, useDisconnect } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '../../lib/wallet.js';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000 } },
});

function WalletInner() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [open, setOpen] = useState(false);

  const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

  if (isConnected && address) {
    return (
      <div style={{ position: 'relative' }}>
        <button className="nav-wallet-btn" onClick={() => setOpen(!open)} type="button">
          <span>🦊</span>
          <span>{short(address)}</span>
        </button>
        {open && (
          <div className="nav-wallet-menu">
            <div className="nav-wallet-menu-addr">{short(address)}</div>
            <button 
              className="nav-wallet-disconnect" 
              onClick={() => { disconnect(); setOpen(false); }}
              type="button"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      className="nav-wallet-btn"
      onClick={() => connectors[0] && connect({ connector: connectors[0] })}
      disabled={isPending}
      type="button"
    >
      <span>🦊</span>
      <span>{isPending ? 'Connecting…' : 'Connect Wallet'}</span>
    </button>
  );
}

export default function WalletButton() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WalletInner />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
