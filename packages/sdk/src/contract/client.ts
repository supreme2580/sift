import { rpc, TransactionBuilder, Contract, xdr, Keypair, Address, nativeToScVal, Account } from '@stellar/stellar-sdk';
import { getContractConfig } from './config';

export { getContractConfig } from './config';

const SIM_ACCOUNT = new Account(Keypair.random().publicKey(), '0');

async function getAccountWithRetry(server: rpc.Server, address: string, retries = 10, delayMs = 1500): Promise<Account> {
  for (let i = 0; i < retries; i++) {
    try {
      return await server.getAccount(address);
    } catch {
      if (i === retries - 1) throw new Error(`Account not found: ${address}`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw new Error(`Account not found: ${address}`);
}

export interface TxResult {
  hash: string;
  url: string;
  status: string;
}

function makeExplorerUrl(hash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

async function prepareAndSend(
  server: rpc.Server,
  tx: TransactionBuilder,
  signer: Keypair,
  networkPassphrase: string,
): Promise<TxResult> {
  const built = tx.build();
  const prepared = await server.prepareTransaction(built);
  prepared.sign(signer);
  const result = await server.sendTransaction(prepared);

  if (result.status === 'ERROR') {
    const txResult = result.errorResult?.result?.();
    const code = typeof txResult === 'object' ? (txResult as any)?.code : undefined;
    throw new Error(`tx rejected (${code || 'unknown'})`);
  }

  const hash = result.hash;
  const url = makeExplorerUrl(hash);
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const txResult: any = await (server as any).getTransaction(hash);
    if (txResult.status === 'SUCCESS') {
      return { hash, url, status: 'SUCCESS' };
    }
    if (txResult.status === 'FAILED') {
      throw new Error(`Transaction failed — see ${url}`);
    }
  }
  throw new Error(`Transaction timed out — see ${url}`);
}

export async function submitDeposit(
  secretKey: string,
  commitment: Uint8Array,
  amount: bigint,
): Promise<TxResult> {
  const config = getContractConfig();
  const server = new rpc.Server(config.rpcUrl);
  const kp = Keypair.fromSecret(secretKey);
  const contract = new Contract(config.contractId);
  const tokenContract = new Contract(config.nativeTokenId);
  const userAddress = kp.publicKey();

  // Soroban allows only 1 op per tx — split into transfer then deposit
  const account1 = await getAccountWithRetry(server, userAddress);
  const tx1 = new TransactionBuilder(account1, {
    fee: '1000',
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(tokenContract.call('transfer',
      xdr.ScVal.scvAddress(Address.fromString(userAddress).toScAddress()),
      xdr.ScVal.scvAddress(Address.fromString(config.contractId).toScAddress()),
      nativeToScVal(amount, { type: 'i128' }),
    ))
    .setTimeout(30);
  const result1 = await prepareAndSend(server, tx1, kp, config.networkPassphrase);

  const account2 = await getAccountWithRetry(server, userAddress);
  const tx2 = new TransactionBuilder(account2, {
    fee: '1000',
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(contract.call('deposit',
      xdr.ScVal.scvBytes(Buffer.from(commitment)),
      nativeToScVal(amount, { type: 'i128' }),
    ))
    .setTimeout(30);
  return prepareAndSend(server, tx2, kp, config.networkPassphrase);
}

export async function submitWithdraw(
  proof: Uint8Array,
  publicInputs: Uint8Array,
  recipient: string,
  feePayerSecret: string,
): Promise<TxResult> {
  const config = getContractConfig();
  const server = new rpc.Server(config.rpcUrl);
  const signer = Keypair.fromSecret(feePayerSecret);
  const contract = new Contract(config.contractId);
  const recipientAddr = Address.fromString(recipient);

  const account = await getAccountWithRetry(server, signer.publicKey());
  const tx = new TransactionBuilder(account, {
    fee: '1000',
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(contract.call('withdraw',
      xdr.ScVal.scvBytes(Buffer.from(proof)),
      xdr.ScVal.scvBytes(Buffer.from(publicInputs)),
      xdr.ScVal.scvAddress(recipientAddr.toScAddress()),
    ))
    .setTimeout(30);

  return prepareAndSend(server, tx, signer, config.networkPassphrase);
}

export async function checkNullifierUsed(nullifier: Uint8Array): Promise<boolean> {
  const config = getContractConfig();
  try {
    const server = new rpc.Server(config.rpcUrl);
    const contract = new Contract(config.contractId);
    const simTx = new TransactionBuilder(SIM_ACCOUNT, {
      fee: '100',
      networkPassphrase: config.networkPassphrase,
    })
      .addOperation(contract.call('nullifier_used', xdr.ScVal.scvBytes(Buffer.from(nullifier))))
      .setTimeout(30)
      .build();

    const result = await server.simulateTransaction(simTx);
    const retval = (result as any)?.result?.retval;
    return retval?._value === true || retval?._value?.attributes?.lo === 1n;
  } catch { return false; }
}

export async function checkCommitmentExists(commitment: Uint8Array): Promise<boolean> {
  const config = getContractConfig();
  try {
    const server = new rpc.Server(config.rpcUrl);
    const contract = new Contract(config.contractId);
    const simTx = new TransactionBuilder(SIM_ACCOUNT, {
      fee: '100',
      networkPassphrase: config.networkPassphrase,
    })
      .addOperation(contract.call('commitment_exists', xdr.ScVal.scvBytes(Buffer.from(commitment))))
      .setTimeout(30)
      .build();
    const result = await server.simulateTransaction(simTx);
    const retval = (result as any)?.result?.retval;
    return retval?._value === true || retval?._value?.attributes?.lo === 1n;
  } catch { return false; }
}
