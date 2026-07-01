# @supreme2580/zkauth

Zero-knowledge identity and private transactions on Stellar. Users prove identity without revealing their wallet address — deposits and withdrawals are authorized by ZK proofs rather than an on-chain address.

> **Security disclosure:** Identity secret = `SHA256(raw private key)` from Privy. The raw private key is exported by Privy, hashed once, and never stored. The hash is cached in `sessionStorage` (cleared when the tab closes). The hash alone cannot sign transactions — it only proves knowledge of the private key via the circuit.

## Installation

```bash
npm install @supreme2580/zkauth
```

Peer dependencies (install these too):

```bash
npm install react @privy-io/react-auth @stellar/stellar-sdk
```

> The SDK bundles `@aztec/bb.js` and `@noir-lang/noir_js` internally — you don't need to install them.

## Quick Start

Wrap your app root with `ZkAuthProvider`, then use `ZkAuthButton` anywhere:

```tsx
// app/providers.tsx
'use client';
import { ZkAuthProvider } from '@supreme2580/zkauth';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ZkAuthProvider appId="your_privy_app_id">
      {children}
    </ZkAuthProvider>
  );
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

That's it. The button handles the full flow: Privy login → identity derivation → deposit modal → withdraw modal with ZK proof generation.

## Without Privy (raw private key)

```tsx
import { ZkAuthButton } from '@supreme2580/zkauth';

// Pass a Stellar private key directly — Privy is not required
<ZkAuthButton privateKey={new Uint8Array([...])} />
```

Or using the hook directly:

```tsx
const { connect, disconnect, balance, connected } = useZkAuth({ privateKey: myKey });
await connect();
```

## API

### `ZkAuthProvider`

Wraps `PrivyProvider` internally. Must be at the app root.

| Prop    | Type     | Description          |
| ------- | -------- | -------------------- |
| `appId` | `string` | Privy application ID |
| `children` | `ReactNode` | Child components |

### `ZkAuthButton`

Full-featured button: connect via Privy → deposit modal → withdraw modal with ZK proof.

| Prop          | Type            | Description                          |
| ------------- | --------------- | ------------------------------------ |
| `privateKey`  | `Uint8Array`    | (optional) Skip Privy, use raw key   |

### `useZkAuth`

```ts
const { connected, privyUser, secret, balance, deposits, connect, disconnect, login } = useZkAuth(options?);
```

| Option        | Type            | Description                          |
| ------------- | --------------- | ------------------------------------ |
| `privateKey`  | `Uint8Array`    | (optional) Skip Privy, use raw key   |

### Low-level identity functions

```ts
import { computeCommitment, computeNullifier, generateProof, bytesToHex } from '@supreme2580/zkauth';

const secret = new Uint8Array(32); // SHA256 hash of private key
const nonce = crypto.getRandomValues(new Uint8Array(32)); // random per deposit
const commitment = await computeCommitment(secret, nonce);
const nullifier = await computeNullifier(commitment, secret, nonce);
const proof = await generateProof(commitment, nullifier, secret, nonce);
```

### Contract interactions

```ts
import { submitDeposit, submitAuth, checkNullifierUsed, checkCommitmentExists } from '@supreme2580/zkauth';

// Deposit XLM with commitment
const tx = await submitDeposit(burnerSecret, commitment, amountInStroops);

// Withdraw XLM with ZK proof
const tx = await submitAuth(proof, publicInputs, recipientAddress, feePayerSecret);
```

## How It Works

1. **Identity derivation:** `Privy.exportPrivateKey()` → raw key → `SHA256(rawKey)` → 32-byte secret. The raw key is never stored; the hash is cached in `sessionStorage`.
2. **Deposit:** A burner wallet is generated. You send XLM to it. Once received, a commitment `pedersen(secret, nonce)` is recorded on-chain.
3. **Withdraw:** A ZK proof proves you know the secret for a commitment without revealing it. The nullifier prevents double-spending. The contract sends XLM to any recipient address.
4. **Nonce:** Each deposit uses a fresh random 32-byte nonce, producing unique `(commitment, nullifier)` pairs. Multiple deposits/withdrawals per identity are supported.
5. **No linkability:** The same identity produces different commitments/nullifiers each time. No on-chain address is tied to the user.

## Configuration

Set environment variables or configure the contract client:

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
