import { useState } from 'react';
import type { MerkleProof } from '../utils/merkle';

interface Props {
  onEligible: (address: number, secret: number, proof: MerkleProof) => void;
}

export default function EligibilityCheck({ onEligible }: Props) {
  const [address, setAddress] = useState<number>(1);
  const [secret, setSecret] = useState('42');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ eligible: boolean; msg: string } | null>(null);

  const handleCheck = async () => {
    setChecking(true);
    setResult(null);
    try {
      const { generateMerkleProof } = await import('../utils/merkle');
      const secretNum = parseInt(secret, 10);
      if (isNaN(secretNum)) {
        setResult({ eligible: false, msg: 'Secret must be a number' });
        return;
      }
      const proof = await generateMerkleProof(address, secretNum);
      if (proof) {
        setResult({ eligible: true, msg: 'You are on the allowlist!' });
        setTimeout(() => onEligible(address, secretNum, proof), 800);
      } else {
        setResult({ eligible: false, msg: 'Address/secret combination not on allowlist.' });
      }
    } catch (e: any) {
      setResult({ eligible: false, msg: e.message || 'Error checking eligibility' });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="card">
      <h2>Check Eligibility</h2>
      <p>Select your address index and enter your secret to prove allowlist membership.</p>

      <div className="input-group">
        <label>Address Index</label>
        <div className="address-select">
          {Array.from({ length: 16 }, (_, i) => (
            <button
              key={i}
              className={address === i ? 'selected' : ''}
              onClick={() => { setAddress(i); setResult(null); }}
            >
              #{i}
            </button>
          ))}
        </div>
      </div>

      <div className="input-group">
        <label>Secret</label>
        <input
          type="text"
          value={secret}
          onChange={e => { setSecret(e.target.value); setResult(null); }}
          placeholder="Enter your secret (e.g. 42)"
        />
      </div>

      {result && (
        <div className={`status-box ${result.eligible ? 'success' : 'error'}`}>
          {result.msg}
        </div>
      )}

      <button className="btn btn-primary" onClick={handleCheck} disabled={checking}>
        {checking ? <><span className="spinner" /> Checking…</> : 'Check Eligibility'}
      </button>
    </div>
  );
}
