'use client';
import { useState, useCallback, useEffect } from 'react';
import { computeCommitment, computeNullifier, generateProof, bytesToHex, useZkAuth, ZkAuthButton } from '@supreme2580/zkauth';
import { registerCommitment, shieldedIncrement, getCount, commitmentExists } from '../../lib/counterClient';
import { generateBurner } from '@supreme2580/zkauth';

export default function CounterPage() {
  const { secret, connected, balance } = useZkAuth();
  const [statusLog, setStatusLog] = useState<string[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [registered, setRegistered] = useState(false);
  const [incrementing, setIncrementing] = useState(false);
  const [regCommitment, setRegCommitment] = useState<string | null>(null);
  const [nonceStr, setNonceStr] = useState<string | null>(null);

  const addLog = useCallback((msg: string) => {
    setStatusLog(p => [...p, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  const handleRegister = async () => {
    if (!secret) return;
    try {
      addLog('Generating burner wallet…');
      const burner = generateBurner();
      addLog(`Burner: ${burner.publicKey}`);

      const nonce = crypto.getRandomValues(new Uint8Array(32));
      const commitment = await computeCommitment(secret, nonce);
      const commHex = bytesToHex(commitment);
      setRegCommitment(commHex);
      setNonceStr(JSON.stringify(Array.from(nonce)));
      addLog(`Commitment: ${commHex.slice(0, 20)}…`);

      addLog('Registering commitment on chain…');
      const txUrl = await registerCommitment(burner.secretKey, commitment);
      addLog(`Registered! Tx: ${txUrl}`);

      setRegistered(true);
      const c = await getCount(commitment);
      setCount(c);
      addLog(`Initial count: ${c}`);
    } catch (e: any) {
      addLog(`ERROR: ${e.message}`);
    }
  };

  const handleIncrement = async () => {
    if (!secret || !regCommitment || !nonceStr) return;
    setIncrementing(true);
    try {
      const nonce = new Uint8Array(JSON.parse(nonceStr));
      const commitment = await computeCommitment(secret, nonce);
      const nullifier = await computeNullifier(commitment, secret, nonce);

      addLog('Generating ZK proof (UltraHonk)…');
      const result = await generateProof(commitment, nullifier, secret, nonce, (msg) => addLog(msg));

      addLog('Proof generated! Calling shielded_increment…');
      const burner = generateBurner();
      const { url, newCount } = await shieldedIncrement(burner.secretKey, result.proof, result.publicInputs);
      addLog(`Increment tx: ${url}`);
      setCount(newCount);
      addLog(`New count: ${newCount}`);
    } catch (e: any) {
      addLog(`ERROR: ${e.message}`);
    } finally {
      setIncrementing(false);
    }
  };

  const handleRefresh = async () => {
    if (!regCommitment) return;
    const commBytes = new Uint8Array(regCommitment.match(/.{1,2}/g)!.map(b => parseInt(b, 16)));
    const c = await getCount(commBytes);
    setCount(c);
    addLog(`Refreshed count: ${c}`);
  };

  return (
    <div className="counter-page">
      <h1>Shielded Counter</h1>
      <p className="subtitle">
        Prove identity with ZK, increment a counter — no wallet address revealed.
      </p>

      <ZkAuthButton />

      {connected && (
        <>
          <div className="counter-section">
            <h2>1. Register Identity</h2>
            <p>Generate a commitment and register it on the shielded counter contract.</p>
            <button onClick={handleRegister} className="counter-btn" disabled={registered}>
              {registered ? 'Registered ✓' : 'Register Commitment'}
            </button>
          </div>

          {regCommitment && (
            <div className="counter-section">
              <h2>2. Shielded Increment</h2>
              <p>Prove you own the secret for your commitment without revealing it. The contract verifies the UltraHonk ZK proof and increments your counter.</p>
              <button onClick={handleIncrement} className="counter-btn" disabled={incrementing}>
                {incrementing ? 'Generating proof…' : 'Increment (shielded)'}
              </button>
              <button onClick={handleRefresh} className="counter-btn counter-btn-secondary">
                Refresh Count
              </button>
              {count !== null && (
                <div className="counter-display">
                  Count: <strong>{count}</strong>
                </div>
              )}
            </div>
          )}

          <div className="counter-log">
            {statusLog.map((l, i) => <div key={i} className="log-line">{l}</div>)}
          </div>
        </>
      )}
    </div>
  );
}
