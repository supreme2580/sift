import { BarretenbergSync, Fr } from '@aztec/bb.js';

let bb: BarretenbergSync | null = null;

async function getBB(): Promise<BarretenbergSync> {
  if (bb) return bb;
  bb = await BarretenbergSync.new();
  return bb;
}

function frToBytes(fr: any): Uint8Array {
  return fr.toBuffer();
}

function bytesToFr(bytes: Uint8Array): any {
  return Fr.fromBufferReduce(bytes);
}

export async function computeCommitment(secretBytes: Uint8Array): Promise<Uint8Array> {
  const api = await getBB();
  const secretFr = bytesToFr(secretBytes);
  const hash = api.pedersenHash([secretFr], 0);
  return frToBytes(hash);
}

export async function computeNullifier(commitment: Uint8Array, secretBytes: Uint8Array): Promise<Uint8Array> {
  const api = await getBB();
  const commFr = bytesToFr(commitment);
  const secretFr = bytesToFr(secretBytes);
  const hash = api.pedersenHash([commFr, secretFr], 0);
  return frToBytes(hash);
}

export function bytesToHex(bytes: Uint8Array): string {
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function toFieldHex(bytes: Uint8Array): string {
  let val = 0n;
  for (const b of bytes) val = (val << 8n) | BigInt(b);
  val %= Fr.MODULUS;
  return '0x' + val.toString(16).padStart(64, '0');
}

export function hexToBytes(hex: string): Uint8Array {
  const h = hex.replace('0x', '');
  return new Uint8Array(h.match(/.{1,2}/g)?.map(b => parseInt(b, 16)) || []);
}
