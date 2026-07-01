# zkAuth

**Private balance on Stellar.** Deposit XLM with a commitment, withdraw to any address with a zero-knowledge proof. The zkPay contract acts as a pool — no on-chain link between deposit and withdrawal.

- **Seed phrase → identity**: SHA256 hash, memory only, recoverable anywhere
- **Deterministic Stellar account**: same seed = same address every time
- **Zero-knowledge proofs**: UltraHonk (via Barretenberg) verified on-chain
- **No backend, no DB, no setup**: everything runs in the browser

## How it works

```
Seed phrase → SHA256 → identity secret (never stored)
  → compute commitment = pedersen(secret, nonce)
  → derive Stellar keypair (deterministic)

1. Fund your identity address with XLM
2. Deposit: atomic tx → contract records balance under your commitment
3. Withdraw: generate ZK proof → contract verifies → sends XLM to any address
```

```
Connect (password) → identity account derived (deterministic)
                           |
              ┌────────────┴────────────┐
              ▼                         ▼
      balance < 1 XLM           balance ≥ 1 XLM
              |                         |
              ▼                         ▼
   [Activate Account]           [Deposit / Withdraw]
   Shows identity address       ┌────────┴────────┐
   "Send ≥ 2 XLM"               ▼                  ▼
   (1 min balance           [Deposit]         [Withdraw]
   + 1 for fees)            enter amount       enter amount
              |             single atomic      + recipient
         poll balance       tx: transfer       generate proof
              |             + zkPay.deposit    submitWithdraw
     when ≥ 1 XLM →                             (identity pays fee)
     becomes "Deposit"

- Identity account is derived from password (deterministic)
- Address is only shown to user during activation
- After activation, everything happens behind the scenes
- No burner wallets, no address management
```

The circuit proves you know the secret for a given commitment without revealing it. Each proof consumes a nullifier (double-spend protection).

## Demo

```bash
pnpm install
cd demo && pnpm dev
```

1. Click "Connect with zkAuth" → enter a password
2. Copy your identity address, send XLM to it
3. Click "Deposit" — the SDK detects the payment and records it on-chain
4. Click "Withdraw" — generates a ZK proof, submits to contract, XLM is sent to your chosen address

## Architecture

```
Browser                          Soroban Testnet
┌─────────────────────┐          ┌──────────────────┐
│  @supreme2580/zkauth │          │   zkPay contract  │
│                     │          │                   │
│  deriveSecret       │   tx     │  deposit(comm,amt)│
│  computeCommitment  │────────► │  withdraw(proof,  │
│  generateProof      │          │    inputs, recip) │
│  submitDeposit      │◄──────── │                   │
│  submitWithdraw     │   events │                   │
└─────────────────────┘          └──────────────────┘
        │                              │
        │  POST /api/prove              │  native_token
        ▼                              ▼
   bb (UltraHonk)              XLM Pool
```

## Packages

| Package | Location |
|---|---|
| `@supreme2580/zkauth` | `packages/sdk/` |
| `demo` | `demo/` |

## Contract

```bash
cd contracts/zkpay
cargo build --target wasm32v1-none --release

# Deploy (VK in hex)
stellar contract deploy \
  --wasm target/wasm32v1-none/release/zkpay.wasm \
  --source admin \
  --network testnet \
  --network-passphrase "Test SDF Network ; September 2015" \
  -- \
  --vk-bytes "$(xxd -p packages/sdk/circuits/vk.bin | tr -d '\n')" \
  --native-token CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
```

## Circuit

```bash
cd circuits/zkpay && nargo compile
```

The circuit proves: `pedersen(secret, nonce) = commitment` AND `pedersen(commitment, secret, nonce) = nullifier`.

## SDK Build

```bash
cd packages/sdk
pnpm build
```

## Contract Interface

| Function | Params | Description |
|---|---|---|
| `deposit` | `commitment, amount` | Record balance under a commitment |
| `withdraw` | `proof, public_inputs, recipient` | Verify ZK proof, send balance to recipient |
| `commitment_exists` | `commitment` | Check if commitment has a deposit |
| `nullifier_used` | `nullifier` | Check if nullifier was already consumed |

## License

MIT
