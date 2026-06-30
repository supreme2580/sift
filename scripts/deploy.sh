#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env if present
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a; source "$PROJECT_DIR/.env"; set +a
fi

NETWORK="${STELLAR_NETWORK:-testnet}"
NETWORK_PASSPHRASE="${STELLAR_NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}"
ADMIN_KEY="${ADMIN_KEY:-admin-key}"
CONTRACT_WASM="$PROJECT_DIR/target/wasm32v1-none/release/zkgate.wasm"
VK_FILE="$PROJECT_DIR/circuits/eligibility/target/proof/vk"

if [ ! -f "$CONTRACT_WASM" ]; then
  echo "Error: Contract WASM not found. Build it first:"
  echo "  cargo build -p zkgate --target wasm32v1-none --release"
  exit 1
fi

if [ ! -f "$VK_FILE" ]; then
  echo "Error: Verification key not found. Generate it first:"
  echo "  bb write_vk_ultra_keccak_honk -b circuits/eligibility/target/eligibility.json -o circuits/eligibility/target/proof/vk"
  exit 1
fi

export STELLAR_NETWORK_PASSPHRASE="$NETWORK_PASSPHRASE"

echo "=== zkGate Deployment ==="
echo "Network: $NETWORK"
echo "Admin key: $ADMIN_KEY"
echo "WASM: $CONTRACT_WASM"
echo ""

# Step 1: Upload WASM
echo "Step 1: Uploading contract WASM..."
WASM_HASH=$(stellar contract upload \
  --network "$NETWORK" \
  --source-account "$ADMIN_KEY" \
  --wasm "$CONTRACT_WASM" \
  2>&1 | tail -1)
echo "  WASM hash: $WASM_HASH"

# Step 2: Deploy with constructor (VK bytes)
echo "Step 2: Deploying contract with VK initialization..."
CONTRACT_ID=$(stellar contract deploy \
  --network "$NETWORK" \
  --source-account "$ADMIN_KEY" \
  --wasm-hash "$WASM_HASH" \
  --alias zkgate \
  -- \
  --vk_bytes-file-path "$VK_FILE" \
  2>&1 | tail -1)
echo "  Contract ID: $CONTRACT_ID"
echo "$CONTRACT_ID" > "$PROJECT_DIR/.contract_id"

# Step 3: Compute and set Merkle root
echo "Step 3: Computing and setting Merkle root..."
MERKLE_ROOT=$(node -e "
const { BarretenbergSync, Fr } = require('@aztec/bb.js');
(async () => {
  const api = await BarretenbergSync.initSingleton();
  const h = (l, r) => { const x = api.pedersenHash([new Fr(BigInt(l)), new Fr(BigInt(r))], 0); return BigInt(x.toString()); };
  const addrs = Array.from({length: 16}, (_, i) => [i, i === 1 ? 42 : 0]);
  const leaves = await Promise.all(addrs.map(([a, s]) => h(a, s)));
  let lv = leaves;
  for (let i = 0; i < 4; i++) { const nx = []; for (let j = 0; j < lv.length; j+=2) nx.push(await h(Number(lv[j]), Number(lv[j+1]))); lv = nx; }
  console.log(lv[0].toString(16).padStart(64, '0'));
})();
" 2>/dev/null)
echo "  Merkle root: $MERKLE_ROOT"

stellar contract invoke \
  --network "$NETWORK" \
  --source-account "$ADMIN_KEY" \
  --id "$CONTRACT_ID" \
  -- \
  set_root \
  --root "$MERKLE_ROOT"
echo "  Root set."

# Step 4: Verify
echo ""
echo "=== Deployment Complete ==="
echo "Contract ID: $CONTRACT_ID"
echo ""
echo "Verify root:"
echo "  STELLAR_NETWORK_PASSPHRASE=\"$NETWORK_PASSPHRASE\" stellar contract invoke \\"
echo "    --network $NETWORK --source-account $ADMIN_KEY --id $CONTRACT_ID -- root"
echo ""
echo "Test claim:"
echo "  PROOF_HEX=\$(xxd -p $VK_FILE/../proof | tr -d '\\n')"
echo "  PUB_HEX=\$(xxd -p $VK_FILE/../public_inputs | tr -d '\\n')"
echo "  STELLAR_NETWORK_PASSPHRASE=\"$NETWORK_PASSPHRASE\" stellar contract invoke \\"
echo "    --network $NETWORK --source-account $ADMIN_KEY --id $CONTRACT_ID -- \\"
echo "    verify_and_claim --proof_bytes \\\$PROOF_HEX --public_inputs \\\$PUB_HEX"
