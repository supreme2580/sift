import { isConnected, getPublicKey, signTransaction } from '@stellar/freighter-api';
import { rpc, Contract, TransactionBuilder, Networks, nativeToScVal, xdr } from '@stellar/stellar-sdk';

const RPC_URL = import.meta.env.VITE_STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org';
const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID || 'CCTT4PCB7DUJWG62EKMZNLVRUVBLQRVNWL4ETEACUT6DTBRQVJEYKSYX';
const NETWORK = import.meta.env.VITE_STELLAR_NETWORK || 'TESTNET';
const NETWORK_PASSPHRASE = import.meta.env.VITE_STELLAR_NETWORK_PASSPHRASE || (NETWORK === 'PUBLIC' ? Networks.PUBLIC : Networks.TESTNET);

let _server: rpc.Server | null = null;
function server(): rpc.Server {
  if (!_server) _server = new rpc.Server(RPC_URL);
  return _server;
}

export async function connectWallet(): Promise<string> {
  const connected = await isConnected();
  if (!connected) throw new Error('Freighter not installed or not connected');
  return await getPublicKey();
}

export async function submitClaim(
  publicKey: string,
  proofBytes: Uint8Array,
  publicInputsBytes: Uint8Array,
): Promise<string> {
  const contract = new Contract(CONTRACT_ID);
  const account = await server().getAccount(publicKey);

  const tx = new TransactionBuilder(account, {
    fee: '100000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'verify_and_claim',
        nativeToScVal(proofBytes, { type: 'bytes' }),
        nativeToScVal(publicInputsBytes, { type: 'bytes' }),
      ),
    )
    .setTimeout(30)
    .build();

  const simulation = await server().simulateTransaction(tx);
  if (simulation.error) throw new Error(`Simulation error: ${simulation.error}`);

  const assembled = rpc.assembleTransaction(tx, simulation);
  const signedXdr = await signTransaction(assembled.toEnvelope().toXDR('base64'), {
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  const result = await server().sendTransaction(signedXdr);
  if (result.error) throw new Error(result.error);

  return result.hash;
}

export async function isClaimed(nullifier: bigint): Promise<boolean> {
  const contract = new Contract(CONTRACT_ID);
  const result = await server().simulateTransaction(
    new TransactionBuilder(await server().getAccount(CONTRACT_ID), {
      fee: '100000',
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call('is_claimed', nativeToScVal(nullifier, { type: 'u256' })))
      .setTimeout(30)
      .build(),
  );
  return result.result?.retval === true;
}
