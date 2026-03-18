// ============================================================
// OnboardingBanner — shown to first-time / disconnected users
// Dismissible, explains the 3-step flow
// ============================================================

import { useState, useEffect } from 'react';
import { WagmiProvider, useAccount } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '../../lib/wallet.js';

const qc = new QueryClient();
const DISMISSED_KEY = 'vyo_onboarding_dismissed';

const STEPS = [
  {
    icon: '🔗',
    title: 'Connect Wallet',
    desc: 'Use MetaMask or any injected wallet on Base Mainnet.',
    cta: null,
  },
  {
    icon: '🏦',
    title: 'Pick a Vault',
    desc: 'Browse audited YO Protocol vaults. Choose by APY, risk, or asset.',
    cta: { label: 'Browse Vaults', href: '/dashboard/vaults' },
  },
  {
    icon: '⚡',
    title: 'Earn & Automate',
    desc: 'Deposit once. Vyo AI monitors and compounds your yield 24/7.',
    cta: { label: 'See AI Agent', href: '/dashboard/ai' },
  },
];

function Banner() {
  const { isConnected } = useAccount();
  const [dismissed, setDismissed] = useState(true); // start hidden, check storage

  useEffect(() => {
    const d = localStorage.getItem(DISMISSED_KEY);
    setDismissed(d === '1');
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  };

  // Hide if wallet connected and dismissed
  if (isConnected && dismissed) return null;
  // Hide if dismissed regardless
  if (dismissed) return null;

  return (
    <div style={S.wrap}>
      <div style={S.inner}>
        <div style={S.left}>
          <div style={S.badge}>New here?</div>
          <div style={S.title}>Start earning yield in 3 steps</div>
          <div style={S.sub}>
            Vyo is an AI-powered DeFi yield optimizer. Your money works harder while you sleep.
          </div>
        </div>

        <div style={S.steps}>
          {STEPS.map((step, i) => (
            <div key={i} style={S.step}>
              <div style={S.stepNum}>{i + 1}</div>
              <div style={S.stepIcon}>{step.icon}</div>
              <div style={S.stepTitle}>{step.title}</div>
              <div style={S.stepDesc}>{step.desc}</div>
              {step.cta && (
                <a href={step.cta.href} style={S.stepCta}>{step.cta.label} →</a>
              )}
            </div>
          ))}
        </div>

        <button onClick={dismiss} style={S.dismissBtn} aria-label="Dismiss">✕</button>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: {
    background: 'linear-gradient(135deg, rgba(200,241,53,0.06) 0%, rgba(200,241,53,0.02) 100%)',
    border: '1px solid rgba(200,241,53,0.2)',
    borderRadius: 16,
    margin: '0 0 20px',
    overflow: 'hidden',
    position: 'relative',
  },
  inner: {
    display: 'flex', alignItems: 'flex-start', gap: 32,
    padding: '20px 24px',
  },
  left: { flexShrink: 0, maxWidth: 200 },
  badge: {
    display: 'inline-block',
    background: 'rgba(200,241,53,0.15)', color: '#c8f135',
    fontSize: '0.6875rem', fontWeight: 700,
    padding: '2px 10px', borderRadius: 999,
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em',
  },
  title: { fontWeight: 800, fontSize: '1rem', lineHeight: 1.3, marginBottom: 6 },
  sub: { fontSize: '0.75rem', color: '#555', lineHeight: 1.5 },
  steps: {
    display: 'flex', gap: 16, flex: 1,
  },
  step: {
    flex: 1, display: 'flex', flexDirection: 'column', gap: 4,
    padding: '12px 14px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 12,
  },
  stepNum: {
    width: 20, height: 20, borderRadius: '50%',
    background: 'rgba(200,241,53,0.15)', color: '#c8f135',
    fontSize: '0.6875rem', fontWeight: 800,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  stepIcon: { fontSize: '1.25rem', marginBottom: 2 },
  stepTitle: { fontWeight: 700, fontSize: '0.875rem' },
  stepDesc: { fontSize: '0.75rem', color: '#555', lineHeight: 1.5, flex: 1 },
  stepCta: {
    fontSize: '0.75rem', fontWeight: 700, color: '#c8f135',
    textDecoration: 'none', marginTop: 6,
  },
  dismissBtn: {
    position: 'absolute', top: 12, right: 12,
    background: 'none', border: 'none', color: '#444',
    cursor: 'pointer', fontSize: '0.875rem', padding: 4,
    lineHeight: 1,
  },
};

export default function OnboardingBanner() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={qc}>
        <Banner />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
