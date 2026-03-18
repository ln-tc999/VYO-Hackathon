// PortfolioPositions — user vault holdings dengan WagmiProvider sendiri

import { useState, useEffect } from 'react';
import { WagmiProvider, useAccount } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '../../lib/wallet.js';

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } });

const API = '/api';

interface Position {
  vaultId: string;
  vaultName: string;
  symbol: string;
  underlyingSymbol: string;
  logoUrl: string;
  chain: string;
  shares: number;
  assets: number;
  yieldEarned: number;
  apy: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

function Inner() {
  const { address, isConnected } = useAccount();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConnected || !address) { setLoading(false); return; }
    fetch(`${API}/vaults/positions/${address}`)
      .then(r => r.json())
      .then(j => { if (j.success) setPositions(j.data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [address, isConnected]);

  // Update parent DOM stats
  useEffect(() => {
    const totalValue   = positions.reduce((s, p) => s + p.assets, 0);
    const totalYield   = positions.reduce((s, p) => s + p.yieldEarned, 0);
    const weightedApy  = totalValue > 0 ? positions.reduce((s, p) => s + p.apy * p.assets, 0) / totalValue : 0;
    const bestApy      = positions.length ? Math.max(...positions.map(p => p.apy)) : 0;

    const set = (id: string, val: string) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('port-total',      fmt(totalValue));
    set('port-yield',      `+${fmt(totalYield)}`);
    set('stat-yield',      totalYield.toFixed(2));
    set('stat-apy',        weightedApy.toFixed(2));
    set('stat-vaults',     String(positions.length));
    set('stat-best',       bestApy.toFixed(2));
    set('position-count',  `${positions.length} vault${positions.length !== 1 ? 's' : ''}`);
  }, [positions]);

  if (!isConnected) return (
    <div style={{ textAlign: 'center', padding: '32px 16px', color: '#555' }}>
      <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>🔗</div>
      <div style={{ fontSize: '0.8125rem' }}>Connect wallet to view positions</div>
    </div>
  );

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '32px 16px', color: '#555', fontSize: '0.8125rem' }}>
      Loading positions...
    </div>
  );

  if (positions.length === 0) return (
    <div style={{ textAlign: 'center', padding: '32px 16px', color: '#555' }}>
      <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>📊</div>
      <div style={{ fontSize: '0.8125rem', marginBottom: 12 }}>No vault positions yet</div>
      <a href="/dashboard/vaults" style={{ color: '#c8f135', fontSize: '0.8125rem', fontWeight: 600 }}>
        Browse Vaults →
      </a>
    </div>
  );

  return (
    <>
      {positions.map(p => (
        <div key={p.vaultId} className="position-row">
          <img
            className="position-logo"
            src={p.logoUrl} alt={p.symbol}
            onError={e => { (e.target as HTMLImageElement).src = '/assets/yoUSD.png'; }}
          />
          <div className="position-info">
            <span className="position-symbol">{p.symbol}</span>
            <span className="position-chain">{p.chain}</span>
          </div>
          <div className="position-apy">{p.apy.toFixed(2)}%</div>
          <div className="position-value">{fmt(p.assets)}</div>
        </div>
      ))}
    </>
  );
}

export function PortfolioPositions() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={qc}>
        <Inner />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
