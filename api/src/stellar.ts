import { rpc, Contract, TransactionBuilder, nativeToScVal, Keypair } from '@stellar/stellar-sdk';

const RPC_URL = process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = process.env.STELLAR_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015';
const FEE = '100000';

let server: rpc.Server;

function getServer(): rpc.Server {
  if (!server) server = new rpc.Server(RPC_URL);
  return server;
}

export async function setContractRoot(contractId: string, root: bigint, adminSecret: string): Promise<string> {
  const kp = Keypair.fromSecret(adminSecret);
  const pubKey = kp.publicKey();
  const contract = new Contract(contractId);
  const serv = getServer();
  const account = await serv.getAccount(pubKey);

  const rootHex = '0x' + root.toString(16).padStart(64, '0');
  const rootBytes = Buffer.from(rootHex.slice(2), 'hex');

  const tx = new TransactionBuilder(account, {
    fee: FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('set_root', nativeToScVal(rootBytes, { type: 'bytes' })))
    .setTimeout(30)
    .build();

  const simulation: any = await serv.simulateTransaction(tx);
  if (simulation.error) throw new Error(`Simulation error: ${simulation.error}`);

  const assembled: any = rpc.assembleTransaction(tx, simulation);
  const envelope = assembled.toEnvelope().toXDR('base64');

  const tx2: any = TransactionBuilder.fromXDR(envelope, NETWORK_PASSPHRASE);
  tx2.sign(kp);

  const result: any = await serv.sendTransaction(tx2.toXDR());
  if (result.error) throw new Error(`Transaction error: ${result.error}`);

  return result.hash;
}

export async function isNullifierClaimed(contractId: string, nullifier: bigint): Promise<boolean> {
  const contract = new Contract(contractId);
  const serv = getServer();
  const account = await serv.getAccount(contractId);

  const tx = new TransactionBuilder(account, {
    fee: FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('is_claimed', nativeToScVal(nullifier, { type: 'u256' })))
    .setTimeout(30)
    .build();

  const result: any = await serv.simulateTransaction(tx);
  return result.result?.retval === true;
}

export async function getContractRoot(contractId: string): Promise<string | null> {
  const contract = new Contract(contractId);
  const serv = getServer();
  const account = await serv.getAccount(contractId);

  const tx = new TransactionBuilder(account, {
    fee: FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('root'))
    .setTimeout(30)
    .build();

  const result: any = await serv.simulateTransaction(tx);
  if (!result.result?.retval) return null;
  const bytes = result.result.retval as number[];
  return '0x' + Buffer.from(bytes).toString('hex');
}
