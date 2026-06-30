declare global {
  interface Window {
    freighter?: {
      isConnected: () => Promise<{ isConnected: boolean }>;
      getPublicKey: () => Promise<string>;
      signTransaction: (xdr: string, opts: { networkPassphrase: string }) => Promise<string>;
    };
  }
}

export async function connectFreighter(): Promise<string> {
  try {
    const resp = await window.freighter!.isConnected();
    if (!resp.isConnected) throw new Error('Freighter not connected');
    return await window.freighter!.getPublicKey();
  } catch {
    try {
      const key = await handleLegacyFreighter();
      return key;
    } catch {
      throw new Error('Freighter not available. Install the Freighter browser extension.');
    }
  }
}

async function handleLegacyFreighter(): Promise<string> {
  const anyWin = window as any;
  if (anyWin.stellar?.freighter) {
    const connected = await anyWin.stellar.freighter.isConnected();
    if (!connected.isConnected) throw new Error('Not connected');
    return await anyWin.stellar.freighter.getPublicKey();
  }
  throw new Error('Freighter not found');
}

export async function signAndSubmitClaim(
  publicKey: string,
  contractId: string,
  proofHex: string,
  publicInputsHex: string,
  rpcUrl: string,
): Promise<string> {
  const txXdr = await buildClaimXdr(publicKey, contractId, proofHex, publicInputsHex);
  const signed = await window.freighter!.signTransaction(txXdr, {
    networkPassphrase: 'Test SDF Network ; September 2015',
  });

  const resp = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'sendTransaction',
      params: { transaction: signed },
    }),
  });
  const data = await resp.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return data.result?.hash || data.result?.id || 'submitted';
}

async function buildClaimXdr(
  source: string,
  contractId: string,
  proofHex: string,
  publicInputsHex: string,
): Promise<string> {
  const buf = new Uint8Array(4 + 4 + proofHex.length / 2 + 4 + publicInputsHex.length / 2);
  const dv = new DataView(buf.buffer);
  let off = 0;
  dv.setUint32(off, 2, false); off += 4;
  dv.setUint32(off, 4 + publicInputsHex.length / 2, false); off += 4;
  off += parseHexInto(proofHex, buf, off);
  dv.setUint32(off, 4, false); off += 4;
  dv.setUint32(off, publicInputsHex.length / 2, false); off += 4;
  off += parseHexInto(publicInputsHex, buf, off);

  const tx = {
    sourceAccount: source,
    operations: [{
      type: 'invokeHostFunction',
      params: {
        contractId,
        functionName: 'verify_and_claim',
        args: [
          { type: 'bytes', value: proofHex },
          { type: 'bytes', value: publicInputsHex },
        ],
        auth: [],
      },
    }],
    memo: undefined,
  };
  return btoa(JSON.stringify(tx));
}

function parseHexInto(hex: string, buf: Uint8Array, offset: number): number {
  for (let i = 0; i < hex.length; i += 2) {
    buf[offset + i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return hex.length / 2;
}
