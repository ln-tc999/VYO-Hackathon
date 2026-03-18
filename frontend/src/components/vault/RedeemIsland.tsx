// ============================================================
// RedeemIsland — listens for 'vault-redeem' events, renders
// the withdraw form for whichever vault is open.
// ============================================================

import { useState, useEffect } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '../../lib/wallet.js';
import { RedeemForm } from './RedeemForm.js';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 30_000 } },
});

interface VaultInfo {
  id: string;
  address: string;
  symbol: string;
  underlyingSymbol: string;
  apy: number;
}

function RedeemController() {
  const [vault, setVault] = useState<VaultInfo | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as VaultInfo | null;
      setVault(detail ?? null);

      if (detail) {
        const mountEl = document.getElementById(`redeem-mount-${detail.id}`);
        const rootEl  = document.getElementById('redeem-island-root');
        if (mountEl && rootEl) {
          mountEl.appendChild(rootEl);
          rootEl.style.display = 'block';
        }
      } else {
        const rootEl = document.getElementById('redeem-island-root');
        if (rootEl) rootEl.style.display = 'none';
      }
    };

    // Also hide when a different vault opens for deposit
    const depositHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        const rootEl = document.getElementById('redeem-island-root');
        if (rootEl) rootEl.style.display = 'none';
        setVault(null);
      }
    };

    window.addEventListener('vault-redeem', handler);
    window.addEventListener('vault-open', depositHandler);
    return () => {
      window.removeEventListener('vault-redeem', handler);
      window.removeEventListener('vault-open', depositHandler);
    };
  }, []);

  if (!vault) return null;

  return (
    <RedeemForm
      key={vault.id}
      vaultAddress={vault.address}
      vaultSymbol={vault.symbol}
      underlyingSymbol={vault.underlyingSymbol}
      apy={vault.apy}
    />
  );
}

export default function RedeemIsland() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RedeemController />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
