// ============================================================
// AutomationIsland — per-goal Chainlink automation settings
// Listens for 'goal-automation' custom event from goals page
// ============================================================

import { useState, useEffect } from 'react';
import { WagmiProvider, useAccount } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '../../lib/wallet.js';

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } });

interface GoalInfo { id: string; name: string; }

interface AutomationConfig {
  enabled: boolean;
  autoCompound: boolean;
  autoRebalance: boolean;
  compoundIntervalDays: number;
  rebalanceThresholdBps: number;
  minCompoundAmount: number;
}

const DEFAULT_CONFIG: AutomationConfig = {
  enabled: false,
  autoCompound: true,
  autoRebalance: false,
  compoundIntervalDays: 7,
  rebalanceThresholdBps: 200,
  minCompoundAmount: 10,
};

function AutomationPanel({ goal, onClose }: { goal: GoalInfo; onClose: () => void }) {
  const { address, isConnected } = useAccount();
  const [config, setConfig]   = useState<AutomationConfig>(DEFAULT_CONFIG);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState('');
  const [msgType, setMsgType] = useState<'ok' | 'err'>('ok');

  // Load existing config from backend (reads from contract via backend)
  useEffect(() => {
    if (!goal.id) return;
    fetch(`/api/ai/automation/${goal.id}`)
      .then(r => r.json())
      .then(j => { if (j.success && j.data) setConfig(j.data); })
      .catch(() => {/* use defaults */});
  }, [goal.id]);

  const save = async () => {
    if (!isConnected || !address) { setMsg('Connect wallet first'); setMsgType('err'); return; }
    setSaving(true); setMsg('');
    try {
      const res = await fetch(`/api/ai/automation/${goal.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Wallet-Address': address },
        body: JSON.stringify(config),
      });
      const j = await res.json();
      if (j.success) {
        setMsg('✓ Automation settings saved');
        setMsgType('ok');
      } else {
        setMsg(j.error || 'Failed to save');
        setMsgType('err');
      }
    } catch {
      setMsg('Network error');
      setMsgType('err');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.panel}>
        {/* Header */}
        <div style={S.header}>
          <div>
            <div style={S.headerTitle}>⚙ Automation</div>
            <div style={S.headerSub}>{goal.name}</div>
          </div>
          <button onClick={onClose} style={S.closeBtn}>✕</button>
        </div>

        {/* Master toggle */}
        <div style={S.masterRow}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Enable Automation</div>
            <div style={{ fontSize: '0.75rem', color: '#555', marginTop: 2 }}>
              Chainlink Automation runs 24/7 on-chain
            </div>
          </div>
          <Toggle
            value={config.enabled}
            onChange={v => setConfig(c => ({ ...c, enabled: v }))}
          />
        </div>

        <div style={{ opacity: config.enabled ? 1 : 0.4, transition: 'opacity 0.2s', pointerEvents: config.enabled ? 'auto' : 'none' }}>

          {/* Auto Compound */}
          <Section title="Auto-Compound" icon="🔄"
            desc="Automatically reinvest yield back into the vault">
            <div style={S.settingRow}>
              <span style={S.settingLabel}>Enable</span>
              <Toggle value={config.autoCompound} onChange={v => setConfig(c => ({ ...c, autoCompound: v }))} />
            </div>
            {config.autoCompound && (
              <>
                <div style={S.settingRow}>
                  <span style={S.settingLabel}>Every</span>
                  <div style={S.inputGroup}>
                    <input
                      type="number" min="1" max="90"
                      value={config.compoundIntervalDays}
                      onChange={e => setConfig(c => ({ ...c, compoundIntervalDays: parseInt(e.target.value) || 7 }))}
                      style={S.numInput}
                    />
                    <span style={S.inputSuffix}>days</span>
                  </div>
                </div>
                <div style={S.settingRow}>
                  <span style={S.settingLabel}>Min yield to compound</span>
                  <div style={S.inputGroup}>
                    <span style={{ ...S.inputSuffix, marginRight: 4 }}>$</span>
                    <input
                      type="number" min="1"
                      value={config.minCompoundAmount}
                      onChange={e => setConfig(c => ({ ...c, minCompoundAmount: parseFloat(e.target.value) || 10 }))}
                      style={S.numInput}
                    />
                  </div>
                </div>
              </>
            )}
          </Section>

          {/* Auto Rebalance */}
          <Section title="Auto-Rebalance" icon="⇄"
            desc="Move funds to higher-yield vaults when threshold is met">
            <div style={S.settingRow}>
              <span style={S.settingLabel}>Enable</span>
              <Toggle value={config.autoRebalance} onChange={v => setConfig(c => ({ ...c, autoRebalance: v }))} />
            </div>
            {config.autoRebalance && (
              <div style={S.settingRow}>
                <span style={S.settingLabel}>APY threshold</span>
                <div style={S.inputGroup}>
                  <input
                    type="number" min="50" max="1000" step="50"
                    value={config.rebalanceThresholdBps}
                    onChange={e => setConfig(c => ({ ...c, rebalanceThresholdBps: parseInt(e.target.value) || 200 }))}
                    style={S.numInput}
                  />
                  <span style={S.inputSuffix}>bps ({(config.rebalanceThresholdBps / 100).toFixed(1)}%)</span>
                </div>
              </div>
            )}
          </Section>

          {/* Info box */}
          <div style={S.infoBox}>
            <div style={{ fontSize: '0.6875rem', color: '#555', lineHeight: 1.6 }}>
              ⚡ Powered by <span style={{ color: '#c8f135' }}>Chainlink Automation</span>.
              Compound runs automatically when conditions are met.
              Rebalance always requires your approval.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={S.footer}>
          {msg && <div style={{ fontSize: '0.75rem', color: msgType === 'ok' ? '#c8f135' : '#ef4444' }}>{msg}</div>}
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <button onClick={onClose} style={S.cancelBtn}>Cancel</button>
            <button onClick={save} disabled={saving} style={S.saveBtn}>
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
        background: value ? '#c8f135' : 'rgba(255,255,255,0.1)',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: value ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%',
        background: value ? '#000' : '#555',
        transition: 'left 0.2s',
      }} />
    </button>
  );
}

function Section({ title, icon, desc, children }: { title: string; icon: string; desc: string; children: React.ReactNode }) {
  return (
    <div style={S.section}>
      <div style={S.sectionHeader}>
        <span style={{ fontSize: '1rem' }}>{icon}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{title}</div>
          <div style={{ fontSize: '0.6875rem', color: '#555', marginTop: 1 }}>{desc}</div>
        </div>
      </div>
      <div style={{ paddingLeft: 8 }}>{children}</div>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 16,
  },
  panel: {
    background: '#161616', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 16, width: '100%', maxWidth: 440,
    maxHeight: '90vh', overflowY: 'auto',
    display: 'flex', flexDirection: 'column',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '18px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)',
  },
  headerTitle: { fontWeight: 800, fontSize: '1rem' },
  headerSub: { fontSize: '0.75rem', color: '#555', marginTop: 2 },
  closeBtn: {
    background: 'none', border: 'none', color: '#555', cursor: 'pointer',
    fontSize: '1rem', padding: 4, lineHeight: 1,
  },
  masterRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)',
  },
  section: {
    padding: '14px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  sectionHeader: {
    display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12,
  },
  settingRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10,
  },
  settingLabel: { fontSize: '0.8125rem', color: '#888' },
  inputGroup: { display: 'flex', alignItems: 'center', gap: 6 },
  numInput: {
    width: 64, padding: '5px 8px', background: '#1a1a1a',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7,
    color: '#fff', fontSize: '0.875rem', fontWeight: 700,
    fontFamily: 'var(--font)', textAlign: 'right' as const,
  },
  inputSuffix: { fontSize: '0.75rem', color: '#555' },
  infoBox: {
    margin: '0 20px 14px',
    padding: '10px 12px',
    background: 'rgba(200,241,53,0.04)',
    border: '1px solid rgba(200,241,53,0.1)',
    borderRadius: 8,
  },
  footer: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.07)',
  },
  cancelBtn: {
    padding: '9px 16px', borderRadius: 8, background: 'none',
    border: '1px solid rgba(255,255,255,0.1)', color: '#888',
    cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'var(--font)',
  },
  saveBtn: {
    padding: '9px 20px', borderRadius: 8,
    background: '#c8f135', color: '#000',
    border: 'none', cursor: 'pointer',
    fontSize: '0.875rem', fontWeight: 700, fontFamily: 'var(--font)',
  },
};

// ── Root component ───────────────────────────────────────────
function AutomationController() {
  const [goal, setGoal] = useState<GoalInfo | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { goal: GoalInfo };
      setGoal(detail.goal);
      // Move island into goal card's mount div
      const mountEl = document.getElementById(`automation-mount-${detail.goal.id}`);
      const rootEl  = document.getElementById('automation-island-root');
      if (mountEl && rootEl) {
        mountEl.appendChild(rootEl);
        rootEl.style.display = 'block';
      }
    };
    window.addEventListener('goal-automation', handler);
    return () => window.removeEventListener('goal-automation', handler);
  }, []);

  if (!goal) return null;
  return <AutomationPanel goal={goal} onClose={() => setGoal(null)} />;
}

export default function AutomationIsland() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={qc}>
        <AutomationController />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
