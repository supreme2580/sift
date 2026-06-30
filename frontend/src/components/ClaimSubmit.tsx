import { useState } from 'react';

interface Props {
  publicKey: string;
  proof: Uint8Array;
  publicInputs: Uint8Array;
}

export default function ClaimSubmit({ publicKey, proof, publicInputs }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');

  const handleClaim = async () => {
    setSubmitting(true);
    setError('');
    try {
      const { submitClaim } = await import('../utils/contract');
      const hash = await submitClaim(publicKey, proof, publicInputs);
      setTxHash(hash);
    } catch (e: any) {
      setError(e.message || 'Transaction failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card">
      <h2>{txHash ? 'Claim Submitted! 🎉' : 'Submit Claim'}</h2>
      <p>
        Submit your ZK proof to the Soroban contract to claim your reward.
        Your address remains private.
      </p>

      <div className="status-box info">
        Wallet: <span className="wallet-address">{publicKey.slice(0, 8)}…{publicKey.slice(-4)}</span>
      </div>

      {error && <div className="status-box error">{error}</div>}

      {txHash ? (
        <div className="status-box success">
          Transaction submitted! Hash: <span className="wallet-address">{txHash}</span>
        </div>
      ) : (
        <button className="btn btn-success" onClick={handleClaim} disabled={submitting}>
          {submitting ? <><span className="spinner" /> Submitting…</> : 'Claim Reward'}
        </button>
      )}
    </div>
  );
}
