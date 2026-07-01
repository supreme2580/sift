const SESSION_STORAGE_KEY = 'zkauth-secret-hash';

export async function deriveSecretFromKey(privateKey: Uint8Array): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest('SHA-256', privateKey as BufferSource);
  return new Uint8Array(hash);
}

export async function deriveSecretFromPrivy(user: any): Promise<Uint8Array> {
  const cached = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (cached) {
    return new Uint8Array(JSON.parse(cached));
  }

  const rawKey: Uint8Array = await user.wallet.exportPrivateKey();
  const secret = await deriveSecretFromKey(rawKey);

  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(Array.from(secret)));
  return secret;
}

export function clearCachedSecret() {
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
}
