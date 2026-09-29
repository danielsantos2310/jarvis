import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, renameSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { acquireData } from '../src/core/paths.ts';
import { randomUUID, createHash } from 'node:crypto';
import { Store } from '../src/core/database.ts';
import { createBackup, restoreBackup, MAX_BACKUP_AGE } from '../src/core/backup.ts';
import { configureRecovery, recoveryState, journalPath, readJournal, syncDeletions } from '../src/core/deletion-journal.ts';
import { decryptBackup, encryptBackup } from '../src/core/backup-crypto.ts';
import { hashPassword, verifyPassword } from '../src/core/security.ts';
import { createApp } from '../src/core/app.ts';
const now = Date.UTC(2026, 8, 29, 12);
const password = 'Separate synthetic backup password';
const oldHash = await hashPassword('Old synthetic workspace password');
const newHash = await hashPassword('New synthetic workspace password');
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'jarvis-backup-')); const data = join(root, 'live'); const recovery = join(root, 'recovery'); mkdirSync(data);
  const path = join(data, 'jarvis.sqlite'); const store = new Store(path); const owner = store.enroll(oldHash, now);
  const create = (title = 'Synthetic secret title', due = false) => store.action(owner, randomUUID(), { type: 'item.create', kind: due ? 'reminder' : 'task', title, ...(due ? { dueAt: now + 1000 } : {}) }, now).entityId as string;
  const remove = (id: string) => store.action(owner, randomUUID(), { type: 'item.delete', id }, now + 2000);
  const configure = () => configureRecovery(store.db, recovery, data);
  const restore = (file: string, overrides = {}) => restoreBackup({ file, password, recoveryDirectory: recovery, target: join(root, `restored-${randomUUID()}`), newPasswordHash: newHash, now: now + 4000, ...overrides });
  return { root, data, recovery, path, store, owner, create, remove, configure, restore, close() { store.close(); rmSync(root, { recursive: true, force: true }); } };
}
test('encrypted snapshot restores into isolation, replays later deletions and revokes authority', async () => {
  const f = fixture();
  try {
    const deleted = f.create('Deleted confidential sample', true); const retained = f.create('Keep this sample'); f.configure();
    const file = await createBackup(f.store, f.path, password, now);
    assert(!readFileSync(file).includes(Buffer.from('Deleted confidential sample')));
    f.store.tick(now + 2000); assert.equal(f.store.notices(f.owner).length, 1);
    f.remove(deleted); assert.equal(f.store.recoveryStatus().deletionSync, 'synced');
    const state = recoveryState(f.store.db)!; assert(!readFileSync(journalPath(state)).includes(Buffer.from(deleted)));
    const result = await f.restore(file); assert.equal(result.replayedDeletions, 1);
    const restored = new Store(join(result.target, 'jarvis.sqlite'));
    try {
      const owner = restored.owner()!;
      assert.equal(owner.grant_enabled, 0); assert.equal(owner.epoch, f.owner.epoch + 1); assert(restored.paused()); assert.deepEqual(restored.list(owner), []);
      assert(await verifyPassword('New synthetic workspace password', owner.password)); assert.notEqual(owner.password, oldHash);
      assert.equal(restored.db.prepare('SELECT COUNT(*) n FROM receipts').get()!.n, 0); assert.equal(restored.db.prepare('SELECT COUNT(*) n FROM notices').get()!.n, 0);
      restored.tick(now + 10000); assert.equal(restored.db.prepare('SELECT COUNT(*) n FROM notices').get()!.n, 0);
      restored.control(owner, 'grant', now); assert.deepEqual(restored.list(restored.owner()!).map(i => i.id), [retained]);
      assert(!existsSync(join(result.target, 'restore-incomplete')));
    } finally { restored.close(); }
    assert.equal(f.store.owner()!.password, oldHash); assert.equal(f.store.owner()!.grant_enabled, 1);
    assert.equal(f.store.recoveryStatus().lastBackupAt, now);
  } finally { f.close(); }
});
test('wrong password, tampering, truncation and expired snapshots do not publish restored data', async () => {
  const f = fixture();
  try {
    f.create(); f.configure(); const file = await createBackup(f.store, f.path, password, now); const bytes = readFileSync(file);
    const target = join(f.root, 'failed');
    await assert.rejects(f.restore(file, { password: 'Wrong synthetic backup password', target }), /RECOVERY_AUTH_FAILED/); assert(!existsSync(target));
    const corrupt = join(f.root, 'corrupt.jbackup'); const changed = Buffer.from(bytes); changed[changed.length - 1] ^= 1; writeFileSync(corrupt, changed);
    await assert.rejects(f.restore(corrupt, { target }), /RECOVERY_AUTH_FAILED/); assert(!existsSync(target));
    writeFileSync(corrupt, bytes.subarray(0, 20)); await assert.rejects(f.restore(corrupt, { target }), /BACKUP_FORMAT/);
    await assert.rejects(f.restore(file, { now: now + MAX_BACKUP_AGE + 1, target }), /BACKUP_EXPIRED_OR_INVALID/); assert(!existsSync(target));
    await assert.rejects(f.restore(file, { now: now - 60001, target }), /BACKUP_EXPIRED_OR_INVALID/);
  } finally { f.close(); }
});
test('missing, altered and foreign deletion journals block restore without changing the source', async () => {
  const f = fixture(); const other = fixture();
  try {
    f.create(); f.configure(); other.configure(); const file = await createBackup(f.store, f.path, password, now);
    const path = journalPath(recoveryState(f.store.db)!); const original = readFileSync(path); rmSync(path);
    await assert.rejects(f.restore(file), /ENOENT/);
    writeFileSync(path, Buffer.from('broken')); await assert.rejects(f.restore(file), /RECOVERY_AUTH_FAILED/);
    writeFileSync(path, readFileSync(journalPath(recoveryState(other.store.db)!))); await assert.rejects(f.restore(file), /RECOVERY_AUTH_FAILED/);
    writeFileSync(path, original); assert.equal(f.store.list(f.owner).length, 1);
    assert.equal(readdirSync(f.root).filter(p => p.startsWith('restored-')).length, 0);
  } finally { f.close(); other.close(); }
});
test('disconnected recovery location leaves live deletion complete, pending status, retry and no resurrection', async () => {
  const f = fixture();
  try {
    const id = f.create(); f.configure(); const file = await createBackup(f.store, f.path, password, now);
    const offline = f.recovery + '-offline'; renameSync(f.recovery, offline); f.remove(id);
    assert.equal(f.store.list(f.owner).length, 0); assert.equal(f.store.recoveryStatus().deletionSync, 'pending');
    await assert.rejects(createBackup(f.store, f.path, password, now + 3000));
    renameSync(offline, f.recovery); f.store.tick(now + 3000); assert.equal(f.store.recoveryStatus().deletionSync, 'synced');
    const result = await f.restore(file); const restored = new Store(join(result.target, 'jarvis.sqlite'));
    try { assert.equal(restored.db.prepare('SELECT COUNT(*) n FROM items').get()!.n, 0); } finally { restored.close(); }
    assert.equal(readJournal(recoveryState(f.store.db)!, f.owner).entries.length, 1);
  } finally { f.close(); }
});
test('journal rollback below local or snapshot watermark fails closed', async () => {
  const f = fixture();
  try {
    const id = f.create(); f.configure(); const path = journalPath(recoveryState(f.store.db)!); const stale = readFileSync(path); f.remove(id);
    const file = await createBackup(f.store, f.path, password, now + 3000);
    writeFileSync(path, stale); f.store.syncRecovery(); assert.equal(f.store.recoveryStatus().deletionSync, 'pending');
    assert.throws(() => syncDeletions(f.store.db), /JOURNAL_STALE_OR_INVALID/);
    await assert.rejects(f.restore(file), /JOURNAL_STALE_OR_INVALID/);
  } finally { f.close(); }
});
test('failed live transaction does not journal a deletion; repeated synchronization is idempotent', () => {
  const f = fixture();
  try {
    const id = f.create(); f.configure();
    f.store.db.exec("CREATE TRIGGER fail_audit BEFORE INSERT ON audit BEGIN SELECT RAISE(ABORT,'test audit failure'); END");
    assert.throws(() => f.remove(id), /test audit failure/);
    assert.equal(f.store.list(f.owner).length, 1); assert.equal(readJournal(recoveryState(f.store.db)!, f.owner).entries.length, 0);
    f.store.db.exec('DROP TRIGGER fail_audit'); f.remove(id); syncDeletions(f.store.db); syncDeletions(f.store.db);
    assert.equal(readJournal(recoveryState(f.store.db)!, f.owner).entries.length, 1);
    f.store.tick(now + 100 * 86400000); assert.equal(f.store.db.prepare('SELECT COUNT(*) n FROM tombstones').get()!.n, 1);
  } finally { f.close(); }
});
test('configuration rejects nested recovery location and restore refuses existing targets', async () => {
  const f = fixture();
  try {
    assert.throws(() => configureRecovery(f.store.db, join(f.data, 'backups'), f.data), /RECOVERY_LOCATION_MUST_BE_SEPARATE/);
    f.configure(); assert.throws(f.configure, /RECOVERY_ALREADY_CONFIGURED/);
    const file = await createBackup(f.store, f.path, password, now);
    await assert.rejects(f.restore(file, { target: f.data }), /RESTORE_TARGET_EXISTS/);
    assert.equal(f.store.owner()!.password, oldHash);
    assert(!readdirSync(f.data).some(p => p.startsWith('.backup-')));
  } finally { f.close(); }
});
test('authenticated but invalid payload/checksum/schema fails without publishing a target', async () => {
  const f = fixture();
  try {
    f.create(); f.configure(); const file = await createBackup(f.store, f.path, password, now);
    const payload = JSON.parse((await decryptBackup(readFileSync(file), password)).toString()); const altered = join(f.root, 'invalid.jbackup');
    writeFileSync(altered, await encryptBackup(Buffer.from(JSON.stringify({ ...payload, sha256: 'wrong' })), password));
    await assert.rejects(f.restore(altered), /BACKUP_CHECKSUM/);
    writeFileSync(altered, await encryptBackup(Buffer.from(JSON.stringify({ ...payload, schema: 99 })), password));
    await assert.rejects(f.restore(altered), /BACKUP_EXPIRED_OR_INVALID/);
    assert.equal(readdirSync(f.root).filter(p => p.startsWith('restored-')).length, 0);
  } finally { f.close(); }
});
test('recovery metadata API requires authentication and never returns journal key or filesystem paths', async () => {
  const f = fixture(); let app: Awaited<ReturnType<typeof createApp>> | undefined;
  try {
    f.configure(); f.store.syncRecovery(); const state = recoveryState(f.store.db)!;
    app = await createApp({ store: f.store, port: 3000, bootstrapCode: 'unused', scheduler: false });
    const headers = { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000' };
    assert.equal((await app.inject({ url: '/api/snapshot', headers })).statusCode, 401);
    const login = await app.inject({ method: 'POST', url: '/api/login', headers, payload: { password: 'Old synthetic workspace password' } });
    assert.equal(login.statusCode, 200, login.body);
    const cookie = login.cookies.map(c => `${c.name}=${c.value}`).join('; ');
    const snapshot = await app.inject({ url: '/api/snapshot', headers: { ...headers, cookie } });
    assert.equal(snapshot.statusCode, 200, snapshot.body); assert.equal(snapshot.json().recovery.deletionSync, 'synced');
    assert(!snapshot.body.includes(state.key)); assert(!snapshot.body.includes(state.directory)); assert(!snapshot.body.includes(state.id));
  } finally { await app?.close(); f.close(); }
});

test('restore failure after staging removes only its new target; interrupted marker blocks startup', async () => {
  const f = fixture();
  try {
    f.create(); f.configure(); const file = await createBackup(f.store, f.path, password, now);
    const payload = JSON.parse((await decryptBackup(readFileSync(file), password)).toString());
    const bad = join(f.root, 'bad.sqlite'); writeFileSync(bad, Buffer.from(payload.database, 'base64'));
    const db = new DatabaseSync(bad); db.exec("UPDATE owner SET household='different-household'"); db.close();
    const bytes = readFileSync(bad); payload.database = bytes.toString('base64'); payload.sha256 = createHash('sha256').update(bytes).digest('hex');
    const altered = join(f.root, 'bad.jbackup'); writeFileSync(altered, await encryptBackup(Buffer.from(JSON.stringify(payload)), password));
    const target = join(f.root, 'failed-staging'); await assert.rejects(f.restore(altered, { target }), /BACKUP_OWNER/); assert(!existsSync(target));
    assert.equal(f.store.list(f.owner).length, 1);
    mkdirSync(target); writeFileSync(join(target, 'restore-incomplete'), 'synthetic interrupted restore');
    const previous = process.env.JARVIS_DATA_DIR; process.env.JARVIS_DATA_DIR = target;
    try { assert.throws(acquireData, /RESTORE_INCOMPLETE/); assert(!existsSync(join(target, 'runtime.lock'))); }
    finally { if (previous === undefined) delete process.env.JARVIS_DATA_DIR; else process.env.JARVIS_DATA_DIR = previous; }
  } finally { f.close(); }
});
test('schema-2 upgrade keeps existing data and starts recovery as unconfigured', () => {
  const f = fixture();
  try {
    const id = f.create(); const path = join(f.root, 'v2.sqlite'); const v2 = new Store(path); v2.enroll(oldHash, now);
    v2.db.exec('DROP TABLE recovery; PRAGMA user_version=2'); v2.close();
    const migrated = new Store(path);
    try { assert.equal(migrated.db.prepare('PRAGMA user_version').get()!.user_version, 3); assert.equal(migrated.owner()!.password, oldHash); assert.equal(migrated.recoveryStatus().configured, false); }
    finally { migrated.close(); }
    assert.equal(f.store.list(f.owner)[0].id, id);
  } finally { f.close(); }
});
