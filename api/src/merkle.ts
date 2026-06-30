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
  root: bigint;
  path: bigint[];
  index: number[];
}

const MERKLE_DEPTH = 4;
const MERKLE_SIZE = Math.pow(2, MERKLE_DEPTH); // 16 leaves

export async function buildTree(entries: { addressIndex: number; secret: string }[]): Promise<{
  root: bigint;
  leaves: bigint[];
  getProof: (addressIndex: number, secret: string) => MerkleProof | null;
}> {
  const count = entries.length;
  if (count > MERKLE_SIZE) {
    throw new Error(`Tree can hold at most ${MERKLE_SIZE} entries (got ${count})`);
  }

  const leaves: bigint[] = [];
  for (const e of entries) {
    const secretVal = secretToField(e.secret);
    const leaf = await pedersenHash(BigInt(e.addressIndex), secretVal);
    leaves.push(leaf);
  }

  while (leaves.length < MERKLE_SIZE) {
    leaves.push(0n);
  }

  const tree: bigint[][] = [leaves];
  for (let h = 0; h < MERKLE_DEPTH; h++) {
    const level = tree[h];
    const next: bigint[] = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(await pedersenHash(level[i], level[i + 1]));
    }
    tree.push(next);
  }

  const root = tree[MERKLE_DEPTH][0];

  function getProof(addressIndex: number, secret: string): MerkleProof | null {
    const entryIdx = entries.findIndex(e => e.addressIndex === addressIndex && e.secret === secret);
    if (entryIdx === -1) return null;

    const leaf = leaves[entryIdx];
    const path: bigint[] = [];
    const index: number[] = [];
    let idx = entryIdx;

    for (let h = 0; h < MERKLE_DEPTH; h++) {
      const sibling = idx % 2 === 0 ? tree[h][idx + 1] : tree[h][idx - 1];
      path.push(sibling);
      index.push(idx % 2);
      idx = Math.floor(idx / 2);
    }

    return { leaf, root, path, index };
  }

  return { root, leaves, getProof };
}
