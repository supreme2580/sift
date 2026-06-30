import { BarretenbergSync, Fr } from '@aztec/bb.js';

let api: BarretenbergSync | null = null;

async function getApi(): Promise<BarretenbergSync> {
  if (!api) api = await BarretenbergSync.initSingleton();
  return api;
}

export async function pedersenHash(left: number, right: number): Promise<bigint> {
  const bp = await getApi();
  const r = bp.pedersenHash([new Fr(BigInt(left)), new Fr(BigInt(right))], 0);
  return BigInt(r.toString());
}

export interface MerkleProof {
  leaf: bigint;
  root: bigint;
  path: bigint[];
  index: number[];
}

export async function buildTree(entries: { addressIndex: number; secret: string }[]): Promise<{
  root: bigint;
  leaves: bigint[];
  getProof: (addressIndex: number, secret: string) => MerkleProof | null;
}> {
  const count = entries.length;
  const depth = Math.max(Math.ceil(Math.log2(count)), 1);

  const leaves: bigint[] = [];
  for (const e of entries) {
    const leaf = await pedersenHash(e.addressIndex, parseInt(e.secret));
    leaves.push(leaf);
  }

  while (leaves.length < Math.pow(2, depth)) {
    leaves.push(0n);
  }

  const tree: bigint[][] = [leaves];
  for (let h = 0; h < depth; h++) {
    const level = tree[h];
    const next: bigint[] = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(await pedersenHash(Number(level[i]), Number(level[i + 1])));
    }
    tree.push(next);
  }

  const root = tree[depth][0];

  function getProof(addressIndex: number, secret: string): MerkleProof | null {
    const entryIdx = entries.findIndex(e => e.addressIndex === addressIndex && e.secret === secret);
    if (entryIdx === -1) return null;

    const leaf = leaves[entryIdx];
    const path: bigint[] = [];
    const index: number[] = [];
    let idx = entryIdx;

    for (let h = 0; h < depth; h++) {
      const sibling = idx % 2 === 0 ? tree[h][idx + 1] : tree[h][idx - 1];
      path.push(sibling);
      index.push(idx % 2);
      idx = Math.floor(idx / 2);
    }

    while (path.length < 4) path.push(0n);
    while (index.length < 4) index.push(0);

    return { leaf, root, path: path.slice(0, 4), index: index.slice(0, 4) };
  }

  return { root, leaves, getProof };
}
