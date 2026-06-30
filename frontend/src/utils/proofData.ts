// This file embeds compiled circuit data and pre-generated proof data.
// The ACIR bytecode is from circuits/eligibility/target/eligibility.json

import compiledCircuit from '../../../circuits/eligibility/target/eligibility.json';

export const ACIR_BYTECODE: string = compiledCircuit.bytecode;

// Pre-generated witness for address=1, secret=42
// Generated with: nargo execute (Prover.toml has address=1/secret=42)
import witnessData from '../../../circuits/eligibility/target/eligibility.gz?url';

export const WITNESS_URL: string = witnessData;

export interface ProofBundle {
  address: number;
  proof: string;  // base64
  publicInputs: string; // base64
}

// Pre-generated proofs for demo addresses
// Generated with bb prove_ultra_keccak_honk
const proof0: ProofBundle = {
  address: 0,
  proof: '', // filled by build script
  publicInputs: '',
};

const proof1: ProofBundle = {
  address: 1,
  proof: '', // filled by build script
  publicInputs: '',
};

export const PREGENERATED_PROOFS: Record<number, ProofBundle> = {
  0: proof0,
  1: proof1,
};
