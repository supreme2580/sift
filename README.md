# zkGate

Zero-Knowledge Private Allowlist Verification on Stellar.

Prove you're on an allowlist (airdrops, NFT mints, gated tokens) without revealing which address you are. Built with Noir, UltraHonk, and Soroban.

## How It Works

```
Operator                         Client
   │                               │
   ├─ Create allowlist ─────────── │
   ├─ Add entries (addr + secret)  │
   ├─ Finalize (compute Merkle     │
   │  root, deploy to Soroban)     │
   │                               │
   │            ───────────────────│─ Pick allowlist
   │            Enter addr+secret ─│
   │            ───────────────────│─ Get Merkle proof from API
   │                               ├─ Generate ZK proof (in-browser)
   │                               ├─ Submit claim → Soroban
   │                               │
   │                               │  ✓ Identity stays private
   │                               │  ✓ Only root + nullifier public
```

## Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│    Frontend      │────▶│    API Server    │────▶│    Soroban       │
│  Vite + React    │     │  Express + SQLite│     │  Contract (Rust) │
│  Privy Wallet    │     │  bb.js Merkle    │     │  UltraHonk Verify│
│  bb.js ZK Proof  │     │  Stellar SDK     │     │  Pedersen Hash   │
└──────────────────┘     └──────────────────┘     └──────────────────┘
        │                       │
        │   @privy-io/react-auth (Google/Discord/Email login)
        │   @aztec/bb.js (UltraHonk proofs + Merkle in-browser)
```

### Components

| Component | Path | Description |
|-----------|------|-------------|
| **Circuit** | `circuits/eligibility/` | Noir circuit: Merkle membership (depth 4) + nullifier |
| **Contract** | `contracts/zkgate/` | Soroban contract: `verify_and_claim`, `set_root`, `is_claimed` |
| **API Server** | `api/` | Express + SQLite + bb.js: manage allowlists, compute Merkle trees, serve proofs |
| **Frontend** | `frontend/` | Vite + React + Privy: admin panel + client flow + in-browser ZK proofs |
| **UltraHonk Verifier** | `crates/ultrahonk-soroban-verifier/` | Rust UltraHonk verification for Soroban |

## Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [pnpm](https://pnpm.io/) 11+
- [mkcert](https://github.com/FiloSottile/mkcert) (for local HTTPS)

## How Secrets Work (String → Field)

zkGate secrets are arbitrary strings. Since the Noir circuit operates on `Field` (big integer) values, both the API and frontend use a `secretToField` helper to convert:

| Input | Output |
|-------|--------|
| `"42"` (numeric string) | `42n` — parsed directly as a bigint |
| `"alice_secret_2024"` (text) | BigInt from UTF‑8 bytes, MSB-first |

This way, operators can use human-readable secrets (passphrases, email addresses, nicknames) and the Merkle tree + circuit handle them uniformly as field elements.

## Merkle Tree

The Noir circuit uses a fixed Merkle depth of 4 (up to 16 leaves). The API (`api/src/merkle.ts`) builds the tree at that depth, padding unused leaves with zero. The proof path always contains exactly 4 sibling hashes and 4 direction bits.

Pedersen hashing is done via `@aztec/bb.js` (Barretenberg), the same WASM library used for UltraHonk proof generation. This ensures hash consistency between the API, the frontend, and the Noir circuit.

## Quick Start

### 1. Start the API

```bash
cd api
pnpm install
pnpm dev
# → http://localhost:3001
```

### 2. Start the Frontend

```bash
cd frontend
pnpm install
pnpm dev
# → https://localhost:5173
```

### 3. Run the Full Demo Cycle

```bash
source .env && node examples/demo_full.mjs
```

This script demonstrates the complete lifecycle:

1. **Operator creates** an allowlist
2. **Operator adds** 8 entries with different secrets (strings and numbers)
3. **Operator finalizes** → Merkle tree computed via bb.js, root deployed to Soroban
4. **Client requests** a Merkle proof (index 5, secret `"42"`)
5. **Proof verified** locally using bb.js
6. **Invalid credentials** correctly rejected

## Full Lifecycle Guide

### For Operators (via Admin Panel)

1. Connect wallet → click **Admin** in the nav
2. **Create Allowlist** — example form values:

   | Field | Example Value |
   |-------|--------------|
   | **Name** | `Hackathon Allowlist` |
   | **Description** | `Private access for hackathon participants` |
   | **Contract ID** | `CCTT4PCB7DUJWG62EKMZNLVRUVBLQRVNWL4ETEACUT6DTBRQVJEYKSYX` |

3. **Add Entries** — paste one secret per line. Address indices are auto-assigned.

   ```
   secret_alice_2024
   secret_bob_2024
   secret_carol_2024
   42
   my_invite_code
   ```

   **What are secrets?** They are invitation codes or passwords chosen by you (the operator). You distribute them **outside the app** — e.g., email each participant their secret, DM them on Discord, or hand them out in person. Each participant needs their `(address_index, secret)` pair to prove they belong. Without the correct secret, nobody can generate a valid proof even if they know the address index.

4. **Finalize** — the API computes the Merkle tree and calls `set_root` on your Soroban contract. The allowlist is now live.

   > The status changes from **draft** → **finalized**. While in draft you can still add/remove entries; after finalization the root is on-chain and entries are locked.

### For Clients

1. Connect wallet via Privy (Google, Discord, Email, Telegram, etc.)
2. Select an allowlist from the list
3. Enter your **address index** and **secret** (received from the operator)
4. Generate ZK proof (in-browser via bb.js WASM)
5. Submit claim — the Soroban contract verifies the proof and marks the nullifier as claimed

### Via API Directly

**Create allowlist:**
```bash
curl -X POST http://localhost:3001/api/admin/allowlists \
  -H "Authorization: Bearer $ADMIN_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"My List","description":"For contributors","contract_id":"CCTT4PCB7DUJWG62EKMZNLVRUVBLQRVNWL4ETEACUT6DTBRQVJEYKSYX"}'
