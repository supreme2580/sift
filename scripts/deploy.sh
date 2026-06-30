#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

NETWORK="${NETWORK:-testnet}"
RPC_URL="${RPC_URL:-https://soroban-testnet.stellar.org}"
SOURCE_ACCOUNT="${SOURCE_ACCOUNT:-}"
CONTRACT_WASM="$PROJECT_DIR/target/wasm32v1-none/release/zkgate.wasm"
VK_FILE="$PROJECT_DIR/circuits/eligibility/target/proof/vk"

if [ ! -f "$CONTRACT_WASM" ]; then
  echo "Error: Contract WASM not found at $CONTRACT_WASM"
  echo "Build it first with: cd $PROJECT_DIR && cargo build -p zkgate --target wasm32v1-none --release"
  exit 1
fi

if [ ! -f "$VK_FILE" ]; then
  echo "Error: Verification key not found at $VK_FILE"
  echo "Generate it first with: bb write_vk_ultra_keccak_honk ..."
  exit 1
fi

if [ -z "$SOURCE_ACCOUNT" ]; then
  echo "Error: SOURCE_ACCOUNT not set"
  echo "Usage: SOURCE_ACCOUNT=<your-stellar-address> ./scripts/deploy.sh"
  exit 1
fi

echo "=== zkGate Deployment ==="
echo "Network: $NETWORK"
echo "Source: $SOURCE_ACCOUNT"
echo "WASM: $CONTRACT_WASM"
echo ""

# Step 1: Install the contract
echo "Step 1: Installing contract..."
WASM_HASH=$(stellar contract install \
  --network "$NETWORK" \
  --source-account "$SOURCE_ACCOUNT" \
  --wasm "$CONTRACT_WASM" \
  2>&1 | tail -1)
echo "  WASM hash: $WASM_HASH"

# Step 2: Deploy the contract
echo "Step 2: Deploying contract..."
CONTRACT_ID=$(stellar contract deploy \
  --network "$NETWORK" \
  --source-account "$SOURCE_ACCOUNT" \
  --wasm-hash "$WASM_HASH" \
  2>&1 | tail -1)
echo "  Contract ID: $CONTRACT_ID"
echo "$CONTRACT_ID" > "$PROJECT_DIR/.contract_id"

# Step 3: Initialize with verification key
echo "Step 3: Initializing contract with VK..."
VK_HEX=$(xxd -p "$VK_FILE" | tr -d '\n')
stellar contract invoke \
  --network "$NETWORK" \
  --source-account "$SOURCE_ACCOUNT" \
  --id "$CONTRACT_ID" \
  -- \
  __constructor \
  --vk-bytes "$VK_HEX"
echo "  VK initialized."

# Step 4: Compute and set Merkle root
echo "Step 4: Computing and setting Merkle root..."
# Use Node.js to compute the root
MERKLE_ROOT=$(node -e "
const { BarretenbergSync, Fr } = require('@aztec/bb.js');
(async () => {
  const api = await BarretenbergSync.initSingleton();
  const hash = (l, r) => {
    const h = api.pedersenHash([new Fr(BigInt(l)), new Fr(BigInt(r))], 0);
    return BigInt(h.toString());
  };
  const addrs = Array.from({length: 16}, (_, i) => [i, i === 1 ? 42 : 0]);
  const leaves = await Promise.all(addrs.map(([a, s]) => hash(a, s)));
  let lv = leaves;
  for (let h = 0; h < 4; h++) {
    const nxt = [];
    for (let i = 0; i < lv.length; i += 2) nxt.push(await hash(Number(lv[i]), Number(lv[i+1])));
    lv = nxt;
  }
  const root = lv[0];
  console.log(root.toString(16).padStart(64, '0'));
})();
" 2>/dev/null)
echo "  Merkle root: 0x$MERKLE_ROOT"

stellar contract invoke \
  --network "$NETWORK" \
  --source-account "$SOURCE_ACCOUNT" \
  --id "$CONTRACT_ID" \
  -- \
  set_root \
  --root "0x$MERKLE_ROOT"
echo "  Root set successfully."

# Step 5: Verify deployment
echo ""
echo "=== Deployment Complete ==="
echo "Contract ID: $CONTRACT_ID"
echo ""
echo "To verify the contract is working:"
echo "  stellar contract invoke \\"
echo "    --network $NETWORK \\"
echo "    --source-account $SOURCE_ACCOUNT \\"
echo "    --id $CONTRACT_ID \\"
echo "    -- \\"
echo "    root"
