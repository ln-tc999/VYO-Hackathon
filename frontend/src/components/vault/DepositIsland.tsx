// ============================================================
// DepositIsland — listens for 'vault-open' events and renders
// the deposit form for whichever vault is currently open.
// Single island mounted once, props update via custom event.
// ============================================================

import { useState, useEffect } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '../../lib/wallet.js';
import { DepositForm } from './DepositForm.js';

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

function DepositController() {
  const [vault, setVault] = useState<VaultInfo | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as VaultInfo | null;
      setVault(detail ?? null);

      // Move this island's root into the open vault's mount div
      if (detail) {
        const mountEl = document.getElementById(`deposit-mount-${detail.id}`);
        const rootEl  = document.getElementById('deposit-island-root');
        if (mountEl && rootEl) {
          mountEl.appendChild(rootEl);
          rootEl.style.display = 'block';
        }
      } else {
        // Vault closed — hide the island
        const rootEl = document.getElementById('deposit-island-root');
        if (rootEl) rootEl.style.display = 'none';
      }
    };

    window.addEventListener('vault-open', handler);
    return () => window.removeEventListener('vault-open', handler);
  }, []);

  if (!vault) return null;

  return (
    <DepositForm
      key={vault.id}
      vaultAddress={vault.address}
      vaultSymbol={vault.symbol}
      underlyingSymbol={vault.underlyingSymbol}
      apy={vault.apy}
    />
  );
}

export default function DepositIsland() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <DepositController />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
