import { BarretenbergSync } from '@aztec/bb.js';
import { Fr } from '@aztec/bb.js';
import * as fs from 'fs';

async function main() {
  const api = await BarretenbergSync.initSingleton();

  function hash(left, right) {
    const leftFr = typeof left === 'string' ? new Fr(BigInt(left)) : new Fr(left);
    const rightFr = typeof right === 'string' ? new Fr(BigInt(right)) : new Fr(right);
    const result = api.pedersenHash([leftFr, rightFr], 0);
    const hex = result.toString().slice(2);
    return BigInt('0x' + hex);
  }

  const addresses = [
    [0n, 0n],
    [1n, 42n],
    [2n, 0n],
    [3n, 0n],
    [4n, 0n],
    [5n, 0n],
    [6n, 0n],
    [7n, 0n],
    [8n, 0n],
    [9n, 0n],
    [10n, 0n],
    [11n, 0n],
    [12n, 0n],
    [13n, 0n],
    [14n, 0n],
    [15n, 0n],
  ];

  const leaves = addresses.map(([addr, secret]) => hash(addr, secret));

  const n00 = hash(leaves[0], leaves[1]);
  const n01 = hash(leaves[2], leaves[3]);
  const n02 = hash(leaves[4], leaves[5]);
  const n03 = hash(leaves[6], leaves[7]);
  const n04 = hash(leaves[8], leaves[9]);
  const n05 = hash(leaves[10], leaves[11]);
  const n06 = hash(leaves[12], leaves[13]);
  const n07 = hash(leaves[14], leaves[15]);

  const n10 = hash(n00, n01);
  const n11 = hash(n02, n03);
  const n12 = hash(n04, n05);
  const n13 = hash(n06, n07);

  const n20 = hash(n10, n11);
  const n21 = hash(n12, n13);

  const root = hash(n20, n21);

  const path = [leaves[0], n01, n11, n21];
  const index = [1, 0, 0, 0];

  const nullifier = hash(leaves[1], 42n);

  const tomlContent = `merkle_root = "${root.toString()}"
nullifier = "${nullifier.toString()}"
address = "1"
secret = "42"
path = [${path.map(p => `"${p.toString()}"`).join(', ')}]
index = [${index.join(', ')}]
`;
  fs.writeFileSync('/Users/victoromorogbe/Documents/sift/circuits/eligibility/Prover.toml', tomlContent);
  console.log('Prover.toml written!');
  console.log(tomlContent);

  if (typeof api.destroy === 'function') api.destroy();
}

main().catch(console.error);
