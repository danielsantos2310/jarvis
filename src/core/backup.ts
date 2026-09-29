import { backup, DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { existsSync, mkdirSync, rmSync, unlinkSync, chmodSync } from 'node:fs';
import { Store } from './database.ts';
import { recoveryState, syncDeletions, readJournal, separateDirectory } from './deletion-journal.ts';
import type { RecoveryState } from './deletion-journal.ts';
import { readBounded, writePrivate, syncDirectory, encryptBackup, decryptBackup, MAX_FILE } from './backup-crypto.ts';
export const MAX_BACKUP_AGE = 28 * 86_400_000;
interface Payload { version: 1; app: string; node: string; tzdb: string; schema: 3; createdAt: number; owner: string; household: string; recovery: RecoveryState; sha256: string; database: string }
const hash = (b: Buffer) => createHash('sha256').update(b).digest('hex');
function validateDatabase(path: string, expected?: { owner: string; household: string }) {
  const db = new DatabaseSync(path, { readOnly: true, allowExtension: false });
  try {
    db.exec('PRAGMA trusted_schema=OFF;');
    if ((db.prepare('PRAGMA user_version').get() as {user_version:number}).user_version !== 3) throw new Error('BACKUP_SCHEMA');
    if ((db.prepare('PRAGMA integrity_check').get() as {integrity_check:string}).integrity_check !== 'ok' || db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('BACKUP_DATABASE_INVALID');
    if (db.prepare("SELECT name FROM sqlite_master WHERE type IN ('trigger','view')").all().length) throw new Error('BACKUP_DATABASE_INVALID');
    const owner = db.prepare('SELECT id,household FROM owner').all() as {id:string;household:string}[];
    if (owner.length !== 1 || (expected && (owner[0].id !== expected.owner || owner[0].household !== expected.household))) throw new Error('BACKUP_OWNER');
    for (const table of ['items', 'notices', 'receipts']) {
      if (db.prepare(`SELECT COUNT(*) n FROM ${table} WHERE owner<>? OR household<>?`).get(owner[0].id, owner[0].household)?.n !== 0) throw new Error('BACKUP_SCOPE');
    }
    return owner[0];
  } finally { db.close(); }
}
// The CLI holds the installation runtime lock. These operations are deliberately offline.
export async function createBackup(store: Store, databasePath: string, password: string, now = Date.now()) {
  syncDeletions(store.db);
  const state = recoveryState(store.db)!;
  const staging = join(dirname(databasePath), `.backup-${randomBytes(12).toString('hex')}.sqlite`);
  try {
    // Reserve with private permissions before SQLite opens it.
    writePrivate(staging, Buffer.alloc(0));
    await backup(store.db, staging);
    const owner = validateDatabase(staging);
    const bytes = readBounded(staging, 16 * 1024 * 1024);
    const payload: Payload = { version: 1, app: '0.3.0-alpha.3', node: process.versions.node, tzdb: process.versions.tz ?? 'unknown', schema: 3, createdAt: now,
      owner: owner.id, household: owner.household, recovery: state, sha256: hash(bytes), database: bytes.toString('base64') };
    const encrypted = await encryptBackup(Buffer.from(JSON.stringify(payload)), password);
    if (encrypted.length > MAX_FILE) throw new Error('RECOVERY_FILE_SIZE');
    const destination = join(state.directory, `jarvis-${now}-${randomBytes(6).toString('hex')}.jbackup`);
    // Authenticate the exact bytes after writing, before reporting success.
    writePrivate(destination, encrypted);
    const verified = JSON.parse((await decryptBackup(readBounded(destination), password)).toString()) as Payload;
    if (verified.sha256 !== payload.sha256 || hash(Buffer.from(verified.database, 'base64')) !== payload.sha256) throw new Error('BACKUP_VERIFY_FAILED');
    store.db.prepare('UPDATE recovery SET last_backup=? WHERE singleton=1').run(now);
    store.audit(owner.id, 'backup.create', 'allowed', now);
    store.syncRecovery();
    return destination;
  } finally {
    for (const suffix of ['', '-wal', '-shm']) rmSync(staging + suffix, { force: true });
  }
}
export async function restoreBackup(options: { file: string; password: string; recoveryDirectory: string; target: string; newPasswordHash: string; now?: number }) {
  const now = options.now ?? Date.now(); const target = resolve(options.target);
  if (existsSync(target)) throw new Error('RESTORE_TARGET_EXISTS');
  if (!/^[0-9a-f]{64}:[0-9a-f]{128}$/.test(options.newPasswordHash)) throw new Error('RESTORE_NEW_PASSWORD_REQUIRED');
  const payload = JSON.parse((await decryptBackup(readBounded(options.file), options.password)).toString()) as Payload;
  if (payload.version !== 1 || payload.schema !== 3 || !Number.isSafeInteger(payload.createdAt) || payload.createdAt > now + 60_000 || now - payload.createdAt > MAX_BACKUP_AGE || typeof payload.database !== 'string' || !payload.recovery || !Number.isSafeInteger(payload.recovery.revision) || payload.recovery.revision < 0) throw new Error('BACKUP_EXPIRED_OR_INVALID');
  const bytes = Buffer.from(payload.database, 'base64');
  if (bytes.length > 16 * 1024 * 1024 || hash(bytes) !== payload.sha256) throw new Error('BACKUP_CHECKSUM');
  // Never silently create a missing journal or accept the copy embedded in a backup.
  const state: RecoveryState = { ...payload.recovery, directory: resolve(options.recoveryDirectory) };
  const owner = { id: payload.owner, household: payload.household };
  const journal = readJournal(state, owner);
  // mkdir without recursive is exclusive: never overwrite an existing installation.
  mkdirSync(target, { mode: 0o700 });
  let restored: Store | undefined;
  try {
    writePrivate(join(target, 'restore-incomplete'), 'Do not start this incomplete restore.\n');
    state.directory = separateDirectory(state.directory, target);
    const database = join(target, 'jarvis.sqlite'); writePrivate(database, bytes);
    if (process.platform !== 'win32') chmodSync(database, 0o600);
    validateDatabase(database, payload);
    restored = new Store(database);
    const embedded = recoveryState(restored.db);
    if (!embedded || embedded.id !== state.id || embedded.key !== state.key || embedded.revision !== state.revision) throw new Error('BACKUP_JOURNAL_MISMATCH');
    const local = restored.db.prepare('SELECT id,at FROM tombstones').all() as {id:string;at:number}[];
    const entries = new Map(journal.entries.map(e => [e.id, e.at]));
    if (local.some(e => entries.get(e.id) !== e.at)) throw new Error('JOURNAL_STALE_OR_INVALID');
    restored.transaction(() => {
      for (const entry of journal.entries) {
        restored!.db.prepare('DELETE FROM items WHERE id=?').run(entry.id);
        restored!.db.prepare('INSERT OR REPLACE INTO tombstones VALUES(?,?)').run(entry.id, entry.at);
      }
      restored!.db.exec('DELETE FROM notices; DELETE FROM receipts; UPDATE settings SET paused=1; UPDATE owner SET grant_enabled=0, epoch=epoch+1;');
      restored!.db.prepare('UPDATE owner SET password=?').run(options.newPasswordHash);
      restored!.db.prepare('UPDATE settings SET digest_key=?').run(randomBytes(32).toString('hex'));
      restored!.db.prepare('UPDATE recovery SET directory=?,revision=?').run(state.directory, journal.entries.length);
      restored!.audit(payload.owner, 'backup.restore', 'allowed', now);
    });
    restored.db.exec('PRAGMA wal_checkpoint(TRUNCATE);'); restored.close(); restored = undefined;
    validateDatabase(database, payload);
    // Recheck the independent journal before publishing. Stop the original core for the whole drill.
    const current = readJournal(state, owner);
    if (JSON.stringify(current) !== JSON.stringify(journal)) throw new Error('JOURNAL_CHANGED_DURING_RESTORE');
    syncDirectory(target); unlinkSync(join(target, 'restore-incomplete')); syncDirectory(target);
    return { target, replayedDeletions: journal.entries.length, snapshotAt: payload.createdAt };
  } catch (error) {
    restored?.close();
    // Only this newly-created isolated target is removed. The source is never changed.
    rmSync(target, { recursive: true, force: true }); throw error;
  }
}
