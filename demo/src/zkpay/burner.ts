import { Keypair } from '@stellar/stellar-sdk';

export interface BurnerWallet {
  publicKey: string;
  secretKey: string;
}

export function generateBurner(): BurnerWallet {
  const kp = Keypair.random();
  return { publicKey: kp.publicKey(), secretKey: kp.secret() };
}
