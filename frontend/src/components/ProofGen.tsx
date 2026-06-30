import { useState } from 'react';

interface Props {
  onProofGenerated: (proof: Uint8Array, publicInputs: Uint8Array) => void;
  onSkipToClaim: (proof: Uint8Array, publicInputs: Uint8Array) => void;
}

export default function ProofGen({ onProofGenerated, onSkipToClaim }: Props) {
  const [generating, setGenerating] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [mode, setMode] = useState<'generate' | 'pregen' | null>(null);

  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

  const handleGenerate = async () => {
    setGenerating(true);
    setMode('generate');
    setDone(false);
    setLogs([]);
    try {
      addLog('Loading UltraHonk proving backend…');
      const { getBackend, loadWitness } = await import('../utils/backend');
      addLog('Loading circuit ACIR bytecode…');
      await getBackend();
      addLog('Loading pre-computed witness…');
      const witness = await loadWitness();
      addLog('Generating UltraHonk proof (keccak oracle)…');
      const { generateProof } = await import('../utils/backend');
      const result = await generateProof(witness);
      addLog('Proof generated successfully!');
      setDone(true);
      onProofGenerated(result.proof, result.publicInputs);
    } catch (e: any) {
      addLog(`Error: ${e.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handlePregen = async () => {
    setMode('pregen');
    setGenerating(true);
    setLogs([]);
    try {
      addLog('Loading pre-generated proof…');
      const { loadPreGeneratedProof } = await import('../utils/backend');
      const result = await loadPreGeneratedProof();
      addLog(`Proof loaded: ${result.proof.length} bytes`);
      addLog(`Public inputs: ${result.publicInputs.length} bytes`);
      addLog('Ready to submit!');
      setDone(true);
      onSkipToClaim(result.proof, result.publicInputs);
    } catch (e: any) {
      addLog(`Error: ${e.message}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="card">
      <h2>{done ? 'Proof Ready' : 'Generate Proof'}</h2>
      <p>
        Generate a zero-knowledge proof that you are on the allowlist
        without revealing your address.
      </p>

      {!done && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={generating}
            style={{ flex: 1 }}
          >
            {generating && mode === 'generate' ? (
              <><span className="spinner" /> Generating…</>
            ) : (
              'Generate ZK Proof'
            )}
          </button>
          <button
            className="btn btn-outline"
            onClick={handlePregen}
            disabled={generating}
            style={{ flex: 1 }}
          >
            {generating && mode === 'pregen' ? (
              <><span className="spinner" /> Loading…</>
            ) : (
              'Use Pre-generated'
            )}
          </button>
        </div>
      )}

      {done && (
        <button className="btn btn-success" onClick={() => {}}>
          Proof Ready — Continue
        </button>
      )}

      {logs.length > 0 && (
        <div className="log-area">
          {logs.map((l, i) => (
            <div key={i} className={`log-line ${l.startsWith('Error') ? 'error' : l.includes('successfully') || l.includes('Ready') || l.includes('loaded') ? 'success' : ''}`}>
              {l}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
