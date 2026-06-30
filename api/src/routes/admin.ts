import { Router, type Router as RouterType } from 'express';
import { getDb } from '../db.js';
import { buildTree } from '../merkle.js';
import { setContractRoot, isNullifierClaimed } from '../stellar.js';
import { v4 as uuid } from 'uuid';

export const adminRouter: RouterType = Router();

const ADMIN_TOKEN = process.env.ADMIN_API_TOKEN || process.env.ADMIN_SECRET_KEY || '';
if (!ADMIN_TOKEN) console.warn('WARNING: ADMIN_API_TOKEN not set — admin routes are unauthenticated!');

function auth(req: any, res: any, next: any) {
  if (!ADMIN_TOKEN) return next();
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token !== ADMIN_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

adminRouter.use(auth);

adminRouter.post('/allowlists', (req: any, res: any) => {
  const { name, description, contract_id } = req.body;
  if (!name || !contract_id) return res.status(400).json({ error: 'name and contract_id required' });

  const db = getDb();
  const id = uuid();
  db.prepare('INSERT INTO allowlists (id, name, description, contract_id) VALUES (?, ?, ?, ?)').run(id, name, description || '', contract_id);
  res.json({ id, name, description, contract_id, status: 'draft' });
});

adminRouter.get('/allowlists', (_req: any, res: any) => {
  const db = getDb();
  const lists = db.prepare('SELECT * FROM allowlists ORDER BY created_at DESC').all();
  res.json(lists);
});

adminRouter.get('/allowlists/:id', (req: any, res: any) => {
  const db = getDb();
  const list = db.prepare('SELECT * FROM allowlists WHERE id = ?').get(req.params.id);
  if (!list) return res.status(404).json({ error: 'Not found' });

  const entries = db.prepare('SELECT id, address_index, label, created_at FROM entries WHERE allowlist_id = ? ORDER BY address_index').all(req.params.id);
  const claims = db.prepare('SELECT * FROM claims WHERE allowlist_id = ? ORDER BY claimed_at DESC').all(req.params.id);

  res.json({ ...list, entries, claims });
});

adminRouter.post('/allowlists/:id/entries', (req: any, res: any) => {
  const { entries } = req.body;
  if (!entries || !Array.isArray(entries) || entries.length === 0)
    return res.status(400).json({ error: 'entries array required' });

  const db = getDb();
  const list = db.prepare('SELECT * FROM allowlists WHERE id = ?').get(req.params.id) as any;
  if (!list) return res.status(404).json({ error: 'Not found' });
  if (list.status !== 'draft') return res.status(400).json({ error: 'Allowlist already finalized' });

  const insert = db.prepare('INSERT INTO entries (allowlist_id, address_index, label, secret) VALUES (?, ?, ?, ?)');
  const getMaxIdx = db.prepare('SELECT COALESCE(MAX(address_index), -1) as max_idx FROM entries WHERE allowlist_id = ?');

  const transaction = db.transaction(() => {
    let startIdx = (getMaxIdx.get(req.params.id) as any).max_idx + 1;
    const added: any[] = [];

    for (const e of entries) {
      insert.run(req.params.id, startIdx, e.label || '', String(e.secret));
      added.push({ address_index: startIdx, label: e.label || '' });
      startIdx++;
    }

    db.prepare('UPDATE allowlists SET entry_count = entry_count + ? WHERE id = ?').run(added.length, req.params.id);
    return added;
  });

  const added = transaction();
  const count = (db.prepare('SELECT COUNT(*) as c FROM entries WHERE allowlist_id = ?').get(req.params.id) as any).c;
  res.json({ added, total_entries: count });
});

adminRouter.delete('/allowlists/:id/entries/:entryId', (req: any, res: any) => {
  const db = getDb();
  const list = db.prepare('SELECT * FROM allowlists WHERE id = ?').get(req.params.id) as any;
  if (!list) return res.status(404).json({ error: 'Not found' });
  if (list.status !== 'draft') return res.status(400).json({ error: 'Allowlist already finalized' });

  const result = db.prepare('DELETE FROM entries WHERE id = ? AND allowlist_id = ?').run(req.params.entryId, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Entry not found' });

  db.prepare('UPDATE allowlists SET entry_count = entry_count - 1 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

adminRouter.post('/allowlists/:id/finalize', async (req: any, res: any) => {
  const db = getDb();
  const list = db.prepare('SELECT * FROM allowlists WHERE id = ?').get(req.params.id) as any;
  if (!list) return res.status(404).json({ error: 'Not found' });
  if (list.status !== 'draft') return res.status(400).json({ error: 'Already finalized' });

  const entries = db.prepare('SELECT address_index, secret FROM entries WHERE allowlist_id = ? ORDER BY address_index').all(req.params.id) as any[];
  if (entries.length === 0) return res.status(400).json({ error: 'No entries' });

  try {
    const adminSecret = process.env.ADMIN_SECRET_KEY;
    if (!adminSecret) return res.status(500).json({ error: 'ADMIN_SECRET_KEY not configured' });

    const tree = await buildTree(entries.map((e: any) => ({ addressIndex: e.address_index, secret: e.secret })));

    const txHash = await setContractRoot(list.contract_id, tree.root, adminSecret);

    db.prepare('UPDATE allowlists SET merkle_root = ?, status = ?, finalized_at = datetime(\'now\') WHERE id = ?')
      .run(tree.root.toString(), 'finalized', req.params.id);

    res.json({ root: tree.root.toString(), tx_hash: txHash, entry_count: entries.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

adminRouter.get('/allowlists/:id/claims', (req: any, res: any) => {
  const db = getDb();
  const list = db.prepare('SELECT * FROM allowlists WHERE id = ?').get(req.params.id);
  if (!list) return res.status(404).json({ error: 'Not found' });

  const claims = db.prepare('SELECT * FROM claims WHERE allowlist_id = ? ORDER BY claimed_at DESC').all(req.params.id);
  res.json(claims);
});
