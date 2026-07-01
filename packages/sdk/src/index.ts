// Identity
export { computeCommitment, computeNullifier, bytesToHex, hexToBytes, generateProof } from './identity';
export type { ProofResult, IdentityProof, DepositData } from './identity';

// State
export { getZkAuthState, subscribeToZkAuth, setBalance } from './state';
export type { ZkAuthState, DepositInfo } from './state';

// Hooks & Provider
export { ZkAuthProvider, useZkAuth } from './hooks';
export type { UseZkAuthOptions, UseZkAuthReturn } from './hooks';

// Components
export { ZkAuthButton } from './components';
export type { ZkAuthButtonProps } from './components';

// Contract
export { submitDeposit, submitWithdraw, checkNullifierUsed, checkCommitmentExists, getContractConfig } from './contract';
export type { TxResult, ContractConfig } from './contract';

// Seed phrase
export { deriveSecretFromSeed, deriveSecretFromKey, clearCachedSecret } from './seed';

// Banker
export { generateBurner, deriveKeypair } from './banker';
export type { BurnerWallet } from './banker';
