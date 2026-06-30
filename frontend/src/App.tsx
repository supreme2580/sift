import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useStellar } from './lib/stellar-context';
import EligibilityCheck from './components/EligibilityCheck';
import ProofGen from './components/ProofGen';
import ClaimSubmit from './components/ClaimSubmit';
import type { MerkleProof } from './utils/merkle';

type Step = 'eligibility' | 'proof' | 'claim' | 'done';

const STEP_LABELS = ['Eligibility', 'Proof', 'Claim'];

export default function App() {
  const { login, ready } = usePrivy();
  const { isConnected, address } = useStellar();
  const [step, setStep] = useState<Step>('eligibility');
  const [proofData, setProofData] = useState<{ proof: Uint8Array; publicInputs: Uint8Array } | null>(null);

  const stepIndex = ['eligibility', 'proof', 'claim'].indexOf(step);

  const handleEligible = (_address: number, _secret: number, _proof: MerkleProof) => {
    setStep('proof');
  };

  const handleProofGenerated = (proof: Uint8Array, publicInputs: Uint8Array) => {
    setProofData({ proof, publicInputs });
    setStep('claim');
  };

  const handleSkipToClaim = (proof: Uint8Array, publicInputs: Uint8Array) => {
    setProofData({ proof, publicInputs });
    setStep('claim');
  };

  const handleClaimDone = () => {
    setStep('done');
  };

  if (!ready) {
    return (
      <div className="app">
        <div className="loading-screen">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="app">
        <nav className="nav">
          <div className="nav-brand">
            <img src="/logo.png" alt="zkGate" width={32} height={32} />
            <span>zkGate</span>
          </div>
        </nav>
        <main className="hero">
          <div className="hero-content">
            <div className="hero-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h1>Private Allowlist Verification</h1>
            <p className="hero-subtitle">
              Prove you're on the allowlist without revealing your identity.
              Powered by zero-knowledge proofs on Stellar.
            </p>
            <button className="btn btn-primary btn-hero" onClick={() => login()}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              Connect Wallet
            </button>
            <p className="hero-note">
              Sign in with Google, Discord, Email, or more
            </p>
          </div>
          <div className="hero-features">
            <div className="hero-feature">
              <div className="feature-icon">ZK</div>
              <div>
                <strong>Zero-Knowledge</strong>
                <span>Your data stays private</span>
              </div>
            </div>
            <div className="hero-feature">
              <div className="feature-icon">ST</div>
              <div>
                <strong>Stellar Network</strong>
                <span>Verified on Soroban</span>
              </div>
            </div>
            <div className="hero-feature">
              <div className="feature-icon">NK</div>
              <div>
                <strong>UltraHonk</strong>
                <span>Barretenberg proofs</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <nav className="nav">
        <div className="nav-brand">
          <img src="/logo.png" alt="zkGate" width={32} height={32} />
          <span>zkGate</span>
        </div>
        <div className="nav-user">
          <span className="nav-address">
            {address?.slice(0, 4)}...{address?.slice(-4)}
          </span>
          <div className="nav-dot" />
        </div>
      </nav>

      <main className="main">
        <div className="steps">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="step-item">
              {i > 0 && <div className={`step-line ${i <= stepIndex ? 'active' : ''}`} />}
              <div
                className={`step-dot ${i === stepIndex ? 'active' : i < stepIndex ? 'done' : ''}`}
              >
                {i < stepIndex ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  label[0]
                )}
              </div>
              <span className={`step-label ${i <= stepIndex ? 'active' : ''}`}>{label}</span>
            </div>
          ))}
        </div>

        <div className="step-content">
          {step === 'eligibility' && <EligibilityCheck onEligible={handleEligible} />}

          {step === 'proof' && (
            <ProofGen
              onProofGenerated={handleProofGenerated}
              onSkipToClaim={handleSkipToClaim}
            />
          )}

          {step === 'claim' && proofData && (
            <ClaimSubmit
              proof={proofData.proof}
              publicInputs={proofData.publicInputs}
              onDone={handleClaimDone}
            />
          )}

          {step === 'done' && (
            <div className="card card-success">
              <div className="success-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h2>Claim Complete</h2>
              <p>Your proof has been verified and your claim has been submitted successfully. Your identity remains private.</p>
              <button className="btn btn-primary" onClick={() => setStep('eligibility')}>
                Start Over
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className="footer">
        <a href="https://github.com/supreme2580/sift" target="_blank" rel="noopener noreferrer">GitHub</a>
        <span className="footer-sep" />
        <span>Built for Stellar Hacks: Real-World ZK</span>
      </footer>
    </div>
  );
}
