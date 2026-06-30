import { rpc, Contract, TransactionBuilder, nativeToScVal } from '@stellar/stellar-sdk';
import type { StellarSigner } from '../lib/stellar-context';

const RPC_URL = import.meta.env.VITE_STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org';
const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID || 'CCTT4PCB7DUJWG62EKMZNLVRUVBLQRVNWL4ETEACUT6DTBRQVJEYKSYX';
const NETWORK_PASSPHRASE = import.meta.env.VITE_STELLAR_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015';
const FEE = '100000';

let _server: rpc.Server | null = null;
function server(): rpc.Server {
  if (!_server) _server = new rpc.Server(RPC_URL);
  return _server;
}

export async function submitClaim(
  signer: StellarSigner,
  proofBytes: Uint8Array,
  publicInputsBytes: Uint8Array,
): Promise<string> {
  const contract = new Contract(CONTRACT_ID);
  const account = await server().getAccount(signer.address);

  const tx = new TransactionBuilder(account, {
    fee: FEE,
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
  const envelopeXdr = assembled.toEnvelope().toXDR('base64');
  const signedXdr = await signer.signTransaction(envelopeXdr);

  const result = await server().sendTransaction(signedXdr);
  if (result.error) throw new Error(result.error);

  return result.hash;
}

export async function isClaimed(nullifier: bigint): Promise<boolean> {
  const contract = new Contract(CONTRACT_ID);
  const result = await server().simulateTransaction(
    new TransactionBuilder(await server().getAccount(CONTRACT_ID), {
      fee: FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call('is_claimed', nativeToScVal(nullifier, { type: 'u256' })))
      .setTimeout(30)
      .build(),
  );
  return result.result?.retval === true;
}
