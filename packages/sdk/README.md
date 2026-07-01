# @supreme2580/zkauth

Zero-knowledge identity and private transactions on Stellar. Users prove identity without revealing their wallet address — deposits and withdrawals are authorized by ZK proofs rather than an on-chain address.

> **Security disclosure:** Identity secret = `SHA256(seed phrase)`. The secret is held in memory only — never stored in localStorage, sessionStorage, or on any server. The secret alone cannot sign Stellar transactions; it only proves knowledge of the identity via the circuit.

## Installation

```bash
npm install @supreme2580/zkauth
```

Peer dependencies (install these too):

```bash
npm install react @stellar/stellar-sdk
```

> The SDK bundles `@aztec/bb.js` and `@noir-lang/noir_js` internally — you don't need to install them.

## Quick Start

```tsx
// app/providers.tsx
'use client';
import { ZkAuthProvider } from '@supreme2580/zkauth';

export function Providers({ children }: { children: React.ReactNode }) {
  return <ZkAuthProvider>{children}</ZkAuthProvider>;
}
```

```tsx
// app/page.tsx
'use client';
import { ZkAuthButton, useZkAuth } from '@supreme2580/zkauth';

function Balance() {
  const { balance, connected } = useZkAuth();
  if (!connected) return null;
  return <div>Balance: {Number(balance) / 1e7} XLM</div>;
}

export default function Page() {
  return (
    <div>
      <ZkAuthButton />
      <Balance />
    </div>
  );
}
```

No env vars, no API keys, no setup. Click the button, type a seed phrase, done.

## With a raw private key

```tsx
<ZkAuthButton privateKey={new Uint8Array([...])} />
```

## API

### `ZkAuthProvider`

No props required. Wraps the app to provide zkAuth state context.

### `ZkAuthButton`

| Prop          | Type            | Description                          |
| ------------- | --------------- | ------------------------------------ |
| `privateKey`  | `Uint8Array`    | (optional) Use raw key instead of seed phrase |

### `useZkAuth`

```ts
const { connected, secret, balance, deposits, connect, disconnect } = useZkAuth(options?);
```

| Option        | Type            | Description                          |
| ------------- | --------------- | ------------------------------------ |
| `privateKey`  | `Uint8Array`    | (optional) Use raw key instead of seed phrase |

### Low-level identity functions

```ts
import { computeCommitment, computeNullifier, generateProof, bytesToHex } from '@supreme2580/zkauth';

const secret = new Uint8Array(32); // SHA256 hash of seed phrase
const nonce = crypto.getRandomValues(new Uint8Array(32));
const commitment = await computeCommitment(secret, nonce);
const nullifier = await computeNullifier(commitment, secret, nonce);
const proof = await generateProof(commitment, nullifier, secret, nonce);
```

### Contract interactions

```ts
import { submitDeposit, submitWithdraw, checkNullifierUsed, checkCommitmentExists } from '@supreme2580/zkauth';

const tx = await submitDeposit(identitySecretKey, commitment, amountInStroops);
const tx = await submitWithdraw(proof, publicInputs, recipientAddress, feePayerSecret);
```

## How It Works

1. **Identity derivation:** User enters a seed phrase → `SHA256(seed)` → 32-byte secret (in memory only).
2. **Deposit:** A burner wallet is generated. You send XLM to it. Once received, a commitment is recorded on-chain.
3. **Withdraw:** A ZK proof proves you know the secret for a commitment without revealing it. The nullifier prevents double-spending.
4. **No linkability:** The same identity produces different commitments/nullifiers each time. No on-chain address is tied to the user.

## Configuration

| Variable | Description |
| -------- | ----------- |
| `NEXT_PUBLIC_RPC_URL` | Soroban RPC URL (default: testnet) |
| `NEXT_PUBLIC_CONTRACT_ID` | zkPay contract address |
| `NEXT_PUBLIC_NATIVE_TOKEN` | Native XLM token contract ID |

## Development

```bash
pnpm build        # TypeScript compile + copy circuit
pnpm compile-circuit  # Recompile Noir circuit
```

## License

Proprietary — see LICENSE file.
