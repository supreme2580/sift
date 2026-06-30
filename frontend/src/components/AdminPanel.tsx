import { useState, useEffect } from 'react';
import { api, type Allowlist, type Entry, type Claim } from '../utils/api';

export default function AdminPanel() {
  const [lists, setLists] = useState<Allowlist[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [contractId, setContractId] = useState('');
  const [bulkSecrets, setBulkSecrets] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState('');

  const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_API_TOKEN || '';
  const isAdmin = !!ADMIN_TOKEN;

  const loadLists = async () => {
    setLoading(true);
    try {
      const all = await api.allowlists.list();
      setLists(all);
    } catch { setError('Failed to load allowlists'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadLists(); }, []);

  useEffect(() => {
    if (!selectedId) return;
    api.allowlists.getWithDetails(selectedId).then(data => {
      setEntries(data.entries || []);
      setClaims(data.claims || []);
    }).catch(() => setError('Failed to load details'));
  }, [selectedId]);

  const handleCreate = async () => {
    if (!name || !contractId) return;
    setError('');
    setStatusMsg('');
    try {
      await api.allowlists.create({ name, description: desc, contract_id: contractId });
      setStatusMsg(`Allowlist "${name}" created`);
      setName('');
      setDesc('');
      setContractId('');
      await loadLists();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleAddEntries = async () => {
    if (!bulkSecrets || !selectedId) return;
    setError('');
    setStatusMsg('');
    const secrets = bulkSecrets.split('\n').map(s => s.trim()).filter(Boolean);
    try {
      const result = await api.allowlists.addEntries(selectedId, secrets.map(s => ({ secret: s, label: '' })));
      setStatusMsg(`Added ${result.added.length} entries (total: ${result.total_entries})`);
      setBulkSecrets('');
      const data = await api.allowlists.getWithDetails(selectedId);
      setEntries(data.entries || []);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleRemoveEntry = async (entryId: number) => {
    if (!selectedId) return;
    try {
      await api.allowlists.removeEntry(selectedId, entryId);
      setStatusMsg('Entry removed');
      const data = await api.allowlists.getWithDetails(selectedId);
      setEntries(data.entries || []);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleFinalize = async () => {
    if (!selectedId) return;
    setError('');
    setStatusMsg('');
    try {
      const result = await api.allowlists.finalize(selectedId);
      setStatusMsg(`Finalized! Root=${result.root.slice(0, 16)}… Tx=${result.tx_hash.slice(0, 16)}…`);
      await loadLists();
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (!isAdmin) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <h2>Admin Access</h2>
        <p>Set <code>VITE_ADMIN_API_TOKEN</code> in your frontend .env to access the admin panel.</p>
      </div>
    );
  }

  const selected = lists.find(l => l.id === selectedId);

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Create Allowlist</h2>
        <div className="input-group">
          <label>Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="My Allowlist" />
        </div>
        <div className="input-group">
          <label>Description</label>
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="For community X" />
        </div>
        <div className="input-group">
          <label>Contract ID</label>
          <input value={contractId} onChange={e => setContractId(e.target.value)} placeholder="C…" />
        </div>
        <button className="btn btn-primary" onClick={handleCreate} disabled={!name || !contractId}>
          Create
        </button>
      </div>

      <div className="card">
        <h2>Allowlists</h2>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 24 }}><span className="spinner" /></div>
        ) : lists.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No allowlists yet.</p>
        ) : (
          <div className="allowlist-list" style={{ marginBottom: 16 }}>
            {lists.map(list => (
              <button
                key={list.id}
                className={`allowlist-item ${selectedId === list.id ? 'selected' : ''}`}
                onClick={() => setSelectedId(list.id)}
              >
                <div className="allowlist-item-main">
                  <strong>{list.name}</strong>
                  <span className="allowlist-desc">{list.description || '—'}</span>
                </div>
                <div className="allowlist-item-meta">
                  <span className={`badge ${list.status}`}>{list.status}</span>
                  <span className="count">{list.entry_count} entries</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {statusMsg && <div className="status-box success">{statusMsg}</div>}
        {error && <div className="status-box error">{error}</div>}

        {selected && selected.status === 'draft' && (
          <>
            <h2 style={{ marginTop: 24 }}>Add Entries</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
              One secret per line. Address indices are assigned automatically.
            </p>
            <div className="input-group">
              <label>Secrets (one per line)</label>
              <textarea
                value={bulkSecrets}
                onChange={e => setBulkSecrets(e.target.value)}
                placeholder="secret1&#10;secret2&#10;secret3"
                rows={6}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '0.5px solid var(--border)',
                  borderRadius: 'var(--radius-xs)',
                  color: 'var(--text)',
                  fontSize: 13,
                  fontFamily: 'var(--mono)',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>
            <button className="btn btn-primary" onClick={handleAddEntries} disabled={!bulkSecrets.trim()}>
              Add Entries
            </button>

            {entries.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <h2>Current Entries</h2>
                <div className="entries-table">
                  <div className="entries-header">
                    <span>Index</span>
                    <span>Secret</span>
                    <span />
                  </div>
                  {entries.map(e => (
                    <div key={e.id} className="entries-row">
                      <span className="mono">#{e.address_index}</span>
                      <span className="mono">{e.secret}</span>
                      <button
                        className="btn btn-ghost btn-small"
                        onClick={() => handleRemoveEntry(e.id)}
                        style={{ width: 'auto', padding: '4px 12px', fontSize: 11 }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              className="btn btn-success"
              onClick={handleFinalize}
              disabled={entries.length === 0}
              style={{ marginTop: 24 }}
            >
              Finalize — Compute Root & Deploy to Contract
            </button>
          </>
        )}

        {selected && selected.status === 'finalized' && (
          <div style={{ marginTop: 16 }}>
            <div className="status-box success">
              Finalized. Root: <code className="mono">{selected.merkle_root?.slice(0, 32)}…</code>
            </div>
          </div>
        )}

        {selected && claims.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h2>Claims</h2>
            <div className="entries-table">
              <div className="entries-header">
                <span>Nullifier</span>
                <span>Tx Hash</span>
              </div>
              {claims.map(c => (
                <div key={c.id} className="entries-row">
                  <span className="mono">{c.nullifier.slice(0, 16)}…</span>
                  <span className="mono">{c.tx_hash?.slice(0, 16) || '—'}…</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
