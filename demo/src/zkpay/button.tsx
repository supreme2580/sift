import { usePrivy } from '@privy-io/react-auth';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useZkPay } from './hook';
import { deriveSecretAsync } from './privy';
import { computeCommitment, computeNullifier, bytesToHex } from './crypto';
import { generateBurner } from './burner';
import type { BurnerWallet } from './burner';
import { generateProof } from './circuit';
import { setConnected, setDisconnected, setBalance } from './state';
import { submitDeposit, submitAuth } from './contract';

type ModalView = 'main' | 'deposit' | 'deposit-wait' | 'withdraw' | 'withdraw-proof' | 'success' | 'error';

export function ZkPayButton() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const zkPay = useZkPay();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalView, setModalView] = useState<ModalView>('main');
  const [burner, setBurner] = useState<BurnerWallet | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [statusLog, setStatusLog] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [lastTxUrl, setLastTxUrl] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addLog = useCallback((msg: string) => {
    setStatusLog(p => [...p, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  useEffect(() => {
    if (!authenticated || !user) return;
    (async () => {
      try {
        const secret = await deriveSecretAsync(user.id);
        setConnected(user, secret);
        addLog('Secret derived');
      } catch (err) {
        console.error('[zkPay] Init error:', err);
        addLog(`Init error: ${err instanceof Error ? err.message : String(err)}`);
      }
    })();
  }, [authenticated, user]);

  useEffect(() => {
    if (!modalOpen) {
      setModalView('main');
      setBurner(null);
      setStatusMsg('');
      setStatusLog([]);
      setProgress(0);
      setLastTxUrl(null);
      if (pollingRef.current) clearInterval(pollingRef.current);
    }
  }, [modalOpen]);

  const handleLogin = () => login();
  const handleLogout = () => { logout(); setDisconnected(); setModalOpen(false); };

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) return;
    setModalView('deposit-wait');
    setStatusMsg('Generating burner wallet…');
    addLog('Generating burner wallet…');
    const b = generateBurner();
    setBurner(b);
    addLog(`Burner address: ${b.publicKey}`);
    setStatusMsg(`Send at least ${amount + 1} XLM (1 XLM minimum balance reserve for burner):`);

    addLog('Polling for incoming payment…');
    pollingRef.current = setInterval(async () => {
      try {
        const resp = await fetch(`https://horizon-testnet.stellar.org/accounts/${b.publicKey}/payments?limit=1&order=desc`);
        const data = await resp.json();
        if (data._embedded?.records?.length > 0) {
          const payment = data._embedded.records[0];
          // First send to a new wallet is create_account; subsequent sends are payment
          const recvAmount = parseFloat(payment.type === 'create_account' ? payment.starting_balance : payment.amount);
          if (recvAmount >= amount) {
            clearInterval(pollingRef.current!);
            setProgress(75);
            setStatusMsg('Payment detected! Recording deposit on-chain…');
            addLog(`Received ${recvAmount} XLM`);

              try {
                const stroops = BigInt(Math.floor(amount * 1e7));
                let secret = zkPay.secret;
                if (!secret) {
                  secret = await deriveSecretAsync(user!.id);
                  setConnected(user, secret);
                }
                const nonce = crypto.getRandomValues(new Uint8Array(32));
                addLog('Generating commitment with random nonce…');
                const depositCommitment = await computeCommitment(secret, nonce);
                addLog(`Commitment: ${bytesToHex(depositCommitment).slice(0, 20)}…`);
                const txResult = await submitDeposit(b.secretKey, depositCommitment, stroops);
              addLog(`Deposit tx: ${txResult.url}`);
              setLastTxUrl(txResult.url);
              if (txResult.status === 'ERROR') throw new Error('deposit tx was rejected by network');
              localStorage.setItem('zkpay-deposit-data', JSON.stringify({
                feeSecret: b.secretKey,
                nonce: Array.from(nonce),
              }));
              setBalance(zkPay.balance + stroops);
              setProgress(100);
              setStatusMsg('Deposit complete!');
              addLog('Commitment recorded on-chain');
              } catch (e: any) {
                addLog(`Deposit error: ${e.message}`);
                setStatusMsg(`Deposit failed: ${e.message}`);
                setProgress(0);
                return;
              }
            setTimeout(() => { setModalOpen(false); }, 2000);
          }
        }
      } catch { /* retry */ }
    }, 5000);
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0 || !recipientAddress) return;
    setModalView('withdraw-proof');
    setStatusMsg('Generating zero-knowledge proof…');
    addLog('Loading circuit…');
    setProgress(10);

    try {
      const resp = await fetch('/circuit.json');
      const circuitJson = await resp.json();
      addLog('Circuit loaded');
      setProgress(25);

      const depositDataStr = localStorage.getItem('zkpay-deposit-data');
      if (!depositDataStr) throw new Error('No deposit found — deposit first');
      const depositData = JSON.parse(depositDataStr);
      const feeSecret = depositData.feeSecret;
      const nonce = new Uint8Array(depositData.nonce);

      let secret = zkPay.secret;
      if (!secret) {
        addLog('Deriving secret on-demand…');
        secret = await deriveSecretAsync(user!.id);
        setConnected(user, secret);
      }
      const commitmentBytes = await computeCommitment(secret, nonce);
      const nullifierBytes = await computeNullifier(commitmentBytes, secret, nonce);

      addLog('Generating proof (may take 30s)…');
      setProgress(50);
      setStatusMsg('Proving with UltraHonk…');

      const result = await generateProof(circuitJson, commitmentBytes, nullifierBytes, secret, nonce, (msg) => {
        addLog(msg);
      });

      setProgress(80);
      setStatusMsg('Proof generated! Submitting to contract…');
      addLog(`Proof: ${result.proof.length} bytes`);

      const txResult = await submitAuth(result.proof, result.publicInputs, recipientAddress, feeSecret);
      addLog(`Auth tx: ${txResult.url}`);
      setLastTxUrl(txResult.url);
      addLog(`Withdrew ${amount} XLM → ${recipientAddress}`);
      setBalance(zkPay.balance - BigInt(Math.floor(amount * 1e7)));
      setProgress(100);
      setStatusMsg('Withdrawal complete!');
      setModalView('success');

    } catch (e: any) {
      setStatusMsg(`Error: ${e.message}`);
      addLog(`ERROR: ${e.message}`);
    }
  };

  if (!ready) {
    return <button disabled className="zkpay-btn zkpay-btn-loading">Loading…</button>;
  }

  if (!authenticated || !user) {
    return (
      <button onClick={handleLogin} className="zkpay-btn zkpay-btn-login">
        Login with zkPay
      </button>
    );
  }

  return (
    <>
      <button onClick={() => setModalOpen(true)} className="zkpay-btn zkpay-btn-connected">
        {user.email?.address || user.discord?.username || user.google?.email || 'Connected'}
      </button>

      {modalOpen && (
        <div className="zkpay-overlay" onClick={() => setModalOpen(false)}>
          <div className="zkpay-modal" onClick={e => e.stopPropagation()}>
            <div className="zkpay-modal-inner">
              {modalView === 'main' && (
                <>
                  <div className="zkpay-modal-header">
                    <h2>zkPay</h2>
                    <button onClick={() => setModalOpen(false)} className="zkpay-close">✕</button>
                  </div>
                  <div className="zkpay-balance-display">
                    <span className="zkpay-balance-label">Available Balance</span>
                    <span className="zkpay-balance-value">{Number(zkPay.balance) / 1e7}<span className="zkpay-balance-ticker">XLM</span></span>
                    <span className="zkpay-balance-usd">≈ ${(Number(zkPay.balance) / 1e7 * 0.34).toFixed(2)} USD</span>
                  </div>
                  <div className="zkpay-actions">
                    <button onClick={() => setModalView('deposit')} className="zkpay-action-btn zkpay-action-deposit">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                      Deposit
                    </button>
                    <button onClick={() => setModalView('withdraw')} className="zkpay-action-btn zkpay-action-withdraw">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                      Withdraw
                    </button>
                  </div>
                  <button onClick={handleLogout} className="zkpay-btn-logout">Disconnect</button>
                </>
              )}

              {modalView === 'deposit' && (
                <>
                  <div className="zkpay-modal-header">
                    <h2>Deposit XLM</h2>
                    <button onClick={() => setModalView('main')} className="zkpay-close">✕</button>
                  </div>
                  <div className="zkpay-input-wrap">
                    <label className="zkpay-input-label">Amount</label>
                    <input type="number" placeholder="0.00" value={depositAmount}
                      onChange={e => setDepositAmount(e.target.value)} className="zkpay-input" />
                  </div>
                  <button onClick={handleDeposit} className="zkpay-action-btn zkpay-action-deposit" disabled={!depositAmount}>
                    Generate Deposit Address
                  </button>
                  <div className="zkpay-spacer" />
                  <div className="zkpay-flex-center">
                    <button onClick={() => setModalView('main')} className="zkpay-btn-link">← Back</button>
                  </div>
                </>
              )}

              {modalView === 'deposit-wait' && (
                <>
                  <div className="zkpay-modal-header">
                    <h2>Send XLM</h2>
                    <button onClick={() => setModalOpen(false)} className="zkpay-close">✕</button>
                  </div>
                  {burner && (
                    <div className="zkpay-burner-section">
                      <div className="zkpay-burner-title">Deposit Address</div>
                      <p className="zkpay-burner-desc">
                        Send at least <strong>{parseFloat(depositAmount) + 2} XLM</strong> to the address below (1 XLM covers the burner's minimum balance, 1 XLM covers Soroban fees).
                        The network will confirm automatically.
                      </p>
                      <code className="zkpay-address">{burner.publicKey}</code>
                      <button onClick={() => navigator.clipboard.writeText(burner.publicKey)} className="zkpay-copy-btn">
                        📋 Copy Address
                      </button>
                    </div>
                  )}
                  <div className="zkpay-progress-section">
                    <div className="zkpay-progress-bar"><div className="zkpay-progress-fill" style={{ width: `${progress}%` }} /></div>
                    <p className="zkpay-status-msg">{statusMsg}</p>
                  </div>
                  <div className="zkpay-log">{statusLog.map((l, i) => <div key={i} className="zkpay-log-line">{l}</div>)}</div>
                </>
              )}

              {modalView === 'withdraw' && (
                <>
                  <div className="zkpay-modal-header">
                    <h2>Withdraw XLM</h2>
                    <button onClick={() => setModalView('main')} className="zkpay-close">✕</button>
                  </div>
                  <div className="zkpay-input-wrap">
                    <label className="zkpay-input-label">Amount</label>
                    <input type="number" placeholder="0.00" value={withdrawAmount}
                      onChange={e => setWithdrawAmount(e.target.value)} className="zkpay-input" />
                  </div>
                  <div className="zkpay-input-wrap">
                    <label className="zkpay-input-label">Recipient Address</label>
                    <input type="text" placeholder="G…" value={recipientAddress}
                      onChange={e => setRecipientAddress(e.target.value)} className="zkpay-input" />
                  </div>
                  <button onClick={handleWithdraw} className="zkpay-action-btn zkpay-action-withdraw"
                    style={{ width: '100%' }}
                    disabled={!withdrawAmount || !recipientAddress}>
                    Generate Proof & Withdraw
                  </button>
                  <div className="zkpay-spacer" />
                  <div className="zkpay-flex-center">
                    <button onClick={() => setModalView('main')} className="zkpay-btn-link">← Back</button>
                  </div>
                </>
              )}

              {modalView === 'withdraw-proof' && (
                <>
                  <div className="zkpay-modal-header">
                    <h2>Withdrawing</h2>
                    <button onClick={() => setModalOpen(false)} className="zkpay-close">✕</button>
                  </div>
                  <div className="zkpay-progress-section">
                    <div className="zkpay-progress-bar"><div className="zkpay-progress-fill" style={{ width: `${progress}%` }} /></div>
                    <p className="zkpay-status-msg">{statusMsg}</p>
                  </div>
                  <div className="zkpay-log">{statusLog.map((l, i) => <div key={i} className="zkpay-log-line">{l}</div>)}</div>
                </>
              )}
              {modalView === 'success' && (
                <>
                  <div className="zkpay-modal-header">
                    <h2>Transaction Complete</h2>
                    <button onClick={() => setModalOpen(false)} className="zkpay-close">✕</button>
                  </div>
                  <div className="zkpay-progress-section">
                    <div className="zkpay-progress-bar"><div className="zkpay-progress-fill" style={{ width: `${progress}%` }} /></div>
                    <p className="zkpay-status-msg">{statusMsg}</p>
                  </div>
                  {lastTxUrl && (
                    <div className="zkpay-tx-link-section">
                      <a href={lastTxUrl} target="_blank" rel="noopener noreferrer" className="zkpay-tx-link">
                        View on Stellar Expert ↗
                      </a>
                    </div>
                  )}
                  <div className="zkpay-log">{statusLog.map((l, i) => <div key={i} className="zkpay-log-line">{l}</div>)}</div>
                  <div className="zkpay-flex-center">
                    <button onClick={() => setModalOpen(false)} className="zkpay-action-btn" style={{ marginTop: 12, width: '100%' }}>Close</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
