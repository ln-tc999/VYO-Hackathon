// ============================================================
// NavWallet — Navbar wallet button with Wagmi integration
// ============================================================

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useEffect, useRef, useState } from 'react';
import { walletActions } from '../../stores/wallet.js';

export function NavWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isConnected && address) {
      walletActions.connect(address, 84532);
    } else {
      walletActions.disconnect();
    }
  }, [isConnected, address]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  if (isConnected && address) {
    return (
      <div ref={menuRef} style={{ position: 'relative' }}>
        <button className="nav-wallet-btn" onClick={() => setShowMenu(v => !v)}>
          <span style={{ fontSize: '1rem' }}>🦊</span>
          <span>{truncate(address)}</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>

        {showMenu && (
          <div className="nav-wallet-menu">
            <div className="nav-wallet-menu-addr">{truncate(address)}</div>
            <button
              className="nav-wallet-disconnect"
              onClick={() => { disconnect(); setShowMenu(false); }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  const connector = connectors[0];

  return (
    <button
      className="nav-wallet-btn"
      onClick={() => connector && connect({ connector })}
      disabled={isPending || !connector}
    >
      <span style={{ fontSize: '1rem' }}>🦊</span>
      <span>{isPending ? 'Connecting...' : 'Connect Wallet'}</span>
    </button>
  );
}
