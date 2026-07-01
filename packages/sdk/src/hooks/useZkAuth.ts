import { useState, useEffect, useCallback } from 'react';
import type { ZkAuthState } from '../state';
import { getZkAuthState, subscribeToZkAuth, initializeState, setConnected, setDisconnected, setBalance } from '../state';
import { deriveSecretFromKey, clearCachedSecret } from '../privy';

export interface UseZkAuthOptions {
  privateKey?: Uint8Array;
}

export interface UseZkAuthReturn extends ZkAuthState {
  connect: () => Promise<void>;
  disconnect: () => void;
  login: () => void;
}

export function useZkAuth(options?: UseZkAuthOptions): UseZkAuthReturn {
  const [state, setState] = useState<ZkAuthState | null>(getZkAuthState);

  useEffect(() => {
    initializeState();
    setState(getZkAuthState());
    return subscribeToZkAuth(() => setState(getZkAuthState()));
  }, []);

  const connect = useCallback(async () => {
    if (options?.privateKey) {
      const secret = await deriveSecretFromKey(options.privateKey);
      setConnected(null, secret);
    } else {
      throw new Error('Privy connect not available in useZkAuth — use ZkAuthButton component or provide a privateKey option');
    }
  }, [options?.privateKey]);

  const disconnect = useCallback(() => {
    clearCachedSecret();
    setDisconnected();
  }, []);

  const login = useCallback(() => {
    throw new Error('Login action not available here — use ZkAuthButton component');
  }, []);

  return {
    ...(state || {
      connected: false,
      privyUser: null,
      secret: null,
      balance: BigInt(0),
      deposits: [],
    }),
    connect,
    disconnect,
    login,
  };
}
