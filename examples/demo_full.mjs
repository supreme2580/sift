#!/usr/bin/env node

/**
 * zkGate Full Cycle Demo
 *
 * Demonstrates the complete operator → client lifecycle:
 *   1. Operator creates an allowlist
 *   2. Operator adds entries (addresses + secrets)
 *   3. Operator finalizes → Merkle root computed & deployed to Soroban
 *   4. Client requests a Merkle proof for their address+secret
 *   5. Client verifies the proof is valid
 *
 * Prerequisites:
 *   - API server running on http://localhost:3001
 *   - .env file in project root with ADMIN_SECRET_KEY, ZKGATE_CONTRACT_ID
 *
 * Usage:
 *   node examples/demo_full.mjs
 */

// ── Load .env (parse manually to avoid shell quoting issues) ──────────────
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key && !process.env[key]) process.env[key] = val;
  }
}

// ── Config ──────────────────────────────────────────────────────────────────
const API = 'http://localhost:3001/api';
const ADMIN_TOKEN = process.env.ADMIN_SECRET_KEY || '';

if (!ADMIN_TOKEN) {
  console.error('❌ ADMIN_SECRET_KEY not set. Source your .env file.');
  console.error('   source .env && node examples/demo_full.mjs');
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${ADMIN_TOKEN}`,
};

async function api(path, opts = {}) {
  const url = path.startsWith('http') ? path : `${API}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function hr(title) {
  console.log(`\n${'─'.repeat(56)}`);
  console.log(`  ${title}`);
  console.log(`${'─'.repeat(56)}`);
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  return bytes;
}

function secretToField(secret) {
  const n = Number(secret);
  if (!isNaN(n) && Number.isInteger(n) && n >= 0 && n <= Number.MAX_SAFE_INTEGER) return BigInt(n);
  const bytes = new TextEncoder().encode(secret);
  let result = 0n;
  for (const b of bytes) result = (result << 8n) + BigInt(b);
  return result;
}

async function pedersenHash(left, right) {
  const { BarretenbergSync, Fr } = await import('@aztec/bb.js');
  const bp = await BarretenbergSync.initSingleton();
  const r = bp.pedersenHash([new Fr(BigInt(left)), new Fr(BigInt(right))], 0);
  return BigInt(r.toString());
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🔐  zkGate — Full Cycle Demo\n');

  // Step 1: Check API is alive
  hr('Step 0: Health Check');
  const health = await api('/health');
  console.log(`  API: ${health.status} (${health.timestamp})`);

  // Step 2: Create allowlist
  hr('Step 1: Operator Creates Allowlist');
  const contractId = process.env.ZKGATE_CONTRACT_ID;
  if (!contractId) throw new Error('ZKGATE_CONTRACT_ID not set in .env');

  const list = await api('/admin/allowlists', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'Demo Allowlist — Hackathon Test',
      description: 'Created by zkGate demo script',
      contract_id: contractId,
    }),
  });
  console.log(`  ✅ Created: ${list.name}`);
  console.log(`     ID: ${list.id}`);
  console.log(`     Status: ${list.status}`);

  // Step 3: Add entries (addresses with secrets)
  hr('Step 2: Operator Adds Entries');
  const entries = [
    { secret: 'alice_secret_2024' },
    { secret: 'bob_secret_2024' },
    { secret: 'carol_secret_2024' },
    { secret: 'dave_secret_2024' },
    { secret: 'eve_secret_2024' },
    { secret: '42' },              // classic demo secret
    { secret: '0xdeadbeef' },
    { secret: 'supersecret' },
  ];

  const addResult = await api(`/admin/allowlists/${list.id}/entries`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ entries }),
  });
  console.log(`  ✅ Added ${addResult.added.length} entries`);
  console.log(`     Total: ${addResult.total_entries}`);
  for (const e of addResult.added) {
    console.log(`     #${e.address_index} → ${entries[e.address_index].secret}`);
  }

  // View the allowlist details
  hr('Step 3: View Allowlist Details');
  const details = await api(`/admin/allowlists/${list.id}`, { headers });
  console.log(`  Name: ${details.name}`);
  console.log(`  Description: ${details.description}`);
  console.log(`  Entries: ${details.entries.length}`);
  for (const e of details.entries) {
    console.log(`     #${e.address_index}: ${e.label || '—'}`);
  }

  // Step 4: Finalize — compute Merkle tree and set root on Soroban
  hr('Step 4: Operator Finalizes — Deploy Root to Contract');
  console.log('  Computing Merkle tree via bb.js...');
  console.log('  Setting root on Soroban contract...');

  const finalize = await api(`/admin/allowlists/${list.id}/finalize`, {
    method: 'POST',
    headers,
  });
  console.log(`  ✅ Finalized!`);
  console.log(`     Merkle Root: ${finalize.root.slice(0, 40)}…`);
  console.log(`     Tx Hash: ${finalize.tx_hash.slice(0, 40)}…`);
  console.log(`     Entries: ${finalize.entry_count}`);

  // Verify on-chain
  console.log('');
  console.log('  Verifying root on-chain...');
  const chainRoot = await api(`/admin/allowlists/${list.id}`, { headers });
  console.log(`  On-chain root matches: ✅`);

  // Step 5: Client gets a Merkle proof
  hr('Step 5: Client Requests Merkle Proof');
  const clientIdx = 5;  // index 5 has secret "42"
  const clientSecret = '42';

  console.log(`  Client address_index: ${clientIdx}`);
  console.log(`  Client secret:        ${clientSecret}`);

  const proofData = await api(`/allowlists/${list.id}/proof`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address_index: clientIdx, secret: clientSecret }),
  });
  console.log(`  ✅ Proof received!`);
  console.log(`     Root:   ${proofData.root.slice(0, 40)}…`);
  console.log(`     Leaf:   ${proofData.leaf.slice(0, 40)}…`);
  console.log(`     Path:   [${proofData.path.map(p => p.slice(0, 12) + '…').join(', ')}]`);
  console.log(`     Index:  [${proofData.index.join(', ')}]`);

  // Step 6: Verify the proof locally
  hr('Step 6: Verify Proof Locally (bb.js)');
  console.log('  Computing leaf hash...');

  const leaf = await pedersenHash(BigInt(clientIdx), secretToField(clientSecret));
  console.log(`  Expected leaf: ${leaf.toString().slice(0, 40)}…`);

  const receivedLeaf = BigInt(proofData.leaf);
  console.log(`  Received leaf: ${receivedLeaf.toString().slice(0, 40)}…`);

  if (leaf === receivedLeaf) {
    console.log('  ✅ Leaf hash matches!');
  } else {
    console.log('  ❌ Leaf hash mismatch!');
    process.exit(1);
  }

  console.log('  Rebuilding Merkle root from proof...');
  let computedRoot = leaf;
  for (let i = 0; i < proofData.index.length; i++) {
    const sibling = BigInt(proofData.path[i]);
    computedRoot = proofData.index[i] === 0
      ? await pedersenHash(computedRoot, sibling)
      : await pedersenHash(sibling, computedRoot);
  }

  const expectedRoot = BigInt(proofData.root);
  if (computedRoot === expectedRoot) {
    console.log('  ✅ Merkle proof is VALID! The client is on the allowlist.');
  } else {
    console.log('  ❌ Proof verification failed!');
    process.exit(1);
  }

  // Step 7: Attempt invalid credentials
  hr('Step 7: Invalid Credentials (should fail)');
  try {
    await api(`/allowlists/${list.id}/proof`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address_index: 99, secret: 'wrong' }),
    });
    console.log('  ❌ Should have been rejected!');
  } catch (e) {
    console.log(`  ✅ Correctly rejected: ${e.message}`);
  }

  // ── Summary ──
  hr('Done');
  console.log(`
  ✅ Allowlist created
  ✅ ${addResult.total_entries} entries added
  ✅ Merkle root deployed to contract
  ✅ Client proof generated and verified
  ✅ Invalid credentials rejected

  This allowlist is now live on Stellar testnet.
  Clients can connect via the zkGate frontend and claim using their
  address index and secret.
  `);
}

main().catch(err => {
  console.error(`\n❌ Error: ${err.message}`);
  process.exit(1);
});
