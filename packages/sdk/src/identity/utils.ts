export function bytesToHex(bytes: Uint8Array): string {
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function hexToBytes(hex: string): Uint8Array {
  const h = hex.replace('0x', '');
  return new Uint8Array(h.match(/.{1,2}/g)?.map(b => parseInt(b, 16)) || []);
}
