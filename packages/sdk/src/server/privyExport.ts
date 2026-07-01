import { PrivyClient } from '@privy-io/node';

export async function POST(request: Request): Promise<Response> {
  const appId = process.env.PRIVY_APP_ID || process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (!appId || !appSecret) {
    return Response.json({ error: 'PRIVY_APP_ID and PRIVY_APP_SECRET must be set' }, { status: 500 });
  }

  let body: { walletId?: string; jwt?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { walletId, jwt } = body;
  if (!walletId || !jwt) {
    return Response.json({ error: 'walletId and jwt are required' }, { status: 400 });
  }

  try {
    const privy = new PrivyClient({ appId, appSecret });
    const { private_key } = await privy.wallets().exportPrivateKey(walletId, {
      authorization_context: { user_jwts: [jwt] },
    });
    return Response.json({ privateKey: private_key });
  } catch (err: any) {
    console.error('[zkauth] Privy key export failed:', err);
    return Response.json({ error: err.message || 'Key export failed' }, { status: 500 });
  }
}
