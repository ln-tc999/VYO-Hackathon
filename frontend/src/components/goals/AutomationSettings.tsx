// ============================================================
// AutomationSettings — configure auto-compound, auto-rebalance for a goal
// ============================================================

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUSDC } from '../../lib/hooks.js';
import { CONTRACTS, CHAIN_INFO } from '../../lib/wallet.js';
import { VYOROUTER_ABI } from '../../lib/abi.js';

interface Props {
  goalId: string;
  goalName: string;
  currentConfig?: {
    autoCompound: boolean;
    autoRebalance: boolean;
    compoundIntervalDays: number;
    rebalanceThresholdBps: number;
    minCompoundAmount: number;
  };
}

type Step = 'idle' | 'saving' | 'compounding' | 'done' | 'error';

export function AutomationSettings({ goalId, goalName, currentConfig }: Props) {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  const [autoCompound, setAutoCompound] = useState(currentConfig?.autoCompound ?? false);
  const [autoRebalance, setAutoRebalance] = useState(currentConfig?.autoRebalance ?? false);
  const [compoundInterval, setCompoundInterval] = useState(currentConfig?.compoundIntervalDays ?? 7);
  const [rebalanceThreshold, setRebalanceThreshold] = useState(currentConfig?.rebalanceThresholdBps ? currentConfig.rebalanceThresholdBps / 100 : 2);
  const [minCompound, setMinCompound] = useState(currentConfig?.minCompoundAmount ?? 10);

  const [step, setStep] = useState<Step>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const { writeContractAsync } = useWriteContract();

  const { isSuccess: txSuccess, isError: txError } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: !!txHash },
  });

  useEffect(() => {
    if (txSuccess && step === 'saving') {
      setStep('done');
      setStatusMsg('✓ Settings saved!');
    }
    if (txSuccess && step === 'compounding') {
      setStep('done');
      setStatusMsg('✓ Yield compounded!');
    }
  }, [txSuccess]);

  useEffect(() => {
    if (txError && (step === 'saving' || step === 'compounding')) {
      setStep('error');
      setStatusMsg('Transaction failed');
    }
  }, [txError]);

  const handleSaveSettings = async () => {
    if (!isConnected) {
      connect({ connector: connectors[0] });
      return;
    }

    try {
      setStep('saving');
      setStatusMsg('Saving settings...');

      const hash = await writeContractAsync({
        address: CONTRACTS.VyoRouter,
        abi: VYOROUTER_ABI,
        functionName: 'setAutomationConfig',
        args: [
          goalId as `0x${string}`,
          autoCompound,
          autoRebalance,
          compoundInterval,
          Math.round(rebalanceThreshold * 100), // Convert to bps
          parseUSDC(minCompound),
        ],
      } as any);

      setTxHash(hash);
    } catch (err: any) {
      setStep('error');
      setStatusMsg(err?.shortMessage || err?.message || 'Failed to save');
    }
  };

  const handleCompound = async () => {
    if (!isConnected) {
      connect({ connector: connectors[0] });
      return;
    }

    try {
      setStep('compounding');
      setStatusMsg('Compounding yield...');

      const hash = await writeContractAsync({
        address: CONTRACTS.VyoRouter,
        abi: VYOROUTER_ABI,
        functionName: 'compoundYield',
        args: [goalId as `0x${string}`],
      } as any);

      setTxHash(hash);
    } catch (err: any) {
      setStep('error');
      setStatusMsg(err?.shortMessage || err?.message || 'Failed to compound');
    }
  };

  const isLoading = step === 'saving' || step === 'compounding';

  return (
    <div className="automation-settings">
      <div className="automation-header">
        <h4 className="automation-title">Yield Automation</h4>
        <span className="automation-goal-name">{goalName}</span>
      </div>

      <div className="automation-grid">
        <label className="automation-toggle">
          <input
            type="checkbox"
            checked={autoCompound}
            onChange={(e) => setAutoCompound(e.target.checked)}
            disabled={isLoading}
          />
          <span className="toggle-slider"></span>
          <span className="toggle-label">
            <span className="toggle-title">Auto-Compound</span>
            <span className="toggle-desc">Automatically reinvest yield</span>
          </span>
        </label>

        <label className="automation-toggle">
          <input
            type="checkbox"
            checked={autoRebalance}
            onChange={(e) => setAutoRebalance(e.target.checked)}
            disabled={isLoading}
          />
          <span className="toggle-slider"></span>
          <span className="toggle-label">
            <span className="toggle-title">Auto-Rebalance</span>
            <span className="toggle-desc">Reallocate to maintain target</span>
          </span>
        </label>
      </div>

      {autoCompound && (
        <div className="automation-options">
          <div className="option-row">
            <div className="option-field">
              <label className="option-label">Compound Every</label>
              <select
                className="option-select"
                value={compoundInterval}
                onChange={(e) => setCompoundInterval(Number(e.target.value))}
                disabled={isLoading}
              >
                <option value={1}>Daily</option>
                <option value={3}>Every 3 days</option>
                <option value={7}>Weekly</option>
                <option value={14}>Every 2 weeks</option>
                <option value={30}>Monthly</option>
              </select>
            </div>

            <div className="option-field">
              <label className="option-label">Min Amount ($)</label>
              <input
                type="number"
                className="option-input"
                value={minCompound}
                onChange={(e) => setMinCompound(Number(e.target.value))}
                min={1}
                disabled={isLoading}
              />
            </div>

            {autoRebalance && (
              <div className="option-field">
                <label className="option-label">Rebalance Threshold (%)</label>
                <input
                  type="number"
                  className="option-input"
                  value={rebalanceThreshold}
                  onChange={(e) => setRebalanceThreshold(Number(e.target.value))}
                  min={0.5}
                  max={50}
                  step={0.5}
                  disabled={isLoading}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="automation-actions">
        <button
          className="automation-save-btn"
          onClick={handleSaveSettings}
          disabled={isLoading}
        >
          {isLoading && step === 'saving' ? 'Saving...' : 'Save Settings'}
        </button>

        <button
          className="automation-compound-btn"
          onClick={handleCompound}
          disabled={isLoading}
        >
          {isLoading && step === 'compounding' ? 'Compounding...' : 'Compound Now'}
        </button>
      </div>

      {statusMsg && (
        <div className={`automation-msg ${step === 'error' ? 'error' : step === 'done' ? 'success' : ''}`}>
          {statusMsg}
        </div>
      )}

      {txHash && step === 'done' && (
        <div className="automation-tx-link">
          <a
            href={`${CHAIN_INFO[CONTRACTS.VyoRouter ? 84532 : 8453]?.explorer || 'https://basescan.org'}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View transaction →
          </a>
        </div>
      )}

      <style>{`
        .automation-settings {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
          margin-top: 12px;
        }
        .automation-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 14px;
        }
        .automation-title {
          font-size: 0.9375rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }
        .automation-goal-name {
          font-size: var(--font-xs);
          color: var(--text-muted);
          background: rgba(255,255,255,0.05);
          padding: 3px 8px;
          border-radius: 6px;
        }
        .automation-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 14px;
        }
        .automation-toggle {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
        }
        .automation-toggle input {
          display: none;
        }
        .toggle-slider {
          width: 44px;
          height: 24px;
          background: rgba(255,255,255,0.1);
          border-radius: 12px;
          position: relative;
          transition: background 0.2s;
          flex-shrink: 0;
        }
        .toggle-slider::after {
          content: '';
          position: absolute;
          width: 18px;
          height: 18px;
          background: #666;
          border-radius: 50%;
          top: 3px;
          left: 3px;
          transition: transform 0.2s, background 0.2s;
        }
        .automation-toggle input:checked + .toggle-slider {
          background: rgba(200,241,53,0.3);
        }
        .automation-toggle input:checked + .toggle-slider::after {
          transform: translateX(20px);
          background: var(--lime);
        }
        .toggle-label {
          display: flex;
          flex-direction: column;
        }
        .toggle-title {
          font-size: var(--font-sm);
          font-weight: 600;
          color: var(--text-primary);
        }
        .toggle-desc {
          font-size: var(--font-xs);
          color: var(--text-muted);
        }
        .automation-options {
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 14px;
        }
        .option-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .option-field {
          flex: 1;
          min-width: 120px;
        }
        .option-label {
          display: block;
          font-size: var(--font-xs);
          color: var(--text-muted);
          margin-bottom: 6px;
          font-weight: 500;
        }
        .option-select, .option-input {
          width: 100%;
          padding: 8px 10px;
          background: var(--bg-input);
          border: 1px solid var(--border);
          border-radius: 6px;
          font-size: var(--font-sm);
          color: var(--text-primary);
          font-family: var(--font);
        }
        .option-select:focus, .option-input:focus {
          outline: none;
          border-color: var(--lime);
        }
        .automation-actions {
          display: flex;
          gap: 10px;
        }
        .automation-save-btn {
          flex: 1;
          padding: 10px 16px;
          border-radius: 8px;
          background: var(--lime);
          color: #000;
          font-size: var(--font-sm);
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: background 0.15s;
        }
        .automation-save-btn:hover:not(:disabled) {
          background: #d4f53c;
        }
        .automation-save-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .automation-compound-btn {
          flex: 1;
          padding: 10px 16px;
          border-radius: 8px;
          background: rgba(200,241,53,0.1);
          color: var(--lime);
          font-size: var(--font-sm);
          font-weight: 700;
          border: 1px solid var(--lime);
          cursor: pointer;
          transition: background 0.15s;
        }
        .automation-compound-btn:hover:not(:disabled) {
          background: rgba(200,241,53,0.2);
        }
        .automation-compound-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .automation-msg {
          margin-top: 10px;
          font-size: var(--font-xs);
          text-align: center;
          color: var(--text-muted);
        }
        .automation-msg.success {
          color: var(--lime);
        }
        .automation-msg.error {
          color: var(--red);
        }
        .automation-tx-link {
          margin-top: 8px;
          text-align: center;
          font-size: var(--font-xs);
        }
        .automation-tx-link a {
          color: var(--lime);
        }
      `}</style>
    </div>
  );
}
