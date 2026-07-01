export interface IdentityProof {
  proof: Uint8Array;
  publicInputs: Uint8Array;
  commitment: Uint8Array;
  nullifier: Uint8Array;
}

export interface DepositData {
  feeSecret: string;
  nonce: number[];
}
