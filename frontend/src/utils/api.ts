const API_URL = import.meta.env.VITE_API_URL || '/api';

export interface Allowlist {
  id: string;
  name: string;
  description: string;
  merkle_root: string | null;
  contract_id: string;
  status: 'draft' | 'finalized';
  entry_count: number;
  created_at: string;
}

export interface Entry {
  id: number;
  address_index: number;
  label: string;
  secret: string;
  created_at: string;
}

export interface Claim {
  id: number;
  allowlist_id: string;
  nullifier: string;
  tx_hash: string | null;
  claimed_at: string;
}

export interface MerkleProofData {
  root: string;
  leaf: string;
  path: string[];
  index: number[];
  merkle_root: string;
  contract_id: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

function adminHeaders(): Record<string, string> {
  const token = import.meta.env.VITE_ADMIN_API_TOKEN || '';
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  allowlists: {
    list: () => request<Allowlist[]>('/allowlists'),
    get: (id: string) => request<Allowlist>(`/allowlists/${id}`),
    getWithDetails: (id: string) => request<Allowlist & { entries: Entry[]; claims: Claim[] }>(`/admin/allowlists/${id}`, { headers: adminHeaders() }),
    create: (data: { name: string; description?: string; contract_id: string }) =>
      request<Allowlist>('/admin/allowlists', { method: 'POST', body: JSON.stringify(data), headers: adminHeaders() }),
    addEntries: (id: string, entries: { label?: string; secret: string }[]) =>
      request<{ added: Entry[]; total_entries: number }>(`/admin/allowlists/${id}/entries`, { method: 'POST', body: JSON.stringify({ entries }), headers: adminHeaders() }),
    removeEntry: (id: string, entryId: number) =>
      request<{ success: boolean }>(`/admin/allowlists/${id}/entries/${entryId}`, { method: 'DELETE', headers: adminHeaders() }),
    finalize: (id: string) =>
      request<{ root: string; tx_hash: string; entry_count: number }>(`/admin/allowlists/${id}/finalize`, { method: 'POST', headers: adminHeaders() }),
    claims: (id: string) =>
      request<Claim[]>(`/admin/allowlists/${id}/claims`, { headers: adminHeaders() }),
  },
  proof: {
    get: (allowlistId: string, addressIndex: number, secret: string) =>
      request<MerkleProofData>(`/allowlists/${allowlistId}/proof`, {
        method: 'POST',
        body: JSON.stringify({ address_index: addressIndex, secret }),
      }),
  },
};
