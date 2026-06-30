import { useState } from 'react';

interface Props {
  onConnect: (pubKey: string) => void;
}

export default function ConnectWallet({ onConnect }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async () => {
    setLoading(true);
    setError('');
    try {
      const { connectWallet } = await import('../utils/contract');
      const pk = await connectWallet();
      onConnect(pk);
    } catch (e: any) {
      setError(e.message || 'Failed to connect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Connect Wallet</h2>
      <p>Connect your Freighter wallet to interact with zkGate on Stellar.</p>
      {error && <div className="status-box error">{error}</div>}
      <button className="btn btn-primary" onClick={handleConnect} disabled={loading}>
        {loading ? <><span className="spinner" /> Connecting…</> : 'Connect Freighter'}
      </button>
    </div>
  );
}
