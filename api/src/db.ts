import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.API_DB_PATH || path.join(__dirname, '..', 'data', 'zkgate.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    fs.mkdirSync(dir, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    migrate(db);
  }
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS allowlists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      merkle_root TEXT,
      contract_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      entry_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      finalized_at TEXT
    );

    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      allowlist_id TEXT NOT NULL REFERENCES allowlists(id) ON DELETE CASCADE,
      address_index INTEGER NOT NULL,
      label TEXT NOT NULL DEFAULT '',
      secret TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      allowlist_id TEXT NOT NULL REFERENCES allowlists(id) ON DELETE CASCADE,
      nullifier TEXT NOT NULL UNIQUE,
      tx_hash TEXT,
      claimed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_entries_allowlist_address
      ON entries(allowlist_id, address_index);
  `);
}
