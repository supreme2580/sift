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
  path: bigint[];
  index: number[];
  root: bigint;
}

export async function buildMerkleProof(
  entries: { address: number; secret: number }[],
  addressIdx: number,
  secret: number,
  depth = 4,
): Promise<MerkleProof | null> {
  const idx = entries.findIndex(e => e.address === addressIdx && e.secret === secret);
  if (idx === -1) return null;

  const leaves: bigint[] = [];
  for (const e of entries) {
    leaves.push(await pedersenHash(e.address, e.secret));
  }

  while (leaves.length < Math.pow(2, depth)) {
    leaves.push(0n);
  }

  const levels: bigint[][] = [leaves];
  for (let h = 0; h < depth; h++) {
    const lv = levels[h];
    const nxt: bigint[] = [];
    for (let i = 0; i < lv.length; i += 2) nxt.push(await pedersenHash(Number(lv[i]), Number(lv[i + 1])));
    levels.push(nxt);
  }
  const root = levels[depth][0];

  const path: bigint[] = [];
  const index: number[] = [];
  let cur = idx;
  for (let h = 0; h < depth; h++) {
    const sibling = cur % 2 === 0 ? cur + 1 : cur - 1;
    path.push(levels[h][sibling]);
    index.push(cur % 2);
    cur = Math.floor(cur / 2);
  }

  let chk = leaves[idx];
  for (let i = 0; i < depth; i++) {
    chk = index[i] === 0
      ? await pedersenHash(Number(chk), Number(path[i]))
      : await pedersenHash(Number(path[i]), Number(chk));
  }

  return chk === root ? { leaf: leaves[idx], path, index, root } : null;
}
