// ============================================================
// PortfolioPage — full portfolio view, wallet-driven
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { WagmiProvider, useAccount } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '../../lib/wallet.js';

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } });

const COLORS = ['#c8f135','#f59e0b','#3b82f6','#ef4444','#22c55e','#a855f7','#ec4899','#06b6d4'];

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

const fmtK = (n: number) =>
  n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}K` : fmt(n);

// ── Donut SVG ──────────────────────────────────────────────
function Donut({ positions, total }: { positions: Position[]; total: number }) {
  const cx = 80, cy = 80, r = 62, sw = 14;
  const circ = 2 * Math.PI * r;

  if (!positions.length) {
    return (
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
      </svg>
    );
  }

  let offset = -circ * 0.25;
  const arcs = positions.map((p, i) => {
    const dash = (p.assets / total) * circ;
    const arc = (
      <circle
        key={p.vaultId}
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={COLORS[i % COLORS.length]}
        strokeWidth={sw}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={-offset}
        style={{ transition: 'stroke-dasharray 0.5s ease' }}
      />
    );
    offset += dash;
    return arc;
  });

  return (
    <svg width="160" height="160" viewBox="0 0 160 160">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
      {arcs}
    </svg>
  );
}

// ── Main inner component ───────────────────────────────────
function Inner() {
  const { address, isConnected } = useAccount();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isConnected || !address) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/vaults/positions/${address}`);
      const j = await r.json();
      if (j.success) setPositions(j.data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [address, isConnected]);

  useEffect(() => { load(); }, [load]);

  const total      = positions.reduce((s, p) => s + p.assets, 0);
  const totalYield = positions.reduce((s, p) => s + p.yieldEarned, 0);
  const wApy       = total > 0 ? positions.reduce((s, p) => s + p.apy * p.assets, 0) / total : 0;
  const bestApy    = positions.length ? Math.max(...positions.map(p => p.apy)) : 0;

  // ── Not connected ──
  if (!isConnected) {
    return (
      <div style={S.notConnected}>
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔗</div>
        <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 6 }}>Connect your wallet</div>
        <div style={{ fontSize: '0.8125rem', color: '#555' }}>to view your portfolio</div>
      </div>
    );
  }

  // ── Loading ──
  if (loading) {
    return (
      <div style={S.notConnected}>
        <div style={{ fontSize: '0.875rem', color: '#555' }}>Loading positions…</div>
      </div>
    );
  }

  // ── Empty ──
  if (!positions.length) {
    return (
      <div style={S.notConnected}>
        <div style={{ fontSize: '2rem', marginBottom: 12 }}>📊</div>
        <div style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: 6 }}>No positions yet</div>
        <div style={{ fontSize: '0.8125rem', color: '#555', marginBottom: 16 }}>Start earning yield by depositing into a vault</div>
        <a href="/dashboard/vaults" style={S.ctaBtn}>Browse Vaults →</a>
      </div>
    );
  }

  const hoveredPos = hovered ? positions.find(p => p.vaultId === hovered) : null;

  return (
    <div style={S.page}>

      {/* ── HERO ── */}
      <div style={S.hero}>
        <div style={S.heroAccent} />
        <div style={S.heroLeft}>
          <div style={S.heroLabel}>Total Portfolio Value</div>
          <div style={S.heroVal}>{fmt(total)}</div>
          <div style={S.heroBadge}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
              <polyline points="17 6 23 6 23 12"/>
            </svg>
            {fmt(totalYield)} yield earned
          </div>
        </div>
        <div style={S.heroKpis}>
          <KPI label="Yield" value={fmt(totalYield)} color="#c8f135" />
          <KPI label="Avg APY" value={`${wApy.toFixed(2)}%`} color="#f59e0b" />
          <KPI label="Best APY" value={`${bestApy.toFixed(2)}%`} color="#c8f135" />
          <KPI label="Vaults" value={String(positions.length)} />
        </div>
        <a href="/dashboard/vaults" style={S.depositBtn}>+ Deposit</a>
      </div>

      {/* ── BODY GRID ── */}
      <div style={S.body}>

        {/* ── LEFT: Allocation ── */}
        <div style={S.card}>
          <div style={S.cardLabel}>Vault Allocation</div>
          <div style={S.allocInner}>

            {/* Donut */}
            <div style={S.donutWrap}>
              <Donut positions={positions} total={total} />
              <div style={S.donutCenter}>
                <div style={S.donutVal}>
                  {hoveredPos ? fmtK(hoveredPos.assets) : fmtK(total)}
                </div>
                <div style={S.donutLbl}>
                  {hoveredPos ? hoveredPos.symbol : 'DeFi'}
                </div>
              </div>
            </div>

            {/* Table */}
            <div style={S.allocTable}>
              <div style={S.allocHead}>
                <span />
                <span>Vault</span>
                <span style={{ textAlign: 'right' }}>Value</span>
                <span style={{ textAlign: 'right' }}>APY</span>
                <span style={{ textAlign: 'right' }}>%</span>
              </div>
              {positions.map((p, i) => (
                <div
                  key={p.vaultId}
                  style={{
                    ...S.allocRow,
                    background: hovered === p.vaultId ? 'rgba(255,255,255,0.04)' : 'transparent',
                  }}
                  onMouseEnter={() => setHovered(p.vaultId)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <div style={{ ...S.dot, background: COLORS[i % COLORS.length] }} />
                  <div style={S.allocName}>
                    <img
                      src={p.logoUrl} alt={p.symbol}
                      style={S.allocLogo}
                      onError={e => { (e.target as HTMLImageElement).src = '/assets/yoUSD.png'; }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.8125rem' }}>{p.symbol}</div>
                      <div style={{ fontSize: '0.6875rem', color: '#555' }}>{p.chain}</div>
                    </div>
                  </div>
                  <div style={S.allocVal}>{fmtK(p.assets)}</div>
                  <div style={{ ...S.allocVal, color: '#c8f135' }}>{p.apy.toFixed(2)}%</div>
                  <div style={{ ...S.allocVal, color: '#555' }}>{((p.assets / total) * 100).toFixed(1)}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Positions + Yield ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Positions */}
          <div style={S.card}>
            <div style={{ ...S.cardLabel, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Positions</span>
              <span style={{ color: '#555', fontWeight: 500 }}>{positions.length} vault{positions.length !== 1 ? 's' : ''}</span>
            </div>
            <div>
              {positions.map(p => (
                <div key={p.vaultId} style={S.posRow}>
                  <img
                    src={p.logoUrl} alt={p.symbol}
                    style={S.posLogo}
                    onError={e => { (e.target as HTMLImageElement).src = '/assets/yoUSD.png'; }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{p.symbol}</div>
                    <div style={{ fontSize: '0.6875rem', color: '#555', marginTop: 1 }}>{p.chain}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#c8f135' }}>{p.apy.toFixed(2)}%</div>
                    <div style={{ fontSize: '0.6875rem', color: '#555', marginTop: 1 }}>APY</div>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 90 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{fmt(p.assets)}</div>
                    <div style={{ fontSize: '0.6875rem', color: '#555', marginTop: 1 }}>+{fmt(p.yieldEarned)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Yield Breakdown */}
          <div style={S.card}>
            <div style={S.cardLabel}>Yield Breakdown</div>
            <YieldRow label="Today"            value={fmt(totalYield / 365)} />
            <YieldRow label="This week"        value={fmt(totalYield / 52)} />
            <YieldRow label="This month"       value={fmt(totalYield / 12)} />
            <YieldRow label="Projected yearly" value={fmt(total * (wApy / 100))} plain last />
          </div>

        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: '0.6875rem', color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: '1.0625rem', fontWeight: 800, letterSpacing: '-0.5px', color: color || '#fff' }}>{value}</div>
    </div>
  );
}

function YieldRow({ label, value, plain, last }: { label: string; value: string; plain?: boolean; last?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.04)', fontSize: '0.8125rem' }}>
      <span style={{ color: '#555' }}>{label}</span>
      <span style={{ fontWeight: 700, color: plain ? '#fff' : '#c8f135' }}>{value}</span>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  page: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    minHeight: 'calc(100vh - 80px)',
  },
  hero: {
    background: '#161616',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  heroAccent: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
    background: '#c8f135',
  },
  heroLeft: { flex: 1, minWidth: 0 },
  heroLabel: {
    fontSize: '0.6875rem', color: '#555', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4,
  },
  heroVal: {
    fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-1.5px', lineHeight: 1, marginBottom: 8,
  },
  heroBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontSize: '0.6875rem', fontWeight: 700,
    color: '#c8f135', background: 'rgba(200,241,53,0.12)',
    padding: '3px 10px', borderRadius: 999,
  },
  heroKpis: {
    display: 'flex', gap: 28, flexShrink: 0,
  },
  depositBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: '#c8f135', color: '#000',
    borderRadius: 9, padding: '9px 20px',
    fontSize: '0.8125rem', fontWeight: 800,
    textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
  },
  body: {
    display: 'grid',
    gridTemplateColumns: '1fr 340px',
    gap: 14,
    flex: 1,
  },
  card: {
    background: '#161616',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: '18px 20px',
  },
  cardLabel: {
    fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.08em', color: '#555', marginBottom: 16,
  },
  allocInner: {
    display: 'flex', gap: 24, alignItems: 'flex-start',
  },
  donutWrap: {
    position: 'relative', flexShrink: 0, width: 160, height: 160,
  },
  donutCenter: {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    pointerEvents: 'none',
  },
  donutVal: { fontSize: '0.9375rem', fontWeight: 800, letterSpacing: '-0.5px' },
  donutLbl: { fontSize: '0.5625rem', color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 },
  allocTable: { flex: 1, minWidth: 0 },
  allocHead: {
    display: 'grid',
    gridTemplateColumns: '10px 1fr 80px 60px 48px',
    gap: 10,
    paddingBottom: 8,
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    marginBottom: 2,
    fontSize: '0.6875rem', color: '#555', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.05em',
  },
  allocRow: {
    display: 'grid',
    gridTemplateColumns: '10px 1fr 80px 60px 48px',
    gap: 10, alignItems: 'center',
    padding: '9px 6px',
    borderRadius: 8,
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    cursor: 'default',
    transition: 'background 0.12s ease',
  },
  dot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  allocName: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 },
  allocLogo: { width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', background: '#1a1a1a', flexShrink: 0 },
  allocVal: { fontSize: '0.8125rem', fontWeight: 700, textAlign: 'right' },
  posRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 0',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  posLogo: { width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', background: '#1a1a1a', flexShrink: 0 },
  notConnected: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    minHeight: 'calc(100vh - 160px)',
    color: '#fff',
  },
  ctaBtn: {
    display: 'inline-flex', alignItems: 'center',
    background: '#c8f135', color: '#000',
    borderRadius: 9, padding: '9px 20px',
    fontSize: '0.8125rem', fontWeight: 800,
    textDecoration: 'none',
  },
};

// ── Export ─────────────────────────────────────────────────
export function PortfolioPage() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={qc}>
        <Inner />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
