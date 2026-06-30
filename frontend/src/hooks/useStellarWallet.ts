import { useState, useEffect } from 'react';
import { Keypair, Horizon } from '@stellar/stellar-sdk';
import { useWallets } from '@privy-io/react-auth';
import { Buffer } from 'buffer';

const HORIZON_URL =
  import.meta.env.VITE_HORIZON_URL || 'https://horizon-testnet.stellar.org';

async function deriveKeypairFromAddress(
  address: string,
): Promise<{ publicKey: string; secretKey: string }> {
  const prefix = import.meta.env.VITE_STELLAR_DERIVE_PREFIX || '';
  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(prefix + address.toLowerCase()),
  );
  const seed = new Uint8Array(hashBuffer);
  const kp = Keypair.fromRawEd25519Seed(Buffer.from(seed));
  return { publicKey: kp.publicKey(), secretKey: kp.secret() };
}

async function fetchBalance(address: string): Promise<string> {
  try {
    const server = new Horizon.Server(HORIZON_URL);
    const account = await server.loadAccount(address);
    const native = account.balances.find(
      (b: { asset_type: string; balance: string }) => b.asset_type === 'native',
    );
    return native?.balance || '0';
  } catch {
    return '0';
  }
}

export function useStellarWallet() {
  const { wallets, ready } = useWallets();
  const [publicKey, setPublicKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [balance, setBalance] = useState('0');
  const [deriving, setDeriving] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const eth = wallets.find(
      (w) => w.type === 'ethereum' && w.connectorType === 'embedded',
    );
    if (!eth) return;
    setDeriving(true);
    deriveKeypairFromAddress(eth.address)
      .then((kp) => {
        setPublicKey(kp.publicKey);
        setSecretKey(kp.secretKey);
        setDeriving(false);
      })
      .catch(() => setDeriving(false));
  }, [ready, wallets]);

  useEffect(() => {
    if (!publicKey) return;
    fetchBalance(publicKey).then(setBalance);
  }, [publicKey]);

  const refetchBalance = async () => {
    if (publicKey) {
      const bal = await fetchBalance(publicKey);
      setBalance(bal);
    }
  };

  return { publicKey, secretKey, balance, deriving, refetchBalance };
}
