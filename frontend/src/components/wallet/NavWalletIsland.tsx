// ============================================================
// NavWalletIsland — self-contained wallet button with providers
// ============================================================

import { WagmiProvider as Provider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '../../lib/wallet.js';
import { NavWallet } from './NavWallet.js';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 5 * 60 * 1000 } },
});

export default function NavWalletIsland() {
  return (
    <Provider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <NavWallet />
      </QueryClientProvider>
    </Provider>
  );
}
