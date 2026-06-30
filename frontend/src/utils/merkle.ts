import { BarretenbergSync, Fr } from '@aztec/bb.js';

let api: BarretenbergSync | null = null;

async function getApi(): Promise<BarretenbergSync> {
  if (!api) api = await BarretenbergSync.initSingleton();
  return api;
}

export function secretToField(secret: string): bigint {
  const n = Number(secret);
  if (!isNaN(n) && Number.isInteger(n) && n >= 0 && n <= Number.MAX_SAFE_INTEGER) {
    return BigInt(n);
  }
  const bytes = new TextEncoder().encode(secret);
  let result = 0n;
  for (const b of bytes) {
    result = (result << 8n) + BigInt(b);
  }
  return result;
}

export async function pedersenHash(left: bigint, right: bigint): Promise<bigint> {
  const bp = await getApi();
  const r = bp.pedersenHash([new Fr(left), new Fr(right)], 0);
  return BigInt(r.toString());
}

export interface MerkleProof {
  leaf: bigint;
  path: bigint[];
  index: number[];
  root: bigint;
}

export const MERKLE_DEPTH = 4;
export const MERKLE_SIZE = 16;