```

**Add entries:**
```bash
curl -X POST http://localhost:3001/api/admin/allowlists/<LIST_ID>/entries \
  -H "Authorization: Bearer $ADMIN_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"entries":[{"secret":"my_secret"},{"secret":"another_secret"}]}'
```

**Finalize:**
```bash
curl -X POST http://localhost:3001/api/admin/allowlists/<LIST_ID>/finalize \
  -H "Authorization: Bearer $ADMIN_SECRET_KEY"
```

**Get proof (public):**
```bash
curl -X POST http://localhost:3001/api/allowlists/<LIST_ID>/proof \
  -H "Content-Type: application/json" \
  -d '{"address_index":0,"secret":"my_secret"}'
```

## Deploying a Contract

```bash
# Build
cargo build -p zkgate --target wasm32v1-none --release

# Install (upload WASM)
stellar contract upload \
  --wasm target/wasm32v1-none/release/zkgate.wasm \
  --source-account $ADMIN_PUBLIC_KEY \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"

# Deploy (with verification key)
stellar contract deploy \
  --wasm-hash <HASH_FROM_UPLOAD> \
  --source-account $ADMIN_PUBLIC_KEY \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015" \
  -- \
  --vk-bytes-file circuits/eligibility/target/proof/vk

# Set VITE_CONTRACT_ID and ZKGATE_CONTRACT_ID in .env
```

## Deployed Contracts (Testnet)

| Contract | ID |
|----------|----|
| **zkGate** | `CCTT4PCB7DUJWG62EKMZNLVRUVBLQRVNWL4ETEACUT6DTBRQVJEYKSYX` |

## Environment Variables

Copy `.env.example` to `.env` and set:

| Variable | Description |
|----------|-------------|
| `ADMIN_SECRET_KEY` | Stellar secret key for admin operations |
| `ZKGATE_CONTRACT_ID` | Deployed Soroban contract ID |
| `PRIVY_APP_ID` | Privy app ID for wallet connections |
| `VITE_API_URL` | URL of the zkGate API |
| `VITE_ADMIN_API_TOKEN` | Same as `ADMIN_SECRET_KEY` (for frontend admin) |

## Demo Script

```bash
# Run the full lifecycle demo
source .env && node examples/demo_full.mjs

# Expected output:
#   ✅ Allowlist created
#   ✅ 8 entries added
#   ✅ Merkle root deployed to contract
#   ✅ Client proof generated and verified
#   ✅ Invalid credentials rejected
```

## License

MIT
