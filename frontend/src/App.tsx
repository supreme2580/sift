import { useState } from 'react';
import ConnectWallet from './components/ConnectWallet';
import EligibilityCheck from './components/EligibilityCheck';
import ProofGen from './components/ProofGen';
import ClaimSubmit from './components/ClaimSubmit';
import type { MerkleProof } from './utils/merkle';

type Step = 'connect' | 'eligibility' | 'proof' | 'claim' | 'done';

const STEP_LABELS = ['Connect', 'Eligibility', 'Proof', 'Claim'];

export default function App() {
  const [step, setStep] = useState<Step>('connect');
  const [publicKey, setPublicKey] = useState('');
  const [proofData, setProofData] = useState<{ proof: Uint8Array; publicInputs: Uint8Array } | null>(null);

  const stepIndex = ['connect', 'eligibility', 'proof', 'claim'].indexOf(step);

  const handleConnect = (pk: string) => {
    setPublicKey(pk);
    setStep('eligibility');
  };

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

  return (
    <div className="app">
      <div className="header">
        <img src="/logo.png" alt="zkGate" width={80} height={80} className="logo" />
        <h1>zkGate</h1>
        <p>Zero-Knowledge Private Allowlist for Stellar</p>
      </div>

      <div className="steps">
        {STEP_LABELS.map((label, i) => (
          <div key={label} style={{ display: 'contents' }}>
            {i > 0 && <div className={`step-line ${i <= stepIndex ? 'active' : ''}`} />}
            <div
              className={`step-dot ${i === stepIndex ? 'active' : i < stepIndex ? 'done' : ''}`}
              title={label}
            >
              {i < stepIndex ? '✓' : i + 1}
            </div>
          </div>
        ))}
      </div>

      {step === 'connect' && <ConnectWallet onConnect={handleConnect} />}

      {step === 'eligibility' && <EligibilityCheck onEligible={handleEligible} />}

      {step === 'proof' && (
        <ProofGen
          onProofGenerated={handleProofGenerated}
          onSkipToClaim={handleSkipToClaim}
        />
      )}

      {step === 'claim' && proofData && (
        <ClaimSubmit
          publicKey={publicKey}
          proof={proofData.proof}
          publicInputs={proofData.publicInputs}
        />
      )}

      <div className="footer">
        <a href="https://github.com/supreme2580/sift" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
        {' · '}Built for Stellar Hacks: Real-World ZK
      </div>
    </div>
  );
}
