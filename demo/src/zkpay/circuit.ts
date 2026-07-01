import { Noir } from '@noir-lang/noir_js';
import { toFieldHex } from './crypto';

export interface ProofResult {
  proof: Uint8Array;
  publicInputs: Uint8Array;
}

export async function generateProof(
  circuitJson: any,
  commitment: Uint8Array,
  nullifier: Uint8Array,
  secret: Uint8Array,
  nonce: Uint8Array,
  onProgress?: (msg: string) => void,
): Promise<ProofResult> {
  onProgress?.('Executing circuit…');
  const noir = new Noir(circuitJson);
  const { witness } = await noir.execute({
    commitment: toFieldHex(commitment),
    nullifier: toFieldHex(nullifier),
    secret: toFieldHex(secret),
    nonce: toFieldHex(nonce),
  });

  onProgress?.('Generating UltraHonk proof (server-side)…');

  const witnessB64 = btoa(String.fromCharCode(...new Uint8Array(witness)));

  const resp = await fetch('/api/prove', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ witness: witnessB64 }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText }));
    throw new Error(err.error || 'Proof generation failed');
  }

  const { proof: proofB64, publicInputs: pubB64 } = await resp.json();
  const proof = Uint8Array.from(atob(proofB64), c => c.charCodeAt(0));
  const publicInputs = Uint8Array.from(atob(pubB64), c => c.charCodeAt(0));

  onProgress?.('Proof generated');
  return { proof, publicInputs };
}
