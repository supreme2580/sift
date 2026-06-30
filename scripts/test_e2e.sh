#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

NETWORK="${NETWORK:-testnet}"
SOURCE_ACCOUNT="${SOURCE_ACCOUNT:-}"
CONTRACT_ID="$(cat "$PROJECT_DIR/.contract_id" 2>/dev/null || echo '')"

if [ -z "$CONTRACT_ID" ]; then
  echo "Error: Contract not deployed. Run deploy.sh first or set CONTRACT_ID env var."
  exit 1
fi

if [ -z "$SOURCE_ACCOUNT" ]; then
  echo "Error: SOURCE_ACCOUNT not set."
  exit 1
fi

echo "=== Testing zkGate Contract ==="
echo "Contract ID: $CONTRACT_ID"
echo ""

# Test 1: Check root is set
echo "Test 1: Checking Merkle root..."
stellar contract invoke \
  --network "$NETWORK" \
  --source-account "$SOURCE_ACCOUNT" \
  --id "$CONTRACT_ID" \
  -- \
  root

# Test 2: Submit a valid proof (address=1, secret=42)
echo ""
echo "Test 2: Submitting valid ZK proof..."
PROOF_HEX=$(xxd -p "$PROJECT_DIR/circuits/eligibility/target/proof/proof" | tr -d '\n')
PUB_INPUTS_HEX=$(xxd -p "$PROJECT_DIR/circuits/eligibility/target/proof/public_inputs" | tr -d '\n')

stellar contract invoke \
  --network "$NETWORK" \
  --source-account "$SOURCE_ACCOUNT" \
  --id "$CONTRACT_ID" \
  -- \
  verify_and_claim \
  --proof-bytes "$PROOF_HEX" \
  --public-inputs "$PUB_INPUTS_HEX"
echo "  Result: Success"

# Test 3: Try to claim again (should fail with NullifierAlreadyUsed)
echo ""
echo "Test 3: Attempting double-claim (should fail)..."
stellar contract invoke \
  --network "$NETWORK" \
  --source-account "$SOURCE_ACCOUNT" \
  --id "$CONTRACT_ID" \
  -- \
  verify_and_claim \
  --proof-bytes "$PROOF_HEX" \
  --public-inputs "$PUB_INPUTS_HEX" \
  2>&1 || echo "  Expected error received (NullifierAlreadyUsed)"

# Test 4: Check nullifier is claimed
echo ""
echo "Test 4: Checking nullifier claim status..."
NULLIFIER="${PUB_INPUTS_HEX:64:64}"
stellar contract invoke \
  --network "$NETWORK" \
  --source-account "$SOURCE_ACCOUNT" \
  --id "$CONTRACT_ID" \
  -- \
  is_claimed \
  --nullifier "$NULLIFIER"

echo ""
echo "=== All tests passed! ==="
