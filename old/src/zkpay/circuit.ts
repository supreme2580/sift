import { UltraHonkBackend } from '@aztec/bb.js';
import { Noir } from '@noir-lang/noir_js';
import { toFieldHex } from './crypto.js';

export interface ProofResult {
  proof: Uint8Array;
  publicInputs: Uint8Array;
}

let backend: UltraHonkBackend | null = null;

async function getBackend(bytecode: string): Promise<UltraHonkBackend> {
  if (backend) return backend;
  backend = new UltraHonkBackend(bytecode, { threads: 1 }, { recursive: false });
  await (backend as any).instantiate?.();
  return backend;
}

export async function generateProof(
  circuitJson: any,
  commitment: Uint8Array,
  nullifier: Uint8Array,
  secret: Uint8Array,
  onProgress?: (msg: string) => void,
): Promise<ProofResult> {
  onProgress?.('Executing circuit…');
  const noir = new Noir(circuitJson);
  const { witness } = await noir.execute({
    commitment: toFieldHex(commitment),
    nullifier: toFieldHex(nullifier),
    secret: toFieldHex(secret),
  });

  onProgress?.('Loading proving backend…');
  const bk = await getBackend(circuitJson.bytecode);

  onProgress?.('Generating UltraHonk proof…');
  const result = await bk.generateProof(witness, { keccak: true });
  onProgress?.('Proof generated');

  const pubBytes = new Uint8Array(64);
  for (let i = 0; i < result.publicInputs.length && i < 2; i++) {
    const val = (result.publicInputs as any)[i];
    const hex = (typeof val === 'string' ? val : val.toString()).replace('0x', '').padStart(64, '0');
    for (let j = 0; j < 32; j++) {
      pubBytes[i * 32 + j] = parseInt(hex.substring(j * 2, j * 2 + 2), 16);
    }
  }

  return { proof: result.proof, publicInputs: pubBytes };
}
