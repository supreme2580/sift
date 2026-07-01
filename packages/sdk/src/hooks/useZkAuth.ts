import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ZkAuthState } from '../state';
import { getZkAuthState, subscribeToZkAuth, initializeState, setConnected, setDisconnected } from '../state';
import { deriveSecretFromSeed } from '../seed';
import { deriveKeypair } from '../banker';

export interface UseZkAuthOptions {
  privateKey?: Uint8Array;
}

export interface UseZkAuthReturn extends ZkAuthState {
  identityAddress: string | null;
  identitySecretKey: string | null;
  connect: (seed: string) => Promise<void>;
  disconnect: () => void;
}

export function useZkAuth(options?: UseZkAuthOptions): UseZkAuthReturn {
  const [state, setState] = useState<ZkAuthState | null>(getZkAuthState);

  const keypair = useMemo(() => {
    const s = state?.secret;
    return s ? deriveKeypair(s) : null;
  }, [state?.secret]);
  const identityAddress = keypair?.publicKey ?? null;
  const identitySecretKey = keypair?.secretKey ?? null;

  useEffect(() => {
    initializeState();
    setState(getZkAuthState());
    return subscribeToZkAuth(() => setState(getZkAuthState()));
  }, []);

  useEffect(() => {
    if (options?.privateKey) {
      (async () => {
        const { deriveSecretFromKey } = await import('../seed');
        const secret = await deriveSecretFromKey(options.privateKey!);
        setConnected(null, secret);
      })();
    }
  }, [options?.privateKey]);

  const connect = useCallback(async (seed: string) => {
    const secret = await deriveSecretFromSeed(seed);
    setConnected(null, secret);
  }, []);

  const disconnect = useCallback(() => {
    setDisconnected();
  }, []);

  return {
    ...(state || {
      connected: false,
      user: null,
      secret: null,
      balance: BigInt(0),
      deposits: [],
    }),
    identityAddress,
    identitySecretKey,
    connect,
    disconnect,
  };
}
