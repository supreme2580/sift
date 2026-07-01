import { BarretenbergSync } from '@aztec/bb.js';
import { bytesToHex, hexToBytes } from './utils';

const BN254_FR_MODULUS = 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001n;

let bb: BarretenbergSync | null = null;

async function getBB(): Promise<BarretenbergSync> {
  if (bb) return bb;
  bb = await BarretenbergSync.new();
  return bb;
}

function uint8ArrayToBigInt(bytes: Uint8Array): bigint {
  let val = 0n;
  for (const b of bytes) val = (val << 8n) | BigInt(b);
  return val;
}

function bigIntToUint8ArrayBE(val: bigint, length: number = 32): Uint8Array {
  const result = new Uint8Array(length);
  for (let i = length - 1; i >= 0; i--) {
    result[i] = Number(val & 0xffn);
    val >>= 8n;
  }
  return result;
}

function bytesToFr(bytes: Uint8Array): Uint8Array {
  const val = uint8ArrayToBigInt(bytes) % BN254_FR_MODULUS;
  return bigIntToUint8ArrayBE(val);
}

export async function computeCommitment(secretBytes: Uint8Array, nonceBytes: Uint8Array): Promise<Uint8Array> {
  const api = await getBB();
  const secretFr = bytesToFr(secretBytes);
  const nonceFr = bytesToFr(nonceBytes);
  const result = api.pedersenHash({ inputs: [secretFr, nonceFr], hashIndex: 0 });
  return result.hash;
}

export async function computeNullifier(commitment: Uint8Array, secretBytes: Uint8Array, nonceBytes: Uint8Array): Promise<Uint8Array> {
  const api = await getBB();
  const commFr = bytesToFr(commitment);
  const secretFr = bytesToFr(secretBytes);
  const nonceFr = bytesToFr(nonceBytes);
  const result = api.pedersenHash({ inputs: [commFr, secretFr, nonceFr], hashIndex: 0 });
  return result.hash;
}

export function toFieldHex(bytes: Uint8Array): string {
  const val = uint8ArrayToBigInt(bytes) % BN254_FR_MODULUS;
  return '0x' + val.toString(16).padStart(64, '0');
}

export { bytesToHex, hexToBytes };
