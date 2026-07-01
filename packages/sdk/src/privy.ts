const SESSION_STORAGE_KEY = 'zkauth-secret-hash';

export async function deriveSecretFromKey(privateKey: Uint8Array): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest('SHA-256', privateKey as BufferSource);
  return new Uint8Array(hash);
}

export async function deriveSecretFromPrivyViaApi(
  accessToken: string,
  walletId: string,
): Promise<Uint8Array> {
  const cached = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (cached) {
    return new Uint8Array(JSON.parse(cached));
  }

  const res = await fetch('/api/privy-export-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jwt: accessToken, walletId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to export Privy private key');
  }

  const { privateKey: privateKeyHex } = await res.json();
  const rawKey = hexToUint8Array(privateKeyHex);
  const secret = await deriveSecretFromKey(rawKey);

  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(Array.from(secret)));
  return secret;
}

function hexToUint8Array(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/i, '');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function clearCachedSecret() {
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
}
