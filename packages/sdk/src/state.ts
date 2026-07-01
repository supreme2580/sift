export interface DepositInfo {
  commitment: string;
  amount: bigint;
  nonce: string;
  claimed: boolean;
}

export interface ZkAuthState {
  connected: boolean;
  user: { seed?: string } | null;
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
    user: null,
    secret: null,
    balance: BigInt(0),
    deposits: [],
  };
  notify();
}

export function setConnected(user: any, secret: Uint8Array) {
  if (!stateRef.current) return;
  stateRef.current = { ...stateRef.current, connected: true, user, secret };
  notify();
}

export function setDisconnected() {
  if (!stateRef.current) return;
  stateRef.current = { ...stateRef.current, connected: false, user: null, secret: null };
  notify();
}

export function setBalance(balance: bigint) {
  if (!stateRef.current) return;
  stateRef.current = { ...stateRef.current, balance };
  notify();
}

export function addDeposit(deposit: DepositInfo) {
  if (!stateRef.current) return;
  stateRef.current = {
    ...stateRef.current,
    deposits: [...stateRef.current.deposits, deposit],
  };
  notify();
}

export function claimDeposit(commitment: string) {
  if (!stateRef.current) return;
  stateRef.current = {
    ...stateRef.current,
    deposits: stateRef.current.deposits.map(d =>
      d.commitment === commitment ? { ...d, claimed: true } : d
    ),
  };
  notify();
}
