// ============================================================
// Vault Positions Component
// Display user's yoVault tokens and positions
// ============================================================

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { yieldApi } from '../../lib/api';

interface VaultPosition {
  vaultAddress: string;
  vaultName: string;
  vaultSymbol: string;
  shares: number;
  assets: number;
  apy: number;
  tvl: number;
  lastUpdated: string;
}

export function VaultPositions() {
  const { address, isConnected } = useAccount();
  const [positions, setPositions] = useState<VaultPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected || !address) {
      setPositions([]);
      return;
    }

    const fetchPositions = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await yieldApi.getPositions(address);
        if (response.success) {
          setPositions(response.data);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch positions');
      } finally {
        setLoading(false);
      }
    };

    fetchPositions();

    // Refresh every 30 seconds
    const interval = setInterval(fetchPositions, 30000);
    return () => clearInterval(interval);
  }, [isConnected, address]);

  if (!isConnected) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg text-center">
        <p className="text-gray-600">Connect your wallet to view your vault positions</p>
      </div>
    );
  }

  if (loading && positions.length === 0) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg text-center">
        <p className="text-gray-600">Loading your vault positions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 rounded-lg">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg text-center">
        <p className="text-gray-600">No vault positions found</p>
        <p className="text-sm text-gray-500 mt-2">
          Deposit to a YO vault to start earning yield
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Your Vault Positions</h2>
      
      <div className="grid gap-4">
        {positions.map((position) => (
          <div
            key={position.vaultAddress}
            className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-sm">
                    {position.vaultSymbol.slice(0, 2)}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{position.vaultName}</h3>
                  <p className="text-sm text-gray-500">{position.vaultSymbol}</p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  ${position.assets.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-gray-500">
                  {position.shares.toLocaleString('en-US', { maximumFractionDigits: 6 })} shares
                </p>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              <div>
                <p className="text-sm text-gray-500">APY</p>
                <p className="text-lg font-semibold text-green-600">
                  {position.apy.toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">TVL</p>
                <p className="text-lg font-semibold text-gray-700">
                  ${(position.tvl / 1000000).toFixed(2)}M
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
