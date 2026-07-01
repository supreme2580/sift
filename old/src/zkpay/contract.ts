import { rpc, TransactionBuilder, Contract, xdr, Keypair, Address, nativeToScVal } from '@stellar/stellar-sdk';
import { getContractConfig } from './config.js';

export { getContractConfig } from './config.js';

const FRIENDBOT_URL = 'https://friendbot.stellar.org';

async function createFundedKeypair(): Promise<Keypair> {
  const kp = Keypair.random();
  const resp = await fetch(`${FRIENDBOT_URL}?addr=${kp.publicKey()}`, { method: 'POST' });
  if (!resp.ok) throw new Error(`Friendbot funding failed: ${resp.status}`);
  return kp;
}

async function sendTxWithEphemeral(
  buildOp: (contract: Contract) => xdr.Operation,
  config: ReturnType<typeof getContractConfig>,
) {
  const server = new rpc.Server(config.rpcUrl);
  const contract = new Contract(config.contractId);
  const signer = await createFundedKeypair();

  const account = await server.getAccount(signer.publicKey());
  const tx = new TransactionBuilder(account, {
    fee: '1000',
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(buildOp(contract))
    .setTimeout(30)
    .build();

  tx.sign(signer);
  return server.sendTransaction(tx);
}

export async function submitDeposit(commitment: Uint8Array, amount: bigint) {
  const config = getContractConfig();
  return sendTxWithEphemeral(
    (contract) => contract.call('deposit',
      xdr.ScVal.scvBytes(commitment),
      nativeToScVal(amount, { type: 'i128' }),
    ),
    config,
  );
}

export async function submitAuth(proof: Uint8Array, publicInputs: Uint8Array, recipient: string) {
  const config = getContractConfig();
  const recipientAddr = Address.fromString(recipient);
  return sendTxWithEphemeral(
    (contract) => contract.call('auth',
      xdr.ScVal.scvBytes(proof),
      xdr.ScVal.scvBytes(publicInputs),
      xdr.ScVal.scvAddress(recipientAddr.toScAddress()),
    ),
    config,
  );
}

export async function checkNullifierUsed(nullifier: Uint8Array): Promise<boolean> {
  const config = getContractConfig();
  try {
    const server = new rpc.Server(config.rpcUrl);
    const contract = new Contract(config.contractId);
    const simTx = new TransactionBuilder(undefined as any, {
      fee: '100',
      networkPassphrase: config.networkPassphrase,
    })
      .addOperation(contract.call('nullifier_used', xdr.ScVal.scvBytes(nullifier)))
      .build();

    const result = await server.simulateTransaction(simTx);
    const val = (result as any)?.result?.[0]?.value === true;
    return val;
  } catch { return false; }
}

export async function checkCommitmentExists(commitment: Uint8Array): Promise<boolean> {
  const config = getContractConfig();
  try {
    const server = new rpc.Server(config.rpcUrl);
    const contract = new Contract(config.contractId);
    const simTx = new TransactionBuilder(undefined as any, {
      fee: '100',
      networkPassphrase: config.networkPassphrase,
    })
      .addOperation(contract.call('commitment_exists', xdr.ScVal.scvBytes(commitment)))
      .build();

    const result = await server.simulateTransaction(simTx);
    const val = (result as any)?.result?.[0]?.value === true;
    return val;
  } catch { return false; }
}
