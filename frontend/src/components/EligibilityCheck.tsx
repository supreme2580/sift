import { useState } from 'react';
import { api, type Allowlist } from '../utils/api';

interface Props {
  allowlist: Allowlist;
  onEligible: (addressIndex: number, secret: string) => void;
  onBack: () => void;
}

export default function EligibilityCheck({ allowlist, onEligible, onBack }: Props) {
  const [addressIdx, setAddressIdx] = useState(0);
  const [secret, setSecret] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleCheck = async () => {
    if (!secret) return;
    setChecking(true);
    setResult(null);
    try {
      const proofData = await api.proof.get(allowlist.id, addressIdx, secret);
      setResult({ ok: true, msg: 'You are on the allowlist!' });
      setTimeout(() => onEligible(addressIdx, secret), 600);
    } catch (e: any) {
      setResult({ ok: false, msg: e.message || 'Not eligible' });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="card">
      <h2>Check Eligibility</h2>
      <p>Enter your address index and secret to verify you're on <strong>{allowlist.name}</strong>.</p>

      <div className="input-group">
        <label>Address Index</label>
        <input
          type="number"
          min={0}
          value={addressIdx}
          onChange={e => { setAddressIdx(parseInt(e.target.value) || 0); setResult(null); }}
        />
      </div>

      <div className="input-group">
        <label>Secret</label>
        <input
          type="text"
          value={secret}
          onChange={e => { setSecret(e.target.value); setResult(null); }}
          placeholder="Enter your secret"
        />
      </div>

      {result && (
        <div className={`status-box ${result.ok ? 'success' : 'error'}`}>{result.msg}</div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-ghost" onClick={onBack} style={{ flex: 1 }}>Back</button>
        <button className="btn btn-primary" onClick={handleCheck} disabled={checking || !secret} style={{ flex: 2 }}>
          {checking ? <><span className="spinner" /> Checking…</> : 'Check Eligibility'}
        </button>
      </div>
    </div>
  );
}
