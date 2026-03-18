// ============================================================
// DepositForm — YO vault deposit with approve + send flow
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
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
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner',   type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount',  type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
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

type Step = 'idle' | 'previewing' | 'approving' | 'approve_wait' | 'depositing' | 'deposit_wait' | 'done' | 'error';

export function DepositForm({ vaultAddress, vaultSymbol, underlyingSymbol, apy }: Props) {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  const [amount, setAmount]       = useState('');
  const [preview, setPreview]     = useState<{ shares: number; slippage: number } | null>(null);
  const [step, setStep]           = useState<Step>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [txHash, setTxHash]       = useState<`0x${string}` | undefined>();
  const [approveTxHash, setApproveTxHash] = useState<`0x${string}` | undefined>();

  // Vault underlying info — loaded on mount
  const [underlyingAddress, setUnderlyingAddress] = useState<`0x${string}` | null>(null);
  const [decimals, setDecimals] = useState(6);

  // Ref to hold pending txs across async boundaries
  const pendingTxsRef = useRef<{ to: string; data: string; value: string }[] | null>(null);

  // ── Load vault info on mount ──────────────────────────────
  useEffect(() => {
    fetch(`${API}/vaults/${vaultAddress}`)
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) {
          setUnderlyingAddress(json.data.underlyingAsset as `0x${string}`);
          setDecimals(json.data.underlyingDecimals ?? 6);
        }
      })
      .catch(() => {/* silent */});
  }, [vaultAddress]);

  // ── On-chain reads ────────────────────────────────────────
  const { data: allowanceRaw, refetch: refetchAllowance } = useReadContract({
    address: underlyingAddress ?? undefined,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && underlyingAddress ? [address, vaultAddress as `0x${string}`] : undefined,
    query: { enabled: !!address && !!underlyingAddress },
  });

  const { data: balanceRaw } = useReadContract({
    address: underlyingAddress ?? undefined,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!underlyingAddress },
  });

  // ── Write hooks ───────────────────────────────────────────
  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();

  const { isSuccess: approveSuccess } = useWaitForTransactionReceipt({
    hash: approveTxHash,
    query: { enabled: !!approveTxHash },
  });

  const { isSuccess: depositSuccess, isError: depositError } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: !!txHash },
  });

  // ── Derived values ────────────────────────────────────────
  const amountNum      = parseFloat(amount) || 0;
  const balanceHuman   = balanceRaw ? parseFloat(formatUnits(balanceRaw as bigint, decimals)) : 0;
  const allowanceHuman = allowanceRaw ? parseFloat(formatUnits(allowanceRaw as bigint, decimals)) : 0;
  const needsApprove   = amountNum > 0 && allowanceHuman < amountNum;

  // ── Preview (debounced 600ms) ─────────────────────────────
  useEffect(() => {
    if (!amountNum || amountNum <= 0) { setPreview(null); return; }
    const t = setTimeout(async () => {
      setStep('previewing');
      try {
        const res  = await fetch(`${API}/transactions/preview-deposit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vaultAddress, amount: amountNum }),
        });
        const json = await res.json();
        if (json.success) {
          setPreview({ shares: json.data.shares, slippage: json.data.slippage ?? 0.5 });
        }
      } catch { /* silent */ }
      setStep('idle');
    }, 600);
    return () => clearTimeout(t);
  }, [amountNum, vaultAddress]);

  // ── After approve confirmed → send deposit ────────────────
  useEffect(() => {
    if (!approveSuccess || step !== 'approve_wait') return;
    const txs = pendingTxsRef.current;
    if (!txs) return;
    refetchAllowance();
    sendDeposit(txs);
  }, [approveSuccess]);

  // ── After deposit confirmed ───────────────────────────────
  useEffect(() => {
    if (depositSuccess && step === 'deposit_wait') {
      setStep('done');
      setStatusMsg('✓ Deposit confirmed!');
    }
  }, [depositSuccess]);

  useEffect(() => {
    if (depositError && step === 'deposit_wait') {
      setStep('error');
      setStatusMsg('Transaction failed. Check your wallet.');
    }
  }, [depositError]);

  // ── Send deposit tx ───────────────────────────────────────
  const sendDeposit = async (txs: { to: string; data: string; value: string }[]) => {
    try {
      setStep('depositing');
      setStatusMsg('Sending deposit...');
      const depositTx = txs[txs.length - 1];
      const hash = await sendTransactionAsync({
        to:    depositTx.to as `0x${string}`,
        data:  depositTx.data as `0x${string}`,
        value: BigInt(depositTx.value || '0'),
      });
      setTxHash(hash);
      setStep('deposit_wait');
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
    if (!amountNum || amountNum <= 0) { setStatusMsg('Enter a valid amount'); return; }
    if (amountNum > balanceHuman) {
      setStatusMsg(`Insufficient balance (${balanceHuman.toFixed(4)} ${underlyingSymbol})`);
      return;
    }

    setStatusMsg('');
    setStep('idle');

    try {
      // Build tx calldata from backend
      const res  = await fetch(`${API}/transactions/build-deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vaultAddress, amount: amountNum, userAddress: address }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Build failed');

      const txs = json.data.transactions as { to: string; data: string; value: string }[];
      pendingTxsRef.current = txs;

      if (needsApprove && underlyingAddress) {
        setStep('approving');
        setStatusMsg('Approving token spend...');
        const amountWei = parseUnits(amount, decimals);
        const hash = await writeContractAsync({
          address: underlyingAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [vaultAddress as `0x${string}`, amountWei],
        } as any);
        setApproveTxHash(hash);
        setStep('approve_wait');
        setStatusMsg('Waiting for approval confirmation...');
        // sendDeposit triggered by approveSuccess effect
      } else {
        await sendDeposit(txs);
      }
    } catch (err: any) {
      setStep('error');
      setStatusMsg(err?.shortMessage || err?.message || 'Something went wrong');
    }
  };

  // ── UI ────────────────────────────────────────────────────
  const isLoading = ['previewing','approving','approve_wait','depositing','deposit_wait'].includes(step);

  const btnLabel = () => {
    if (!isConnected)              return 'Connect Wallet';
    if (step === 'previewing')     return 'Previewing...';
    if (step === 'approving')      return 'Approving...';
    if (step === 'approve_wait')   return 'Waiting for approval...';
    if (step === 'depositing')     return 'Sending...';
    if (step === 'deposit_wait')   return 'Confirming...';
    if (step === 'done')           return '✓ Done';
    if (needsApprove)              return 'Approve & Deposit';
    return 'Deposit';
  };

  const msgClass = step === 'error' ? 'deposit-msg err'
    : step === 'done' ? 'deposit-msg ok'
    : 'deposit-msg';

  return (
    <div className="deposit-form">
      <div className="deposit-form-title">Deposit into {vaultSymbol}</div>

      {isConnected && balanceRaw !== undefined && (
        <div style={{ fontSize: '0.6875rem', color: '#555', marginBottom: 8, textAlign: 'right' }}>
          Balance: {balanceHuman.toFixed(4)} {underlyingSymbol}
          {balanceHuman > 0 && (
            <button
              onClick={() => setAmount(balanceHuman.toFixed(6))}
              style={{ marginLeft: 6, color: 'var(--lime)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.6875rem', fontWeight: 700 }}
            >
              MAX
            </button>
          )}
        </div>
      )}

      <div className="deposit-input-wrap">
        <input
          className="deposit-input"
          type="number"
          min="0"
          step="any"
          placeholder="0.00"
          value={amount}
          onChange={e => { setAmount(e.target.value); setStep('idle'); setStatusMsg(''); }}
          disabled={isLoading || step === 'done'}
        />
        <span className="deposit-input-sym">{underlyingSymbol}</span>
      </div>

      {preview && amountNum > 0 && (
        <div className="deposit-preview show">
          <div className="deposit-preview-row">
            <span className="deposit-preview-label">You receive</span>
            <span className="deposit-preview-val">{preview.shares.toFixed(4)} {vaultSymbol}</span>
          </div>
          <div className="deposit-preview-row" style={{ marginTop: 4 }}>
            <span className="deposit-preview-label">APY (7d)</span>
            <span className="deposit-preview-val">{apy.toFixed(2)}%</span>
          </div>
          <div className="deposit-preview-row" style={{ marginTop: 4 }}>
            <span className="deposit-preview-label">Slippage</span>
            <span className="deposit-preview-val">{preview.slippage}%</span>
          </div>
          {needsApprove && (
            <div style={{ marginTop: 6, fontSize: '0.6875rem', color: 'var(--amber)' }}>
              ⚠ Approval required before deposit
            </div>
          )}
        </div>
      )}

      <button
        className="deposit-submit"
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
          onClick={() => { setStep('idle'); setAmount(''); setPreview(null); setStatusMsg(''); setTxHash(undefined); pendingTxsRef.current = null; }}
          style={{ width: '100%', marginTop: 8, padding: '8px', background: 'none', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8125rem', fontFamily: 'var(--font)' }}
        >
          New deposit
        </button>
      )}
    </div>
  );
}
