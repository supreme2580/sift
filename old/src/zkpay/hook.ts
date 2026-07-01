import { useState, useEffect, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import type { ZkPayState } from './state.js';
import { getZkPayState, subscribeToZkPay, initializeState } from './state.js';

export function useZkPay(): ZkPayState & {
  login: () => void;
  logout: () => void;
  authenticated: boolean;
  ready: boolean;
} {
  const [state, setState] = useState<ZkPayState | null>(getZkPayState);
  const { login, logout, ready, authenticated, user } = usePrivy();

  useEffect(() => {
    initializeState();
    setState(getZkPayState());
    return subscribeToZkPay(() => setState(getZkPayState()));
  }, []);

  const handleLogin = useCallback(() => { login(); }, [login]);
  const handleLogout = useCallback(() => { logout(); }, [logout]);

  return {
    ...(state || {
      connected: false,
      privyUser: null,
      secret: null,
      commitment: null,
      balance: BigInt(0),
      deposits: [],
    }),
    login: handleLogin,
    logout: handleLogout,
    authenticated,
    ready,
  };
}
