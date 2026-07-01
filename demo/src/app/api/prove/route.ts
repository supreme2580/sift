import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';

export async function POST(req: NextRequest) {
  const { witness } = await req.json();

  if (!witness || typeof witness !== 'string') {
    return NextResponse.json({ error: 'missing witness (base64)' }, { status: 400 });
  }

  const tmpDir = mkdtempSync('/tmp/zkpay-prove-');
  try {
    const witnessPath = join(tmpDir, 'witness.gz');
    writeFileSync(witnessPath, Buffer.from(witness, 'base64'));

    // Copy circuit to tmp dir so Next.js file watcher doesn't interfere with bb
    const circuitPath = join(process.cwd(), 'public', 'circuit.json');
    const circuitTmpPath = join(tmpDir, 'circuit.json');
    writeFileSync(circuitTmpPath, readFileSync(circuitPath));

    const outDir = join(tmpDir, 'out');
    const bbPath = '/Users/victoromorogbe/.bb/bb';

    execSync(
      `"${bbPath}" prove -s ultra_honk --oracle_hash keccak --write_vk -b "${circuitTmpPath}" -w "${witnessPath}" -o "${outDir}"`,
      { timeout: 300_000, stdio: 'pipe' },
    );

    const proof = readFileSync(join(outDir, 'proof'));
    const publicInputs = readFileSync(join(outDir, 'public_inputs'));

    return NextResponse.json({
      proof: proof.toString('base64'),
      publicInputs: publicInputs.toString('base64'),
    });
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}
