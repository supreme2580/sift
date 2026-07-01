# zkPay

**Private address on Stellar.** Deposit XLM, withdraw anonymously using zero-knowledge proofs.

- **Privacy**: Deposit via burner wallet → withdraw to any address with ZK proof — no link between them
- **Soroban contract**: UltraHonk proof verification on-chain
- **No backend, no DB**: Everything runs in the browser via `@zkpay/sdk`

## Quick start

```bash
# Install dependencies
cd packages/zkpay && npm install
cd ../../demo && npm install

# Start demo
npm run dev
```

## How it works

1. **Connect** — Login with Google/Discord/Email via Privy
2. **Deposit** — SDK generates a burner wallet, you send XLM to it, SDK deposits into the zkPay contract and records your commitment
3. **Withdraw** — SDK generates an UltraHonk proof that you know the secret for your commitment, submits to the contract, contract sends XLM to any address you choose

## Architecture

```
              ┌─────────────────┐
              │    zkPay SDK     │
              │  (@zkpay/sdk)    │
              │                  │
Privy ───────►│  derive secret   │
              │  compute hash    │
              │  generate proof  │──► bb.js (UltraHonk)
              │  submit tx       │──► Soroban contract
              └─────────────────┘

Soroban contract:
  deposit(commitment, amount)  → record commitment
  auth(proof, public_inputs, recipient) → verify proof, send XLM

Noir circuit (circuits/zkpay/):
  public:  commitment, nullifier
  private: secret
  proves:  hash(secret) == commitment
           hash(commitment, secret) == nullifier
```

## Contract

```bash
cd contracts/zkpay
cargo build --target wasm32-unknown-unknown --release
```

## Circuit

```bash
cd circuits/zkpay
nargo compile
```

## SDK

```bash
cd packages/zkpay
npm install
npm run build
```

## Deploy

```bash
# Set env vars
export STELLAR_RPC_URL=https://soroban-testnet.stellar.org
export STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"

# Build contract WASM
cd contracts/zkpay
cargo build --target wasm32v1-none --release

# Generate VK using the prove command (--write_vk outputs correct 1760-byte format)
cd ../..
bb prove -s ultra_honk --oracle_hash keccak \
  -b demo/public/circuit.json \
  -w <path-to-witness> \
  -o /tmp/vk \
  --write_vk

# Deploy + initialize in one step (hex-encode the VK)
stellar contract deploy \
  --wasm contracts/zkpay/target/wasm32v1-none/release/zkpay.wasm \
  --source admin-key \
  --network testnet \
  --network-passphrase "$STELLAR_NETWORK_PASSPHRASE" \
  --alias zkpay \
  -- \
  --vk-bytes "$(xxd -p /tmp/vk/vk | tr -d '\n')" \
  --native-token CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
```

## License

MIT
