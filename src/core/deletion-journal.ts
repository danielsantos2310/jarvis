import type { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID } from 'node:crypto';
import { realpathSync, mkdirSync, lstatSync } from 'node:fs';
import { join, relative, isAbsolute } from 'node:path';
import { readBounded, seal, unseal, writePrivate, replacePrivate } from './backup-crypto.ts';
export interface RecoveryState { id: string; key: string; directory: string; revision: number; last_backup: number | null }
export interface Tombstone { id: string; at: number }
export interface Journal { version: 1; id: string; owner: string; household: string; entries: Tombstone[] }
export const MAX_DELETIONS = 20000;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export function recoveryState(db: DatabaseSync) { return db.prepare('SELECT * FROM recovery WHERE singleton=1').get() as unknown as RecoveryState | undefined; }
export function journalPath(state: RecoveryState) { return join(state.directory, `${state.id}.jdel`); }
export function readJournal(state: RecoveryState, owner: { id: string; household: string }): Journal {
  if (!uuid.test(state.id) || !/^[0-9a-f]{64}$/.test(state.key)) throw new Error('JOURNAL_IDENTITY');
  const journal = JSON.parse(unseal(readBounded(journalPath(state), 4 * 1024 * 1024), Buffer.from(state.key, 'hex'), `jarvis-deletions-v1:${state.id}`).toString()) as Journal;
  if (journal.version !== 1 || journal.id !== state.id || journal.owner !== owner.id || journal.household !== owner.household || !Array.isArray(journal.entries) || journal.entries.length > MAX_DELETIONS || journal.entries.length < state.revision) throw new Error('JOURNAL_STALE_OR_INVALID');
  const seen = new Set<string>();
  for (const row of journal.entries) {
    if (!row || !uuid.test(row.id) || !Number.isSafeInteger(row.at) || row.at < 0 || seen.has(row.id)) throw new Error('JOURNAL_INVALID'); seen.add(row.id);
  }
  return journal;
}
export function separateDirectory(directory: string, dataDirectory: string) {
  const path = realpathSync(directory); const data = realpathSync(dataDirectory);
  const rel = relative(data, path);
  if (!rel || (!rel.startsWith('..') && !isAbsolute(rel))) throw new Error('RECOVERY_LOCATION_MUST_BE_SEPARATE');
  if (!lstatSync(path).isDirectory()) throw new Error('RECOVERY_LOCATION_INVALID');
  return path;
}
export function configureRecovery(db: DatabaseSync, directory: string, dataDirectory: string) {
  if (recoveryState(db)) throw new Error('RECOVERY_ALREADY_CONFIGURED');
  const owner = db.prepare('SELECT id,household FROM owner').get() as { id: string; household: string } | undefined;
  if (!owner) throw new Error('NOT_ENROLLED');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const state: RecoveryState = { id: randomUUID(), key: randomBytes(32).toString('hex'), directory: separateDirectory(directory, dataDirectory), revision: 0, last_backup: null };
  const entries = db.prepare('SELECT id,at FROM tombstones ORDER BY at,id').all() as unknown as Tombstone[];
  if (entries.length > MAX_DELETIONS) throw new Error('JOURNAL_CAPACITY');
  const journal: Journal = { version: 1, id: state.id, owner: owner.id, household: owner.household, entries };
  writePrivate(journalPath(state), seal(Buffer.from(JSON.stringify(journal)), Buffer.from(state.key, 'hex'), `jarvis-deletions-v1:${state.id}`));
  db.prepare('INSERT INTO recovery VALUES(1,?,?,?,?,NULL)').run(state.id, state.key, state.directory, entries.length);
}
export function syncDeletions(db: DatabaseSync) {
  const state = recoveryState(db); if (!state) throw new Error('RECOVERY_NOT_CONFIGURED');
  const owner = db.prepare('SELECT id,household FROM owner').get() as {id:string;household:string};
  const journal = readJournal(state, owner);
  const known = new Map(journal.entries.map(e => [e.id, e.at]));
  const local = db.prepare('SELECT id,at FROM tombstones ORDER BY at,id').all() as unknown as Tombstone[];
  for (const entry of local) {
    if (known.has(entry.id) && known.get(entry.id) !== entry.at) throw new Error('JOURNAL_CONFLICT');
    if (!known.has(entry.id)) journal.entries.push(entry);
  }
  if (journal.entries.length > MAX_DELETIONS) throw new Error('JOURNAL_CAPACITY');
  if (journal.entries.length !== known.size) replacePrivate(journalPath(state), seal(Buffer.from(JSON.stringify(journal)), Buffer.from(state.key, 'hex'), `jarvis-deletions-v1:${state.id}`));
  db.prepare('UPDATE recovery SET revision=? WHERE singleton=1').run(journal.entries.length);
  return journal;
}
