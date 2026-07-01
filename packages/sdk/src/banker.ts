import { Keypair } from '@stellar/stellar-sdk';

export interface BurnerWallet {
  secretKey: string;
  publicKey: string;
}

export function deriveKeypair(secret: Uint8Array): BurnerWallet {
  const kp = Keypair.fromRawEd25519Seed(Buffer.from(secret));
  return {
    secretKey: kp.secret(),
    publicKey: kp.publicKey(),
  };
}

export function generateBurner(): BurnerWallet {
  const kp = Keypair.random();
  return {
    secretKey: kp.secret(),
    publicKey: kp.publicKey(),
  };
}
