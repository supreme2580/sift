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

export const ALLOWLIST = Array.from({ length: 16 }, (_, i) => ({
  address: i,
  secret: i === 1 ? 42 : 0,
}));

export interface MerkleProof {
  leaf: bigint;
  path: bigint[];
  index: number[];
  root: bigint;
}

export async function generateMerkleProof(address: number, secret: number): Promise<MerkleProof | null> {
  const idx = ALLOWLIST.findIndex(e => e.address === address && e.secret === secret);
  if (idx === -1) return null;

  const leaves: bigint[] = [];
  for (const e of ALLOWLIST) leaves.push(await pedersenHash(e.address, e.secret));

  const levels: bigint[][] = [leaves];
  for (let h = 0; h < 4; h++) {
    const lv = levels[h];
    const nxt: bigint[] = [];
    for (let i = 0; i < lv.length; i += 2) nxt.push(await pedersenHash(Number(lv[i]), Number(lv[i + 1])));
    levels.push(nxt);
  }
  const root = levels[4][0];

  const path: bigint[] = [];
  const index: number[] = [];
  let cur = idx;
  for (let h = 0; h < 4; h++) {
    const sibling = cur % 2 === 0 ? cur + 1 : cur - 1;
    path.push(levels[h][sibling]);
    index.push(cur % 2);
    cur = Math.floor(cur / 2);
  }

  let chk = leaves[idx];
  for (let i = 0; i < 4; i++) {
    chk = index[i] === 0
      ? await pedersenHash(Number(chk), Number(path[i]))
      : await pedersenHash(Number(path[i]), Number(chk));
  }
  return chk === root ? { leaf: leaves[idx], path, index, root } : null;
}
