// ============================================================
// RedeemForm — YO vault withdraw/redeem with burn shares flow
// ============================================================

import { useState, useEffect, useRef } from 'react';
import {
  useAccount,
  useConnect,
  useSendTransaction,
  useWaitForTransactionReceipt,
  useReadContract,
  useWriteContract,
} from 'wagmi';
import { parseUnits, formatUnits } from 'viem';

const API = '/api';

const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

const VAULT_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'convertToAssets',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'shares', type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

interface Props {
  vaultAddress: string;
  vaultSymbol: string;
  underlyingSymbol: string;
  apy: number;
}

type Step = 'idle' | 'previewing' | 'redeeming' | 'redeem_wait' | 'done' | 'error';

export function RedeemForm({ vaultAddress, vaultSymbol, underlyingSymbol, apy }: Props) {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  const [shares, setShares]         = useState('');
  const [preview, setPreview]       = useState<{ assets: number } | null>(null);
  const [step, setStep]             = useState<Step>('idle');
  const [statusMsg, setStatusMsg]   = useState('');
  const [txHash, setTxHash]         = useState<`0x${string}` | undefined>();

  const [decimals, setDecimals] = useState(6);
  const pendingTxsRef = useRef<{ to: string; data: string; value: string }[] | null>(null);

  // ── Load vault info on mount ──────────────────────────────
  useEffect(() => {
    fetch(`${API}/vaults/${vaultAddress}`)
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) {
          setDecimals(json.data.underlyingDecimals ?? 6);
        }
      })
      .catch(() => {/* silent */});
  }, [vaultAddress]);

  // ── On-chain reads ────────────────────────────────────────
  // User's shares in the vault (yearn position)
  const { data: vaultSharesRaw } = useReadContract({
    address: vaultAddress as `0x${string}`,
    abi: VAULT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Convert shares to assets for display
  const { data: assetValueRaw } = useReadContract({
    address: vaultAddress as `0x${string}`,
    abi: VAULT_ABI,
    functionName: 'convertToAssets',
    args: vaultSharesRaw ? [vaultSharesRaw] : undefined,
    query: { enabled: !!vaultSharesRaw && vaultSharesRaw > 0n },
  });

  // ── Write hooks ─────────────────────────────────────────
  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();

  const { isSuccess: redeemSuccess, isError: redeemError } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: !!txHash },
  });

  // ── Derived values ────────────────────────────────────────
  const sharesNum      = parseFloat(shares) || 0;
  const sharesHuman    = vaultSharesRaw ? parseFloat(formatUnits(vaultSharesRaw as bigint, decimals)) : 0;
  const assetsHuman    = assetValueRaw ? parseFloat(formatUnits(assetValueRaw as bigint, decimals)) : 0;

  // ── Preview (debounced 600ms) ─────────────────────────────
  useEffect(() => {
    if (!sharesNum || sharesNum <= 0) { setPreview(null); return; }
    const t = setTimeout(async () => {
      setStep('previewing');
      try {
        const res  = await fetch(`${API}/transactions/preview-redeem`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vaultAddress, shares: sharesNum }),
        });
        const json = await res.json();
        if (json.success) {
          setPreview({ assets: json.data.redeem.expectedAssets });
        }
      } catch { /* silent */ }
      setStep('idle');
    }, 600);
    return () => clearTimeout(t);
  }, [sharesNum, vaultAddress]);

  // ── After redeem confirmed ───────────────────────────────
  useEffect(() => {
    if (redeemSuccess && step === 'redeem_wait') {
      setStep('done');
      setStatusMsg('✓ Withdrawal confirmed!');
    }
  }, [redeemSuccess]);

  useEffect(() => {
    if (redeemError && step === 'redeem_wait') {
      setStep('error');
      setStatusMsg('Transaction failed. Check your wallet.');
    }
  }, [redeemError]);

  // ── Send redeem tx ───────────────────────────────────────
  const sendRedeem = async (txs: { to: string; data: string; value: string }[]) => {
    try {
      setStep('redeeming');
      setStatusMsg('Sending withdrawal...');
      const redeemTx = txs[txs.length - 1];
      const hash = await sendTransactionAsync({
        to:    redeemTx.to as `0x${string}`,
        data:  redeemTx.data as `0x${string}`,
        value: BigInt(redeemTx.value || '0'),
      });
      setTxHash(hash);
      setStep('redeem_wait');
      setStatusMsg('Waiting for confirmation...');
    } catch (err: any) {
      setStep('error');
      setStatusMsg(err?.shortMessage || err?.message || 'Transaction rejected');
    }
  };

  // ── Main submit ───────────────────────────────────────────
  const handleSubmit = async () => {
    if (!isConnected || !address) {
      connect({ connector: connectors[0] });
      return;
    }
    if (!sharesNum || sharesNum <= 0) { setStatusMsg('Enter a valid amount'); return; }
    if (sharesNum > sharesHuman) {
      setStatusMsg(`Insufficient balance (${sharesHuman.toFixed(4)} ${vaultSymbol})`);
      return;
    }

    setStatusMsg('');
    setStep('idle');

    try {
      // Build tx calldata from backend
      const res  = await fetch(`${API}/transactions/build-redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vaultAddress, shares: sharesNum, userAddress: address }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Build failed');

      const txs = json.data.transactions as { to: string; data: string; value: string }[];
      pendingTxsRef.current = txs;
      await sendRedeem(txs);
    } catch (err: any) {
      setStep('error');
      setStatusMsg(err?.shortMessage || err?.message || 'Something went wrong');
    }
  };

  // ── Max button ───────────────────────────────────────────
  const handleSetMax = () => {
    if (sharesHuman > 0) {
      setShares(sharesHuman.toFixed(6));
    }
  };

  // ── UI ────────────────────────────────────────────────────
  const isLoading = ['previewing', 'redeeming', 'redeem_wait'].includes(step);

  const btnLabel = () => {
    if (!isConnected)              return 'Connect Wallet';
    if (step === 'previewing')     return 'Previewing...';
    if (step === 'redeeming')     return 'Sending...';
    if (step === 'redeem_wait')   return 'Confirming...';
    if (step === 'done')           return '✓ Done';
    return 'Withdraw';
  };

  const msgClass = step === 'error' ? 'redeem-msg err'
    : step === 'done' ? 'redeem-msg ok'
    : 'redeem-msg';

  return (
    <div className="redeem-form">
      <div className="redeem-form-title">Withdraw from {vaultSymbol}</div>

      {isConnected && vaultSharesRaw !== undefined && (
        <div style={{ fontSize: '0.6875rem', color: '#555', marginBottom: 8, textAlign: 'right' }}>
          Your shares: {sharesHuman.toFixed(4)} {vaultSymbol}
          <span style={{ margin: '0 6px', color: '#666' }}>|</span>
          Value: {assetsHuman.toFixed(4)} {underlyingSymbol}
          {sharesHuman > 0 && (
            <button
              onClick={handleSetMax}
              style={{ marginLeft: 6, color: 'var(--lime)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.6875rem', fontWeight: 700 }}
            >
              MAX
            </button>
          )}
        </div>
      )}

      <div className="redeem-input-wrap">
        <input
          className="redeem-input"
          type="number"
          min="0"
          step="any"
          placeholder="0.00"
          value={shares}
          onChange={e => { setShares(e.target.value); setStep('idle'); setStatusMsg(''); }}
          disabled={isLoading || step === 'done'}
        />
        <span className="redeem-input-sym">{vaultSymbol}</span>
      </div>

      {preview && sharesNum > 0 && (
        <div className="redeem-preview show">
          <div className="redeem-preview-row">
            <span className="redeem-preview-label">You receive</span>
            <span className="redeem-preview-val">{preview.assets.toFixed(4)} {underlyingSymbol}</span>
          </div>
          <div className="redeem-preview-row" style={{ marginTop: 4 }}>
            <span className="redeem-preview-label">Burn</span>
            <span className="redeem-preview-val">{sharesNum.toFixed(4)} {vaultSymbol}</span>
          </div>
        </div>
      )}

      <button
        className="redeem-submit"
        onClick={handleSubmit}
        disabled={isLoading || step === 'done'}
      >
        {btnLabel()}
      </button>

      {statusMsg && <div className={msgClass}>{statusMsg}</div>}

      {txHash && (
        <div style={{ marginTop: 8, textAlign: 'center', fontSize: '0.6875rem' }}>
          <a
            href={`https://basescan.org/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--lime)' }}
          >
            View on Basescan →
          </a>
        </div>
      )}

      {step === 'done' && (
        <button
          onClick={() => { setStep('idle'); setShares(''); setPreview(null); setStatusMsg(''); setTxHash(undefined); pendingTxsRef.current = null; }}
          style={{ width: '100%', marginTop: 8, padding: '8px', background: 'none', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8125rem', fontFamily: 'var(--font)' }}
        >
          New withdrawal
        </button>
      )}
    </div>
  );
}
