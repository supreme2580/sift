import { useState, useEffect, useRef } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useStellar } from './lib/stellar-context';
import { api, type Allowlist } from './utils/api';
import AdminPanel from './components/AdminPanel';
import EligibilityCheck from './components/EligibilityCheck';
import ProofGen from './components/ProofGen';
import ClaimSubmit from './components/ClaimSubmit';
import UserDropdown from './components/UserDropdown';

type View = 'home' | 'eligibility' | 'proof' | 'claim' | 'done' | 'admin';

export default function App() {
  const { login, ready } = usePrivy();
  const { isConnected, address } = useStellar();
  const [view, setView] = useState<View>('home');
  const [allowlists, setAllowlists] = useState<Allowlist[]>([]);
  const [selectedList, setSelectedList] = useState<Allowlist | null>(null);
  const [addressIndex, setAddressIndex] = useState(0);
  const [secret, setSecret] = useState('');
  const [proofData, setProofData] = useState<{ proof: Uint8Array; publicInputs: Uint8Array } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const fetch = () => {
      api.allowlists.list()
        .then(setAllowlists)
        .catch(() => {})
        .finally(() => setLoading(false));
    };
    fetch();
    pollRef.current = setInterval(fetch, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const selectedAllowlist = selectedList || allowlists.find(a => a.status === 'finalized');

  const handleSelectList = (list: Allowlist) => {
    setSelectedList(list);
    setView('eligibility');
  };

  const handleEligible = (idx: number, sec: string) => {
    setAddressIndex(idx);
    setSecret(sec);
    setView('proof');
  };

  const handleProofGenerated = (proof: Uint8Array, publicInputs: Uint8Array) => {
    setProofData({ proof, publicInputs });
    setView('claim');
  };

  const handleSkipToClaim = (proof: Uint8Array, publicInputs: Uint8Array) => {
    setProofData({ proof, publicInputs });
    setView('claim');
  };

  const handleClaimDone = () => {
    setView('done');
  };

  const reset = () => {
    setView('home');
    setSelectedList(null);
    setProofData(null);
    setAddressIndex(0);
    setSecret('');
    setError('');
  };

  if (!ready) {
    return (
      <div className="app">
        <div className="loading-screen"><div className="spinner" /></div>
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
              Prove you're on an allowlist without revealing your identity.
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
            <p className="hero-note">Sign in with Google, Discord, Email, or more</p>
          </div>
          <div className="hero-features">
            <div className="hero-feature">
              <div className="feature-icon">ZK</div>
              <div><strong>Zero-Knowledge</strong><span>Your data stays private</span></div>
            </div>
            <div className="hero-feature">
              <div className="feature-icon">ST</div>
              <div><strong>Stellar Network</strong><span>Verified on Soroban</span></div>
            </div>
            <div className="hero-feature">
              <div className="feature-icon">NK</div>
              <div><strong>UltraHonk</strong><span>Barretenberg proofs</span></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (view === 'admin') {
    return (
      <div className="app">
        <nav className="nav">
          <div className="nav-brand">
            <img src="/logo.png" alt="zkGate" width={32} height={32} />
            <span>zkGate Admin</span>
          </div>
          <div className="nav-user">
            <button className="btn btn-ghost btn-small" onClick={() => { reset(); setView('home'); }}>Back</button>
            <UserDropdown />
          </div>
        </nav>
        <main className="main">
          <AdminPanel />
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
        <div className="nav-user" style={{ gap: 12 }}>
          <button className="btn btn-ghost btn-small" onClick={() => setView('admin')}>
            Admin
          </button>
          <UserDropdown />
        </div>
      </nav>

      <main className="main">
        {view === 'home' && (
          <div className="card">
            <h2>Select Allowlist</h2>
            <p>Choose an allowlist to check your eligibility.</p>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 24 }}>
                <span className="spinner" />
              </div>
            ) : error ? (
              <div className="alert alert-error">{error}</div>
            ) : allowlists.length === 0 ? (
              <div className="status-box info">
                No allowlists yet. An operator needs to create and finalize one.
              </div>
            ) : (
              <div className="allowlist-list">
                {allowlists.map(list => (
                  <button
                    key={list.id}
                    className="allowlist-item"
                    onClick={() => handleSelectList(list)}
                    disabled={list.status !== 'finalized'}
                  >
                    <div className="allowlist-item-main">
                      <strong>{list.name}</strong>
                      <span className="allowlist-desc">{list.description}</span>
                    </div>
                    <div className="allowlist-item-meta">
                      <span className={`badge ${list.status}`}>{list.status}</span>
                      <span className="count">{list.entry_count} entries</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'eligibility' && selectedAllowlist && (
          <EligibilityCheck
            allowlist={selectedAllowlist}
            onEligible={handleEligible}
            onBack={() => setView('home')}
          />
        )}

        {view === 'proof' && (
          <ProofGen
            onProofGenerated={handleProofGenerated}
            onSkipToClaim={handleSkipToClaim}
            onBack={() => setView('eligibility')}
          />
        )}

        {view === 'claim' && proofData && (
          <ClaimSubmit
            proof={proofData.proof}
            publicInputs={proofData.publicInputs}
            onDone={handleClaimDone}
          />
        )}

        {view === 'done' && (
          <div className="card card-success">
            <div className="success-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2>Claim Complete</h2>
            <p>Your proof has been verified and your claim submitted. Your identity remains private.</p>
            <button className="btn btn-primary" onClick={reset}>Start Over</button>
          </div>
        )}
      </main>

      <footer className="footer">
        <a href="https://github.com/supreme2580/sift" target="_blank" rel="noopener noreferrer">GitHub</a>
        <span className="footer-sep" />
        <span>Built for Stellar Hacks: Real-World ZK</span>
      </footer>
    </div>
  );
}
