import { UltraHonkBackend } from '@aztec/bb.js';

let backend: UltraHonkBackend | null = null;

export async function loadCircuit(): Promise<string> {
  const resp = await fetch('/circuit/eligibility.json');
  const json = await resp.json();
  return json.bytecode as string;
}

export async function getBackend(): Promise<UltraHonkBackend> {
  if (backend) return backend;
  const bytecode = await loadCircuit();
  backend = new UltraHonkBackend(bytecode, { threads: 1 }, { recursive: false });
  return backend;
}

export async function generateProof(
  witnessGz: Uint8Array,
): Promise<{ proof: Uint8Array; publicInputs: Uint8Array }> {
  const bk = await getBackend();
  const result = await bk.generateProof(witnessGz, { keccak: true });
  const pubInputs = new Uint8Array(result.publicInputs.length * 32);
  return { proof: result.proof, publicInputs: pubInputs };
}

export async function loadWitness(): Promise<Uint8Array> {
  const resp = await fetch('/circuit/eligibility.gz');
  return new Uint8Array(await resp.arrayBuffer());
}

export async function loadPreGeneratedProof(): Promise<{ proof: Uint8Array; publicInputs: Uint8Array }> {
  const [proofResp, piResp] = await Promise.all([
    fetch('/circuit/proof.bin'),
    fetch('/circuit/pub_inputs.bin'),
  ]);
  return {
    proof: new Uint8Array(await proofResp.arrayBuffer()),
    publicInputs: new Uint8Array(await piResp.arrayBuffer()),
  };
}
