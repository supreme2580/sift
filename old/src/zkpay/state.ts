import { useState, useCallback, useRef } from 'react';

export interface DepositInfo {
  commitment: string;
  amount: bigint;
  claimed: boolean;
}

export interface ZkPayState {
  connected: boolean;
  privyUser: any | null;
  secret: Uint8Array | null;
  commitment: Uint8Array | null;
  balance: bigint;
  deposits: DepositInfo[];
}

const stateRef: {
  current: ZkPayState | null;
  listeners: Set<() => void>;
} = {
  current: null,
  listeners: new Set(),
};

function notify() {
  stateRef.listeners.forEach((l) => l());
}

export function getZkPayState(): ZkPayState | null {
  return stateRef.current;
}

export function subscribeToZkPay(listener: () => void): () => void {
  stateRef.listeners.add(listener);
  return () => stateRef.listeners.delete(listener);
}

export async function initializeState() {
  if (stateRef.current) return;
  stateRef.current = {
    connected: false,
    privyUser: null,
    secret: null,
    commitment: null,
    balance: BigInt(0),
    deposits: [],
  };
  notify();
}

export function setConnected(privyUser: any, secret: Uint8Array, commitment: Uint8Array) {
  if (!stateRef.current) return;
  stateRef.current = { ...stateRef.current, connected: true, privyUser, secret, commitment };
  notify();
}

export function setDisconnected() {
  if (!stateRef.current) return;
  stateRef.current = { ...stateRef.current, connected: false, privyUser: null, secret: null, commitment: null };
  notify();
}

export function setBalance(balance: bigint) {
  if (!stateRef.current) return;
  stateRef.current = { ...stateRef.current, balance };
  notify();
}
