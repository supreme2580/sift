import { useState, useRef, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { UserPill } from '@privy-io/react-auth/ui';
import { useStellarWallet } from '../hooks/useStellarWallet';
import { LogOut, Copy, Check, Eye, EyeOff, RefreshCw } from 'lucide-react';

export default function UserDropdown() {
  const { logout } = usePrivy();
  const { publicKey, secretKey, balance, deriving, refetchBalance } =
    useStellarWallet();
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) setShowSecret(false);
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleCopyAddress = async () => {
    if (publicKey) {
      await navigator.clipboard.writeText(publicKey);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const handleCopySecret = async () => {
    if (secretKey) {
      await navigator.clipboard.writeText(secretKey);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  return (
    <div className="user-dropdown" ref={ref}>
      <div className="user-pill-wrapper">
        <div className="user-pill-border">
          <UserPill />
        </div>
        <div className="user-pill-overlay" onClick={() => setOpen(!open)} />
      </div>

      {open && (
        <div className="user-dropdown-menu">
          <div className="user-dropdown-header">
            <p className="user-dropdown-label">Stellar Wallet</p>
            <p className="user-dropdown-address">
              {deriving ? 'Deriving...' : publicKey || 'Not available'}
            </p>
            {publicKey && (
              <div className="user-dropdown-balance">
                <span className="user-dropdown-balance-amount">
                  {parseFloat(balance).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  XLM
                </span>
                <button
                  onClick={async () => {
                    setRefreshing(true);
                    await refetchBalance();
                    setRefreshing(false);
                  }}
                  disabled={refreshing}
                  className="user-dropdown-refresh"
                  title="Refresh balance"
                >
                  <RefreshCw
                    className={`size-3.5 transition-transform duration-300 ${refreshing ? 'animate-spin' : ''}`}
                  />
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleCopyAddress}
            className="user-dropdown-item"
          >
            {copiedAddress ? (
              <Check className="size-3.5 text-green-400" />
            ) : (
              <Copy className="size-3.5" />
            )}
            {copiedAddress ? 'Copied!' : 'Copy Stellar Address'}
          </button>

          {secretKey && (
            <>
              <button
                onClick={() => setShowSecret(!showSecret)}
                className="user-dropdown-item"
              >
                {showSecret ? (
                  <EyeOff className="size-3.5" />
                ) : (
                  <Eye className="size-3.5" />
                )}
                {showSecret ? 'Hide Private Key' : 'Show Private Key'}
              </button>

              {showSecret && (
                <div className="user-dropdown-secret">
                  <p className="user-dropdown-secret-warn">
                    Never share this key
                  </p>
                  <p className="user-dropdown-secret-value">{secretKey}</p>
                  <button
                    onClick={handleCopySecret}
                    className="user-dropdown-secret-copy"
                  >
                    {copiedSecret ? (
                      <Check className="size-3 text-green-400" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                    {copiedSecret ? 'Copied!' : 'Copy to clipboard'}
                  </button>
                </div>
              )}
            </>
          )}

          <div className="user-dropdown-divider" />

          <button
            onClick={() => logout()}
            className="user-dropdown-item user-dropdown-item-danger"
          >
            <LogOut className="size-3.5" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
