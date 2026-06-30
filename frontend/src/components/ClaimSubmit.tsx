import { useState } from 'react';
import { useStellar } from '../lib/stellar-context';

interface Props {
  proof: Uint8Array;
  publicInputs: Uint8Array;
  onDone: () => void;
}

export default function ClaimSubmit({ proof, publicInputs, onDone }: Props) {
  const { signer, address } = useStellar();
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');

  const handleClaim = async () => {
    if (!signer) return;
    setSubmitting(true);
    setError('');
    try {
      const { submitClaim } = await import('../utils/contract');
      const hash = await submitClaim(signer, proof, publicInputs);
      setTxHash(hash);
    } catch (e: any) {
      setError(e.message || 'Transaction failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card">
      <h2>{txHash ? 'Claim Submitted' : 'Submit Claim'}</h2>
      <p>
        Submit your zero-knowledge proof to the Soroban contract. Your identity remains private.
      </p>

      {address && (
        <div className="input-group">
          <label>Wallet</label>
          <div className="address-display">
            <span className="address-text">{address}</span>
          </div>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {txHash ? (
        <div className="alert alert-success">
          Transaction submitted: {txHash.slice(0, 16)}...{txHash.slice(-8)}
          <button className="btn btn-ghost btn-small" onClick={onDone} style={{ marginTop: 12 }}>
            Continue
          </button>
        </div>
      ) : (
        <button className="btn btn-primary" onClick={handleClaim} disabled={submitting || !signer}>
          {submitting ? (
            <><span className="spinner" /> Submitting…</>
          ) : (
            'Submit Proof & Claim'
          )}
        </button>
      )}
    </div>
  );
}
