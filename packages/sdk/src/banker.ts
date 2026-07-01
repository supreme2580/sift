import { Keypair } from '@stellar/stellar-sdk';

export interface BurnerWallet {
  secretKey: string;
  publicKey: string;
}

export function generateBurner(): BurnerWallet {
  const kp = Keypair.random();
  return {
    secretKey: kp.secret(),
    publicKey: kp.publicKey(),
  };
}
