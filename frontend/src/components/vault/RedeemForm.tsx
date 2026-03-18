// ============================================================
// RedeemForm — YO vault withdraw (redeem shares → underlying)
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
    name: 'allowance', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'approve', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'balanceOf', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

interface Props {
  vaultAddress: string;
  vaultSymbol: string;
  underlyingSymbol: string;
  apy: number;
}

type Step = 'idle' | 'previewing' | 'approving' | 'approve_wait' | 'redeeming' | 'redeem_wait' | 'done' | 'error';

export function RedeemForm({ vaultAddress, vaultSymbol, underlyingSymbol, apy }: Props) {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  const [shares, setShares]       = useState('');
  const [preview, setPreview]     = useState<{ assets: number } | null>(null);
  const [step, setStep]           = useState<Step>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [txHash, setTxHash]       = useState<`0x${string}` | undefined>();
  const [approveTxHash, setApproveTxHash] = useState<`0x${string}` | undefined>();

  const [decimals, setDecimals]   = useState(6);
  const [vaultLoading, setVaultLoading] = useState(true);
  const pendingTxsRef = useRef<{ to: string; data: string; value: string }[] | null>(null);

  // Load vault info
  useEffect(() => {
    setVaultLoading(true);
    fetch(`${API}/vaults/${vaultAddress}`)
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) setDecimals(json.data.underlyingDecimals ?? 6);
      })
      .catch(() => {})
      .finally(() => setVaultLoading(false));
  }, [vaultAddress]);

  // Share token balance (vault shares are ERC20 too)
  const { data: shareBalanceRaw } = useReadContract({
    address: vaultAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Allowance for vault to burn shares (some vaults require approve)
  const { data: allowanceRaw, refetch: refetchAllowance } = useReadContract({
    address: vaultAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, vaultAddress as `0x${string}`] : undefined,
    query: { enabled: !!address },
  });

  const { writeContractAsync }    = useWriteContract();
  const { sendTransactionAsync }  = useSendTransaction();

  const { isSuccess: approveSuccess } = useWaitForTransactionReceipt({
    hash: approveTxHash,
    query: { enabled: !!approveTxHash },
  });

  const { isSuccess: redeemSuccess, isError: redeemError } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: !!txHash },
  });

  const sharesNum       = parseFloat(shares) || 0;
  const shareBalance    = shareBalanceRaw ? parseFloat(formatUnits(shareBalanceRaw as bigint, decimals)) : 0;
  const allowanceHuman  = allowanceRaw ? parseFloat(formatUnits(allowanceRaw as bigint, decimals)) : 0;
  const needsApprove    = sharesNum > 0 && allowanceHuman < sharesNum;

  // Preview (debounced)
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
        if (json.success) setPreview({ assets: json.data.redeem.expectedAssets });
      } catch { /* silent */ }
      setStep('idle');
    }, 600);
    return () => clearTimeout(t);
  }, [sharesNum, vaultAddress]);

  // After approve → send redeem
  useEffect(() => {
    if (!approveSuccess || step !== 'approve_wait') return;
    const txs = pendingTxsRef.current;
    if (!txs) return;
    refetchAllowance();
    sendRedeem(txs);
  }, [approveSuccess]);

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

  const handleSubmit = async () => {
    if (!isConnected || !address) { connect({ connector: connectors[0] }); return; }
    if (!sharesNum || sharesNum <= 0) { setStatusMsg('Enter a valid amount'); return; }
    if (vaultLoading) { setStatusMsg('Loading vault info...'); return; }
    if (sharesNum > shareBalance) {
      setStatusMsg(`Insufficient shares (${shareBalance.toFixed(4)} ${vaultSymbol})`);
      return;
    }

    setStatusMsg(''); setStep('idle');

    try {
      const res  = await fetch(`${API}/transactions/build-redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vaultAddress, shares: sharesNum, userAddress: address }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Build failed');

      const txs = json.data.transactions as { to: string; data: string; value: string }[];
      pendingTxsRef.current = txs;

      if (needsApprove) {
        setStep('approving');
        setStatusMsg('Approving share burn...');
        const sharesWei = parseUnits(shares, decimals);
        const hash = await writeContractAsync({
          address: vaultAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [vaultAddress as `0x${string}`, sharesWei],
        } as any);
        setApproveTxHash(hash);
        setStep('approve_wait');
        setStatusMsg('Waiting for approval...');
      } else {
        await sendRedeem(txs);
      }
    } catch (err: any) {
      setStep('error');
      setStatusMsg(err?.shortMessage || err?.message || 'Something went wrong');
    }
  };

  const isLoading = ['previewing','approving','approve_wait','redeeming','redeem_wait'].includes(step);

  const btnLabel = () => {
    if (!isConnected)             return 'Connect Wallet';
    if (step === 'previewing')    return 'Previewing...';
    if (step === 'approving')     return 'Approving...';
    if (step === 'approve_wait')  return 'Waiting for approval...';
    if (step === 'redeeming')     return 'Sending...';
    if (step === 'redeem_wait')   return 'Confirming...';
    if (step === 'done')          return '✓ Done';
    if (needsApprove)             return 'Approve & Withdraw';
    return 'Withdraw';
  };

  const msgClass = step === 'error' ? 'redeem-msg err'
    : step === 'done' ? 'redeem-msg ok'
    : 'redeem-msg';

  return (
    <div className="redeem-form">
      <div className="redeem-form-title">Withdraw from {vaultSymbol}</div>

      {isConnected && shareBalanceRaw !== undefined && (
        <div style={{ fontSize: '0.6875rem', color: '#555', marginBottom: 8, textAlign: 'right' }}>
          Shares: {shareBalance.toFixed(4)} {vaultSymbol}
          {shareBalance > 0 && (
            <button
              onClick={() => setShares(shareBalance.toFixed(6))}
              style={{ marginLeft: 6, color: 'var(--amber)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.6875rem', fontWeight: 700 }}
            >
              MAX
            </button>
          )}
        </div>
      )}

      <div className="redeem-input-wrap">
        <input
          className="redeem-input"
          type="number" min="0" step="any" placeholder="0.00"
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
            <span className="redeem-preview-label">Current APY</span>
            <span className="redeem-preview-val">{apy.toFixed(2)}%</span>
          </div>
          {needsApprove && (
            <div style={{ marginTop: 6, fontSize: '0.6875rem', color: 'var(--amber)' }}>
              ⚠ Approval required before withdrawal
            </div>
          )}
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
          <a href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--amber)' }}>
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
