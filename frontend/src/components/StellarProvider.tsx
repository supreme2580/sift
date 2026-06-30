import { useMemo, type ReactNode } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { Keypair, TransactionBuilder } from '@stellar/stellar-sdk';
import { StellarContext, type StellarSigner, type StellarState } from '../lib/stellar-context';
import { useStellarWallet } from '../hooks/useStellarWallet';

const NETWORK_PASSPHRASE =
  import.meta.env.VITE_STELLAR_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015';

function buildSigner(secretKey: string, network: string): StellarSigner {
  const kp = Keypair.fromSecret(secretKey);
  return {
    address: kp.publicKey(),
    signTransaction: async (txXdr: string) => {
      const tx = TransactionBuilder.fromXDR(txXdr, network) as any;
      tx.sign(kp);
      return tx;
    },
  };
}

export function StellarProvider({ children }: { children: ReactNode }) {
  const { ready, authenticated, logout } = usePrivy();
  const { publicKey, secretKey } = useStellarWallet();

  const signer = useMemo(() => {
    if (!publicKey || !secretKey) return null;
    return buildSigner(secretKey, NETWORK_PASSPHRASE);
  }, [publicKey, secretKey]);

  const value: StellarState = {
    isConnected: ready && authenticated && !!publicKey,
    address: publicKey || null,
    disconnect: () => logout().catch(() => {}),
    signer,
  };

  return (
    <StellarContext.Provider value={value}>
      {children}
    </StellarContext.Provider>
  );
}
