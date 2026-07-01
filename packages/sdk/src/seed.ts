export async function deriveSecretFromSeed(seed: string): Promise<Uint8Array> {
  const encoded = new TextEncoder().encode(seed);
  const hash = await crypto.subtle.digest('SHA-256', encoded);
  return new Uint8Array(hash);
}

export async function deriveSecretFromKey(privateKey: Uint8Array): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest('SHA-256', privateKey as any);
  return new Uint8Array(hash);
}

export function clearCachedSecret() {}
