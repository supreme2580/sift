const APP_SALT = 'zkpay-v1';

export async function deriveSecretAsync(privyUserId: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const data = encoder.encode(APP_SALT + privyUserId);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hash = await crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(hash);
  }
  throw new Error('Web Crypto not available');
}
