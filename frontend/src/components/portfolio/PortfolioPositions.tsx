// ============================================================
// PortfolioPositions — shows user's holdings across all vaults
// ============================================================

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

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

export function PortfolioPositions() {
  const { address, isConnected } = useAccount();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isConnected || !address) {
      setLoading(false);
      setPositions([]);
      return;
    }

    loadPositions();
  }, [address, isConnected]);

  const loadPositions = async () => {
    if (!address) return;
    
    try {
      setLoading(true);
      const res = await fetch(`${API}/vaults/positions/${address}`);
      const json = await res.json();
      
      if (json.success) {
        setPositions(json.data || []);
      } else {
        setError(json.error || 'Failed to load positions');
      }
    } catch (err) {
      console.error('[PORTFOLIO] Load error:', err);
      setError('Failed to load positions');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

  const fmtNum = (n: number) => new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(n);

  // Update summary elements
  useEffect(() => {
    const totalValue = positions.reduce((sum, p) => sum + p.assets, 0);
    const totalYield = positions.reduce((sum, p) => sum + p.yieldEarned, 0);
    const weightedApy = totalValue > 0 
      ? positions.reduce((sum, p) => sum + (p.apy * p.assets), 0) / totalValue 
      : 0;
    const bestApy = positions.length > 0 
      ? Math.max(...positions.map(p => p.apy)) 
      : 0;

    // Header
    const totalEl = document.getElementById('port-total');
    const yieldEl = document.getElementById('port-yield');
    if (totalEl) totalEl.textContent = fmt(totalValue);
    if (yieldEl) yieldEl.textContent = `+${fmt(totalYield)}`;

    // Stats row
    const statYield = document.getElementById('stat-yield');
    const statApy = document.getElementById('stat-apy');
    const statVaults = document.getElementById('stat-vaults');
    const statBest = document.getElementById('stat-best');
    if (statYield) statYield.textContent = totalYield.toFixed(2);
    if (statApy) statApy.textContent = weightedApy.toFixed(2);
    if (statVaults) statVaults.textContent = String(positions.length);
    if (statBest) statBest.textContent = bestApy.toFixed(2);

    // Chart empty state
    const chartEmpty = document.getElementById('chart-empty');
    const yieldLine = document.getElementById('yield-line');
    const yieldPath = document.getElementById('yield-path');
    if (positions.length === 0) {
      if (chartEmpty) chartEmpty.style.display = 'block';
      if (yieldLine) yieldLine.style.display = 'none';
      if (yieldPath) yieldPath.style.display = 'none';
    } else {
      if (chartEmpty) chartEmpty.style.display = 'none';
      if (yieldLine) yieldLine.style.display = 'block';
      if (yieldPath) yieldPath.style.display = 'block';
    }
  }, [positions]);

  if (!isConnected) {
    return (
      <div className="empty-positions">
        <div className="empty-positions-icon">🔗</div>
        <div className="empty-positions-text">Connect your wallet to view positions</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="empty-positions">
        <div className="empty-positions-icon">⏳</div>
        <div className="empty-positions-text">Loading your positions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-positions">
        <div className="empty-positions-icon">⚠️</div>
        <div className="empty-positions-text">{error}</div>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="empty-positions">
        <div className="empty-positions-icon">📊</div>
        <div className="empty-positions-text">No vault positions yet</div>
        <a href="/dashboard/vaults" className="btn btn-primary" style={{ display: 'inline-block', marginTop: 12, textDecoration: 'none' }}>
          Browse Vaults
        </a>
      </div>
    );
  }

  return (
    <>
      {positions.map((pos) => (
        <div className="position-item" key={pos.vaultId}>
          <img 
            className="position-logo" 
            src={pos.logoUrl} 
            alt={pos.symbol}
            onError={(e) => { (e.target as HTMLImageElement).src = '/assets/yoUSD.png'; }}
          />
          <div className="position-info">
            <span className="position-symbol">{pos.symbol}</span>
            <span className="position-chain">{pos.chain}</span>
          </div>
          <div className="position-apy">{pos.apy.toFixed(2)}%</div>
          <div className="position-value">{fmt(pos.assets)}</div>
        </div>
      ))}
    </>
  );
}
