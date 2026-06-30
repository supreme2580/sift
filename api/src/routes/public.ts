import { Router, type Router as RouterType } from 'express';
import { getDb } from '../db.js';
import { buildTree } from '../merkle.js';

export const publicRouter: RouterType = Router();

publicRouter.get('/allowlists', (_req: any, res: any) => {
  const db = getDb();
  const lists = db.prepare(
    'SELECT id, name, description, merkle_root, contract_id, status, entry_count, created_at FROM allowlists ORDER BY created_at DESC'
  ).all();
  res.json(lists);
});

publicRouter.get('/allowlists/:id', (req: any, res: any) => {
  const db = getDb();
  const list = db.prepare(
    'SELECT id, name, description, merkle_root, contract_id, status, entry_count, created_at FROM allowlists WHERE id = ?'
  ).get(req.params.id);
  if (!list) return res.status(404).json({ error: 'Not found' });
  res.json(list);
});

publicRouter.post('/allowlists/:id/proof', async (req: any, res: any) => {
  const { address_index, secret } = req.body;
  if (address_index === undefined || !secret)
    return res.status(400).json({ error: 'address_index and secret required' });

  const db = getDb();
  const list = db.prepare('SELECT * FROM allowlists WHERE id = ?').get(req.params.id) as any;
  if (!list) return res.status(404).json({ error: 'Not found' });
  if (list.status !== 'finalized') return res.status(400).json({ error: 'Allowlist not yet finalized' });

  const entry = db.prepare('SELECT * FROM entries WHERE allowlist_id = ? AND address_index = ? AND secret = ?')
    .get(req.params.id, address_index, String(secret)) as any;
  if (!entry) return res.status(403).json({ error: 'Invalid credentials' });

  const entries = db.prepare('SELECT address_index, secret FROM entries WHERE allowlist_id = ? ORDER BY address_index')
    .all(req.params.id) as any[];

  try {
    const tree = await buildTree(entries.map((e: any) => ({ addressIndex: e.address_index, secret: e.secret })));
    const proof = tree.getProof(address_index, String(secret));

    if (!proof) return res.status(403).json({ error: 'Proof generation failed' });

    res.json({
      root: proof.root.toString(),
      leaf: proof.leaf.toString(),
      path: proof.path.map(p => p.toString()),
      index: proof.index,
      merkle_root: list.merkle_root,
      contract_id: list.contract_id,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
