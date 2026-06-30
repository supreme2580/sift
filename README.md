# zkGate

Zero-Knowledge Private Allowlist Verification on Stellar.

Prove you're on an allowlist (for airdrops, NFT mints, gated tokens) without revealing which address you are. Built with Noir, UltraHonk, and Soroban.

## How It Works

1. **Admin** sets a Merkle root of all eligible addresses on-chain.
2. **User** proves they know a valid (address, secret) pair by generating a ZK proof.
3. **Soroban contract** verifies the UltraHonk proof on-chain and marks the nullifier as claimed.

The proof reveals only the Merkle root and nullifier — the user's specific address remains private.

## Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Frontend   │────▶│  Noir Circuit    │────▶│  Soroban Contract │
│  (React/Vite)│     │  (ZK Proof Gen)  │     │  (ZK Verification)│
└──────────────┘     └──────────────────┘     └──────────────────┘
       │                      │                        │
       │                      │                        │
   Freighter              bb.js WASM               Stellar
   Wallet              (in-browser proof)          Testnet
```

### Components

- **Circuit** (`circuits/eligibility/`): Noir circuit implementing Merkle membership proof with nullifier
- **Contract** (`contracts/zkgate/`): Soroban smart contract with `verify_and_claim`, `set_root`, `is_claimed`
- **UltraHonk Verifier** (`crates/ultrahonk-soroban-verifier/`): Rust implementation of UltraHonk verification for Soroban
- **Frontend** (`frontend/`): Vite + React + TypeScript with Freighter wallet integration

## Prerequisites

- [Nargo](https://noir-lang.org/) 1.0.0-beta.9
- [Barretenberg](https://github.com/AztecProtocol/barretenberg) (bb) 0.87.0
- [Rust](https://rustup.rs/) 1.92+ with `wasm32v1-none` target
- [Stellar CLI](https://developers.stellar.org/docs/tools/cli) 23.4.1
- [Node.js](https://nodejs.org/) 22+
- [pnpm](https://pnpm.io/) 11+
- [Docker](https://docker.com/) (for Stellar QuickStart)

## Quick Start

### 1. Build the Circuit

```bash
cd circuits/eligibility
nargo compile
nargo test
```

### 2. Generate Proof

```bash
# Generate Prover.toml with Merkle tree data
node scripts/generate_prover_data.mjs

# Execute circuit and generate witness
cd circuits/eligibility && nargo execute

# Generate UltraHonk proof (keccak oracle)
bb prove_ultra_keccak_honk \
  -b target/eligibility.json \
  -w target/eligibility.gz \
  -o target/proof/proof

# Write verification key
bb write_vk_ultra_keccak_honk \
  -b target/eligibility.json \
  -o target/proof/vk
```

### 3. Build the Contract

```bash
cargo build -p zkgate --target wasm32v1-none --release
```

### 4. Deploy

```bash
# Start Stellar testnet
docker run --rm -it -p 8000:8000 stellar/quickstart:v23.04.1 \
  --testnet --enable-soroban-rpc

# Deploy contract
export SOURCE_ACCOUNT=<your-public-key>
./scripts/deploy.sh

# Run tests
./scripts/test_e2e.sh
```

### 5. Start the Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

## Demo

For the hackathon demo, use address `1` with secret `42`:

1. Connect Freighter wallet
2. Select address `#1` and enter secret `42`
3. Click "Check Eligibility"
4. Generate or load a pre-generated proof
5. Submit the claim transaction

## License

MIT
