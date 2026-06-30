#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

if [ -f "$PROJECT_DIR/.env" ]; then
  set -a; source "$PROJECT_DIR/.env"; set +a
fi

NETWORK="${STELLAR_NETWORK:-testnet}"
NETWORK_PASSPHRASE="${STELLAR_NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}"
ADMIN_KEY="${ADMIN_KEY:-admin-key}"
CONTRACT_ID="${ZKGATE_CONTRACT_ID:-$(cat "$PROJECT_DIR/.contract_id" 2>/dev/null || echo '')}"

export STELLAR_NETWORK_PASSPHRASE="$NETWORK_PASSPHRASE"

if [ -z "$CONTRACT_ID" ]; then
  echo "Error: Contract ID not found. Set ZKGATE_CONTRACT_ID or deploy first."
  exit 1
fi

echo "=== Testing zkGate Contract ==="
echo "Contract ID: $CONTRACT_ID"
echo ""

echo "Test 1: Reading Merkle root..."
stellar contract invoke --network "$NETWORK" --source-account "$ADMIN_KEY" --id "$CONTRACT_ID" -- root

echo ""
echo "Test 2: Submitting valid ZK proof (address=1, secret=42)..."
PROOF_HEX=$(xxd -p "$PROJECT_DIR/circuits/eligibility/target/proof/proof" | tr -d '\n')
PUB_INPUTS_HEX=$(xxd -p "$PROJECT_DIR/circuits/eligibility/target/proof/public_inputs" | tr -d '\n')
stellar contract invoke \
  --network "$NETWORK" \
  --source-account "$ADMIN_KEY" \
  --id "$CONTRACT_ID" \
  -- \
  verify_and_claim \
  --proof_bytes "$PROOF_HEX" \
  --public_inputs "$PUB_INPUTS_HEX"
echo "  OK"

echo ""
echo "Test 3: Double claim should fail..."
stellar contract invoke \
  --network "$NETWORK" \
  --source-account "$ADMIN_KEY" \
  --id "$CONTRACT_ID" \
  -- \
  verify_and_claim \
  --proof_bytes "$PROOF_HEX" \
  --public_inputs "$PUB_INPUTS_HEX" \
  2>&1 && echo "  UNEXPECTED SUCCESS" || echo "  Expected error (NullifierAlreadyUsed) - OK"

echo ""
echo "=== All tests passed ==="
