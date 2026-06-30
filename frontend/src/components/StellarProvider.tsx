import { useEffect, useCallback, useRef, useMemo, type ReactNode } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useCreateWallet, useSignRawHash } from '@privy-io/react-auth/extended-chains';
import { TransactionBuilder, Keypair, xdr } from '@stellar/stellar-sdk';
import { StellarContext, type StellarSigner, type StellarState } from '../lib/stellar-context';

const NETWORK_PASSPHRASE =
  import.meta.env.VITE_STELLAR_NETWORK_PASSPHRASE ||
  'Test SDF Network ; September 2015';

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

type SignRawHashFn = (input: {
  address: string;
  chainType: 'stellar';
  hash: `0x${string}`;
}) => Promise<{ signature: `0x${string}` }>;

function buildSigner(address: string, signRawHash: SignRawHashFn): StellarSigner {
  return {
    address,
    signTransaction: async (txXdr: string) => {
      const tx = TransactionBuilder.fromXDR(txXdr, NETWORK_PASSPHRASE) as any;
      const hash = tx.hash();
      const hashHex = '0x' + toHex(hash);
      const { signature: sigHex } = await signRawHash({
        address,
        chainType: 'stellar',
        hash: hashHex as `0x${string}`,
      });
      const sigBytes = fromHex(sigHex.replace('0x', ''));
      const hint = Keypair.fromPublicKey(tx.source).signatureHint();
      const decoratedSig = new xdr.DecoratedSignature({ hint, signature: sigBytes });
      tx.signatures.push(decoratedSig);
      return tx.toXDR();
    },
  };
}

export function StellarProvider({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, logout } = usePrivy();
  const { createWallet } = useCreateWallet();
  const { signRawHash } = useSignRawHash();
  const creatingRef = useRef(false);

  const stellarWallet = useMemo(() => {
    if (!user?.linkedAccounts) return null;
    return user.linkedAccounts.find(
      (a) => a.type === 'wallet' && 'chainType' in a && a.chainType === 'stellar',
    ) as { address: string; type: string; chainType: string } | null;
  }, [user]);

  useEffect(() => {
    if (ready && authenticated && !stellarWallet && !creatingRef.current) {
      creatingRef.current = true;
      createWallet({ chainType: 'stellar' })
        .catch((err: unknown) => {
          console.error('Failed to create Stellar wallet:', err);
        })
        .finally(() => {
          creatingRef.current = false;
        });
    }
  }, [ready, authenticated, stellarWallet, createWallet]);

  const disconnect = useCallback(() => {
    logout().catch(() => {});
  }, [logout]);

  const address = stellarWallet?.address ?? null;
  const signer =
    address && signRawHash
      ? buildSigner(address, signRawHash as SignRawHashFn)
      : null;

  const value: StellarState = {
    isConnected: ready && authenticated && !!address,
    address,
    disconnect,
    signer,
  };

  return (
    <StellarContext.Provider value={value}>
      {children}
    </StellarContext.Provider>
  );
}
