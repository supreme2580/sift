import { useState as reactUseState, useCallback, useRef } from 'react';

export interface DepositInfo {
  commitment: string;
  amount: bigint;
  claimed: boolean;
}

export interface ZkAuthState {
  connected: boolean;
  privyUser: any | null;
  secret: Uint8Array | null;
  balance: bigint;
  deposits: DepositInfo[];
}

const stateRef: {
  current: ZkAuthState | null;
  listeners: Set<() => void>;
} = {
  current: null,
  listeners: new Set(),
};

function notify() {
  stateRef.listeners.forEach((l) => l());
}

export function getZkAuthState(): ZkAuthState | null {
  return stateRef.current;
}

export function subscribeToZkAuth(listener: () => void): () => void {
  stateRef.listeners.add(listener);
  return () => stateRef.listeners.delete(listener);
}

export async function initializeState() {
  if (stateRef.current) return;
  stateRef.current = {
    connected: false,
    privyUser: null,
    secret: null,
    balance: BigInt(0),
    deposits: [],
  };
  notify();
}

export function setConnected(privyUser: any, secret: Uint8Array) {
  if (!stateRef.current) return;
  stateRef.current = { ...stateRef.current, connected: true, privyUser, secret };
  notify();
}

export function setDisconnected() {
  if (!stateRef.current) return;
  stateRef.current = { ...stateRef.current, connected: false, privyUser: null, secret: null };
  notify();
}

export function setBalance(balance: bigint) {
  if (!stateRef.current) return;
  stateRef.current = { ...stateRef.current, balance };
  notify();
}
