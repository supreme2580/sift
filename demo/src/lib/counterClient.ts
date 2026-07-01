import { rpc, TransactionBuilder, Contract, xdr, Keypair, Account, nativeToScVal } from '@stellar/stellar-sdk';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015';
const COUNTER_ID = process.env.NEXT_PUBLIC_SHIELDED_COUNTER_ID || '';

function getContract() {
  if (!COUNTER_ID) throw new Error('NEXT_PUBLIC_SHIELDED_COUNTER_ID not set');
  const server = new rpc.Server(RPC_URL);
  const contract = new Contract(COUNTER_ID);
  return { server, contract };
}

export async function registerCommitment(burnerSecret: string, commitment: Uint8Array): Promise<string> {
  const { server, contract } = getContract();
  const kp = Keypair.fromSecret(burnerSecret);
  const account = await server.getAccount(kp.publicKey());
  const tx = new TransactionBuilder(account, {
    fee: '1000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('register', xdr.ScVal.scvBytes(Buffer.from(commitment))))
    .setTimeout(30)
    .build();

  const prepared = await server.prepareTransaction(tx);
  prepared.sign(kp);
  const result = await server.sendTransaction(prepared);
  if (result.status === 'ERROR') throw new Error('register tx rejected');
  const hash = result.hash;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const txResult: any = await (server as any).getTransaction(hash);
    if (txResult.status === 'SUCCESS') return `https://stellar.expert/explorer/testnet/tx/${hash}`;
    if (txResult.status === 'FAILED') throw new Error(`register tx failed`);
  }
  throw new Error('register tx timed out');
}

export async function shieldedIncrement(
  burnerSecret: string,
  proof: Uint8Array,
  publicInputs: Uint8Array,
): Promise<{ url: string; newCount: number }> {
  const { server, contract } = getContract();
  const kp = Keypair.fromSecret(burnerSecret);
  const account = await server.getAccount(kp.publicKey());
  const tx = new TransactionBuilder(account, {
    fee: '1000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('shielded_increment',
      xdr.ScVal.scvBytes(Buffer.from(proof)),
      xdr.ScVal.scvBytes(Buffer.from(publicInputs)),
    ))
    .setTimeout(30)
    .build();

  const prepared = await server.prepareTransaction(tx);
  prepared.sign(kp);
  const result = await server.sendTransaction(prepared);
  if (result.status === 'ERROR') throw new Error('shielded_increment tx rejected');
  const hash = result.hash;
  const url = `https://stellar.expert/explorer/testnet/tx/${hash}`;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const txResult: any = await (server as any).getTransaction(hash);
    if (txResult.status === 'SUCCESS') {
      const retval = txResult.result?.retval;
      const newCount = Number(retval?._value?.attributes?.lo || 0);
      return { url, newCount };
    }
    if (txResult.status === 'FAILED') throw new Error(`shielded_increment tx failed — see ${url}`);
  }
  throw new Error('shielded_increment tx timed out');
}

export async function getCount(commitment: Uint8Array): Promise<number> {
  const { server, contract } = getContract();
  const simAccount = new Account(Keypair.random().publicKey(), '0');
  const simTx = new TransactionBuilder(simAccount, {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('get_count', xdr.ScVal.scvBytes(Buffer.from(commitment))))
    .setTimeout(30)
    .build();
  const result = await server.simulateTransaction(simTx);
  const retval = (result as any)?.result?.retval;
  return Number(retval?._value?.attributes?.lo || 0);
}

export async function commitmentExists(commitment: Uint8Array): Promise<boolean> {
  const { server, contract } = getContract();
  const simAccount = new Account(Keypair.random().publicKey(), '0');
  const simTx = new TransactionBuilder(simAccount, {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('commitment_exists', xdr.ScVal.scvBytes(Buffer.from(commitment))))
    .setTimeout(30)
    .build();
  const result = await server.simulateTransaction(simTx);
  const retval = (result as any)?.result?.retval;
  return retval?._value === true || retval?._value?.attributes?.lo === 1n;
}
