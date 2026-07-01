const SESSION_STORAGE_KEY = 'zkauth-secret-hash';

export async function deriveSecretFromKey(privateKey: Uint8Array): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest('SHA-256', privateKey as BufferSource);
  return new Uint8Array(hash);
}

const encoder = new TextEncoder();

export async function deriveSecretFromPrivy(user: any): Promise<Uint8Array> {
  const cached = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (cached) {
    return new Uint8Array(JSON.parse(cached));
  }

  // Privy v3 removed programmatic key export (only modal via useExportWallet).
  // Derive identity deterministically from the user's Privy ID.
  // For stronger security, pass a raw private key via the privateKey prop.
  const seed = `zkauth-v1:${user.id}`;
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(seed));
  const secret = new Uint8Array(hash);

  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(Array.from(secret)));
  return secret;
}

export function clearCachedSecret() {
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
}
