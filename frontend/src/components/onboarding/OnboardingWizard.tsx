// ============================================================
// OnboardingWizard — Multi-step onboarding for new users
// Steps: Welcome → Risk Quiz → Create Goal → Connect Wallet
// ============================================================

import { useState } from 'react';
import { useAccount, useConnect } from 'wagmi';

const API = '/api';

interface OnboardingWizardProps {
  onComplete?: () => void;
}

type Step = 'welcome' | 'risk' | 'goal' | 'wallet';

interface RiskAnswer {
  question: string;
  options: { label: string; value: number; description: string }[];
}

const RISK_QUESTIONS: RiskAnswer[] = [
  {
    question: "What's your primary goal for this savings?",
    options: [
      { label: "Capital Preservation", value: 1, description: "Keep my money safe, even if returns are lower" },
      { label: "Balanced Growth", value: 2, description: "Moderate risk for decent returns" },
      { label: "Maximum Growth", value: 3, description: "Willing to take risks for higher returns" },
    ],
  },
  {
    question: "How long do you plan to keep your savings invested?",
    options: [
      { label: "Less than 6 months", value: 1, description: "Need quick access to funds" },
      { label: "6 months - 2 years", value: 2, description: "Medium-term commitment" },
      { label: "2+ years", value: 3, description: "Long-term growth focus" },
    ],
  },
  {
    question: "How would you react to a 20% drop in value?",
    options: [
      { label: "Sell everything", value: 1, description: "Panic and exit positions" },
      { label: "Hold and wait", value: 2, description: "Stay invested, wait for recovery" },
      { label: "Buy more", value: 3, description: "View it as a buying opportunity" },
    ],
  },
];

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState<Step>('welcome');
  const [riskScore, setRiskScore] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [goalInput, setGoalInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  const handleRiskAnswer = (value: number) => {
    const newScore = riskScore + value;
    
    if (currentQuestion < RISK_QUESTIONS.length - 1) {
      setRiskScore(newScore);
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setRiskScore(newScore);
      setStep('goal');
    }
  };

  const handleCreateGoal = async () => {
    if (!goalInput.trim()) {
      setError('Please describe your goal');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const res = await fetch(`${API}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          input: goalInput,
          riskScore: Math.min(3, Math.ceil(riskScore / 3)),
        }),
      });
      
      const json = await res.json();
      
      if (json.success) {
        if (onComplete) {
          onComplete();
        } else {
          window.location.href = '/dashboard/goals';
        }
      } else {
        setError(json.error || 'Failed to create goal');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleConnectWallet = () => {
    connect({ connector: connectors[0] });
  };

  const getRiskProfile = () => {
    const avg = riskScore / 3;
    if (avg <= 1.33) return { name: 'Conservative', color: '#22c55e' };
    if (avg <= 2) return { name: 'Moderate', color: '#f59e0b' };
    return { name: 'Aggressive', color: '#ef4444' };
  };

  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return (
          <div className="wizard-step">
            <div className="wizard-icon">🚀</div>
            <h2 className="wizard-title">Welcome to Vyo</h2>
            <p className="wizard-desc">
              Your AI-powered DeFi savings assistant. Let's set up your first goal in just a few steps.
            </p>
            
            <div className="wizard-features">
              <div className="feature-item">
                <span className="feature-icon">📊</span>
                <span>AI optimizes your yield automatically</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🔒</span>
                <span>You stay in full control</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">💰</span>
                <span>Earn yield on USD, ETH, BTC & more</span>
              </div>
            </div>

            <button className="wizard-btn primary" onClick={() => setStep('risk')}>
              Get Started
            </button>
          </div>
        );

      case 'risk':
        const question = RISK_QUESTIONS[currentQuestion];
        const progress = ((currentQuestion + 1) / RISK_QUESTIONS.length) * 100;
        
        return (
          <div className="wizard-step">
            <div className="wizard-progress">
              <div className="wizard-progress-bar" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="wizard-step-num">Question {currentQuestion + 1} of {RISK_QUESTIONS.length}</div>
            
            <h2 className="wizard-title">{question.question}</h2>
            
            <div className="risk-options">
              {question.options.map((opt, idx) => (
                <button
                  key={idx}
                  className="risk-option"
                  onClick={() => handleRiskAnswer(opt.value)}
                >
                  <div className="risk-label">{opt.label}</div>
                  <div className="risk-desc">{opt.description}</div>
                </button>
              ))}
            </div>
          </div>
        );

      case 'goal':
        const profile = getRiskProfile();
        
        return (
          <div className="wizard-step">
            <div className="wizard-icon">🎯</div>
            <h2 className="wizard-title">Create Your First Goal</h2>
            <p className="wizard-desc">
              Your risk profile: <strong style={{ color: profile.color }}>{profile.name}</strong>
            </p>

            <div className="goal-input-wrapper">
              <textarea
                className="goal-input"
                placeholder='e.g., "Save $10,000 for a vacation by December 2026"'
                value={goalInput}
                onChange={(e) => {
                  setGoalInput(e.target.value);
                  setError('');
                }}
                rows={3}
              />
            </div>

            {error && <div className="wizard-error">{error}</div>}

            <div className="wizard-hint">
              Tip: Include the amount, purpose, and deadline for best results
            </div>

            <button 
              className="wizard-btn primary" 
              onClick={handleCreateGoal}
              disabled={isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Goal'}
            </button>
          </div>
        );

      case 'wallet':
        return (
          <div className="wizard-step">
            <div className="wizard-icon">🔗</div>
            <h2 className="wizard-title">Connect Your Wallet</h2>
            <p className="wizard-desc">
              Connect your wallet to start depositing and earning yield.
            </p>

            <button 
              className="wizard-btn primary" 
              onClick={handleConnectWallet}
            >
              Connect Wallet
            </button>

            <button 
              className="wizard-btn secondary" 
              onClick={() => {
                if (onComplete) onComplete();
                else window.location.href = '/dashboard';
              }}
            >
              Skip for now
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="wizard-overlay">
      <div className="wizard-container">
        {renderStep()}
      </div>

      <style>{`
        .wizard-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .wizard-container {
          background: #111;
          border: 1px solid #333;
          border-radius: 20px;
          padding: 40px;
          max-width: 480px;
          width: 100%;
        }
        .wizard-step {
          text-align: center;
        }
        .wizard-icon {
          font-size: 3rem;
          margin-bottom: 16px;
        }
        .wizard-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 12px;
        }
        .wizard-desc {
          color: #888;
          margin-bottom: 24px;
          font-size: 0.9375rem;
        }
        .wizard-features {
          text-align: left;
          margin-bottom: 32px;
        }
        .feature-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid #222;
          font-size: 0.875rem;
        }
        .feature-icon {
          font-size: 1.25rem;
        }
        .wizard-btn {
          width: 100%;
          padding: 14px 24px;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }
        .wizard-btn.primary {
          background: #c8f135;
          color: #000;
          border: none;
        }
        .wizard-btn.primary:hover {
          background: #d4f53c;
          box-shadow: 0 0 20px rgba(200, 241, 53, 0.3);
        }
        .wizard-btn.primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .wizard-btn.secondary {
          background: transparent;
          color: #666;
          border: 1px solid #333;
          margin-top: 12px;
        }
        .wizard-btn.secondary:hover {
          border-color: #555;
          color: #888;
        }
        .wizard-progress {
          height: 4px;
          background: #222;
          border-radius: 2px;
          margin-bottom: 16px;
          overflow: hidden;
        }
        .wizard-progress-bar {
          height: 100%;
          background: #c8f135;
          transition: width 0.3s ease;
        }
        .wizard-step-num {
          font-size: 0.75rem;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 8px;
        }
        .risk-options {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
        }
        .risk-option {
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 12px;
          padding: 16px;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }
        .risk-option:hover {
          border-color: #c8f135;
          background: #222;
        }
        .risk-label {
          font-weight: 600;
          font-size: 0.9375rem;
          margin-bottom: 4px;
        }
        .risk-desc {
          font-size: 0.8125rem;
          color: #666;
        }
        .goal-input-wrapper {
          margin-bottom: 16px;
        }
        .goal-input {
          width: 100%;
          padding: 14px;
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 12px;
          color: #fff;
          font-size: 0.9375rem;
          font-family: inherit;
          resize: none;
        }
        .goal-input:focus {
          outline: none;
          border-color: #c8f135;
        }
        .goal-input::placeholder {
          color: #555;
        }
        .wizard-error {
          color: #ef4444;
          font-size: 0.8125rem;
          margin-bottom: 12px;
        }
        .wizard-hint {
          font-size: 0.75rem;
          color: #555;
          margin-bottom: 24px;
        }
      `}</style>
    </div>
  );
}
