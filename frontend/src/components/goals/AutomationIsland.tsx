// ============================================================
// AutomationIsland — renders automation settings for a goal
// ============================================================

import { useState, useEffect } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '../../lib/wallet.js';
import { AutomationSettings } from './AutomationSettings.js';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 30_000 } },
});

interface AutomationConfig {
  autoCompound: boolean;
  autoRebalance: boolean;
  compoundIntervalDays: number;
  rebalanceThresholdBps: number;
  minCompoundAmount: number;
}

interface GoalInfo {
  id: string;
  name: string;
}

function AutomationController() {
  const [goal, setGoal] = useState<GoalInfo | null>(null);
  const [config, setConfig] = useState<AutomationConfig | undefined>(undefined);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { goal: GoalInfo; config?: AutomationConfig } | null;
      if (detail) {
        setGoal(detail.goal);
        setConfig(detail.config);
        
        const mountEl = document.getElementById(`automation-mount-${detail.goal.id}`);
        const rootEl = document.getElementById('automation-island-root');
        if (mountEl && rootEl) {
          mountEl.appendChild(rootEl);
          rootEl.style.display = 'block';
        }
      } else {
        const rootEl = document.getElementById('automation-island-root');
        if (rootEl) rootEl.style.display = 'none';
      }
    };

    window.addEventListener('goal-automation', handler);
    return () => window.removeEventListener('goal-automation', handler);
  }, []);

  if (!goal) return null;

  return (
    <AutomationSettings
      goalId={goal.id}
      goalName={goal.name}
      currentConfig={config}
    />
  );
}

export default function AutomationIsland() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AutomationController />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
