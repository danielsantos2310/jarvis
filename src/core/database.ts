import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, createHmac } from 'node:crypto';
import type { Action, Item, Notice } from '../shared/contracts.ts';
import { previewSchedule, scheduleWindow, MISSED_GRACE_MS } from './scheduling.ts';
import { recoveryState, syncDeletions } from './deletion-journal.ts';
import type { Schedule } from '../shared/schedule.ts';
import { AppError, validTimezone } from './security.ts';
export interface Owner { id: string; household: string; password: string; epoch: number; grant_enabled: number }
interface ItemRow { id: string; owner: string; household: string; kind: Item['kind']; title: string; due_at: number | null; timezone: string; created_at: number; state: Item['state']; schedule: string | null; schedule_index: number }
export class Store {
  db: DatabaseSync;
  constructor(path: string) {
    this.db = new DatabaseSync(path, { timeout: 3000 });
    this.db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA secure_delete=ON;');
    const version = (this.db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
    if (version > 3) { this.db.close(); throw new Error('DATABASE_VERSION_TOO_NEW'); }
    if (!version) this.db.exec(`BEGIN IMMEDIATE;
      CREATE TABLE owner (singleton INTEGER PRIMARY KEY CHECK(singleton=1), id TEXT UNIQUE NOT NULL, household TEXT NOT NULL,
        password TEXT NOT NULL, epoch INTEGER NOT NULL DEFAULT 1, grant_enabled INTEGER NOT NULL CHECK(grant_enabled IN (0,1)));
      CREATE TABLE settings (singleton INTEGER PRIMARY KEY CHECK(singleton=1), paused INTEGER NOT NULL, digest_key TEXT NOT NULL);
      CREATE TABLE items (id TEXT PRIMARY KEY, owner TEXT NOT NULL, household TEXT NOT NULL,
        kind TEXT NOT NULL CHECK(kind IN ('task','reminder','timer')), title TEXT NOT NULL,
        due_at INTEGER, timezone TEXT NOT NULL, created_at INTEGER NOT NULL,
        state TEXT NOT NULL CHECK(state IN ('active','done')), delivered INTEGER NOT NULL DEFAULT 0);
      CREATE INDEX items_due ON items(state, delivered, due_at);
      CREATE TABLE notices (id TEXT PRIMARY KEY, item_id TEXT UNIQUE NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        owner TEXT NOT NULL, household TEXT NOT NULL, due_at INTEGER NOT NULL, delivered_at INTEGER NOT NULL, late INTEGER NOT NULL);
      CREATE TABLE receipts (owner TEXT NOT NULL, household TEXT NOT NULL, request_id TEXT NOT NULL, digest TEXT NOT NULL, result TEXT NOT NULL,
        at INTEGER NOT NULL, PRIMARY KEY(owner, household, request_id));
      CREATE TABLE audit (id INTEGER PRIMARY KEY, owner TEXT NOT NULL, action TEXT NOT NULL, decision TEXT NOT NULL, at INTEGER NOT NULL);
      CREATE TABLE tombstones (id TEXT PRIMARY KEY, at INTEGER NOT NULL);
      PRAGMA user_version=1;
      COMMIT;`);
    if (version < 2) this.db.exec(`BEGIN IMMEDIATE;
      ALTER TABLE items ADD COLUMN schedule TEXT;
      ALTER TABLE items ADD COLUMN schedule_index INTEGER NOT NULL DEFAULT 0;
      PRAGMA user_version=2;
      COMMIT;`);
    if (version < 3) this.db.exec(`BEGIN IMMEDIATE;
      CREATE TABLE recovery (singleton INTEGER PRIMARY KEY CHECK(singleton=1), id TEXT NOT NULL, key TEXT NOT NULL, directory TEXT NOT NULL, revision INTEGER NOT NULL, last_backup INTEGER);
      PRAGMA user_version=3; COMMIT;`);
    this.db.prepare('INSERT OR IGNORE INTO settings VALUES(1,0,?)').run(randomBytes(32).toString('hex'));
  }
  deletionSync: 'synced' | 'pending' = 'pending';
  private lastSync = -Infinity;
  syncRecovery() {
    try { syncDeletions(this.db); this.deletionSync = 'synced'; } catch { this.deletionSync = 'pending'; }
  }
  recoveryStatus() {
    const state = recoveryState(this.db);
    return { configured: !!state, deletionSync: state ? this.deletionSync : 'not-configured' as const, lastBackupAt: state?.last_backup ?? null };
  }
  close() { this.db.close(); }
  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); this.db.exec('COMMIT'); return result; }
    catch (error) {
      // SQLite can roll back automatically (for example on storage failures).
      // Do not replace the original error with "no transaction is active".
      if (this.db.isTransaction) this.db.exec('ROLLBACK');
      throw error;
    }
  }
  owner(): Owner | undefined { return this.db.prepare('SELECT * FROM owner WHERE singleton=1').get() as unknown as Owner | undefined; }
  enroll(password: string, now: number) {
    return this.transaction(() => {
      if (this.owner()) throw new AppError(409, 'ALREADY_ENROLLED');
      this.db.prepare('INSERT INTO owner(singleton,id,household,password,grant_enabled) VALUES(1,?,?,?,1)').run(randomUUID(), randomUUID(), password);
      const owner = this.owner()!; this.audit(owner.id, 'enroll', 'allowed', now); return owner;
    });
  }
  recover(password: string, now: number) {
    this.transaction(() => {
      const owner = this.owner(); if (!owner) throw new AppError(409, 'NOT_ENROLLED');
      this.db.prepare('UPDATE owner SET password=?,epoch=epoch+1 WHERE singleton=1').run(password);
      this.db.exec('UPDATE settings SET paused=1'); this.audit(owner.id, 'recover', 'allowed', now);
    });
  }
  paused() { return Boolean((this.db.prepare('SELECT paused FROM settings').get() as { paused: number }).paused); }
  audit(owner: string, action: string, decision: string, now: number) {
    this.db.prepare('INSERT INTO audit(owner,action,decision,at) VALUES(?,?,?,?)').run(owner, action, decision, now);
    this.db.exec('DELETE FROM audit WHERE id <= (SELECT COALESCE(MAX(id),0)-50000 FROM audit)');
  }
  control(owner: Owner, change: 'stop' | 'resume' | 'revoke' | 'grant', now: number) {
    this.transaction(() => {
      if (change === 'stop' || change === 'resume') this.db.prepare('UPDATE settings SET paused=?').run(change === 'stop' ? 1 : 0);
      else this.db.prepare('UPDATE owner SET grant_enabled=? WHERE id=?').run(change === 'grant' ? 1 : 0, owner.id);
      this.audit(owner.id, change, 'allowed', now);
    });
  }
  canRead(owner: Owner) {
    const current = this.owner();
    return Boolean(current && current.id === owner.id && current.household === owner.household && current.grant_enabled);
  }
  list(owner: Owner): Item[] {
    if (!this.canRead(owner)) return [];
    const rows = this.db.prepare('SELECT * FROM items WHERE owner=? AND household=? ORDER BY created_at DESC').all(owner.id, owner.household) as unknown as ItemRow[];
    return rows.map(row => ({ id: row.id, title: row.title, kind: row.kind, dueAt: row.due_at,
      timezone: row.timezone, schedule: row.schedule ? JSON.parse(row.schedule) : null, createdAt: row.created_at, state: row.state }));
  }
  notices(owner: Owner): Notice[] {
    if (!this.canRead(owner)) return [];
    const rows = this.db.prepare(`SELECT n.id, n.item_id, n.due_at, n.late, i.title, i.kind FROM notices n JOIN items i ON i.id=n.item_id
      WHERE n.owner=? AND n.household=? ORDER BY n.due_at DESC`).all(owner.id, owner.household) as unknown as { id: string; item_id: string; due_at: number; late: number; title: string; kind: Item['kind'] }[];
    return rows.map(r => ({ id: r.id, itemId: r.item_id, title: r.title, kind: r.kind, dueAt: r.due_at, late: !!r.late }));
  }
  action(owner: Owner, requestId: string, action: Action, now: number, intent?: string) {
    const outcome = this.transaction(() => {
      // Identity and grant are rechecked inside the write transaction.
      const current = this.owner();
      if (!current || current.id !== owner.id || current.household !== owner.household || current.epoch !== owner.epoch || !current.grant_enabled)
        throw new AppError(403, 'LOCAL_GRANT_REQUIRED');
      if (this.paused() && action.type === 'item.create') throw new AppError(409, 'ACTIONS_PAUSED');
      const key = (this.db.prepare('SELECT digest_key FROM settings').get() as { digest_key: string }).digest_key;
      const digest = createHmac('sha256', key).update(intent ?? JSON.stringify(Object.fromEntries(Object.entries(action).sort(([a], [b]) => a.localeCompare(b))))).digest('hex');
      const receipt = this.db.prepare('SELECT digest,result FROM receipts WHERE owner=? AND household=? AND request_id=?')
        .get(owner.id, owner.household, requestId) as { digest: string; result: string } | undefined;
      if (receipt) {
        if (receipt.digest !== digest) throw new AppError(409, 'REQUEST_ID_CONFLICT');
        return { ...JSON.parse(receipt.result), duplicate: true };
      }
      if ((this.db.prepare('SELECT COUNT(*) AS n FROM receipts').get() as { n: number }).n >= 20000) throw new AppError(429, 'ACTION_QUOTA');
      let entityId: string;
      if (action.type === 'item.create') {
        const title = action.title.trim();
        let timezone = action.timezone ?? 'UTC';
        let dueAt = action.dueAt; let scheduleIndex = 0;
        if (action.schedule) {
          if (action.kind !== 'reminder' || action.dueAt !== undefined || action.timezone !== undefined)
            throw new AppError(400, 'INVALID_SCHEDULE');
          const first = previewSchedule(action.schedule)[0];
          if (action.expectedDueAt !== first.dueAt) throw new AppError(409, 'SCHEDULE_PREVIEW_REQUIRED');
          timezone = action.schedule.timezone; dueAt = first.dueAt; scheduleIndex = first.index;
        } else if (action.expectedDueAt !== undefined) throw new AppError(400, 'INVALID_SCHEDULE');
        if (!title || title.length > 160 || !validTimezone(timezone)) throw new AppError(400, 'INVALID_ITEM');
        if (action.kind !== 'task' && dueAt === undefined) throw new AppError(400, 'DUE_TIME_REQUIRED');
        if (dueAt !== undefined && (!Number.isSafeInteger(dueAt) || dueAt < now + 500 || dueAt > now + 365 * 86_400_000))
          throw new AppError(400, 'DUE_TIME_RANGE');
        if ((this.db.prepare('SELECT COUNT(*) AS n FROM items').get() as { n: number }).n >= 1000) throw new AppError(429, 'ITEM_QUOTA');
        entityId = randomUUID();
        this.db.prepare('INSERT INTO items(id,owner,household,kind,title,due_at,timezone,created_at,state,schedule,schedule_index) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
          .run(entityId, owner.id, owner.household, action.kind, title, dueAt ?? null, timezone, now, 'active',
            action.schedule ? JSON.stringify(action.schedule) : null, scheduleIndex);
      } else if (action.type === 'notice.dismiss') {
        entityId = action.id;
        if (!this.db.prepare('DELETE FROM notices WHERE id=? AND owner=? AND household=?').run(action.id, owner.id, owner.household).changes)
          throw new AppError(404, 'NOT_FOUND');
      } else {
        entityId = action.id;
        if (!this.db.prepare('SELECT id FROM items WHERE id=? AND owner=? AND household=?').get(action.id, owner.id, owner.household))
          throw new AppError(404, 'NOT_FOUND');
        if (action.type === 'item.delete') {
          this.db.prepare('DELETE FROM items WHERE id=? AND owner=? AND household=?').run(action.id, owner.id, owner.household);
          this.db.prepare('INSERT INTO tombstones VALUES(?,?)').run(action.id, now);
        } else {
          this.db.prepare("UPDATE items SET state='done' WHERE id=? AND owner=? AND household=?").run(action.id, owner.id, owner.household);
          this.db.prepare('DELETE FROM notices WHERE item_id=?').run(action.id);
        }
      }
      const result = { ok: true, entityId, duplicate: false };
      this.db.prepare('INSERT INTO receipts VALUES(?,?,?,?,?,?)').run(owner.id, owner.household, requestId, digest, JSON.stringify(result), now);
      this.audit(owner.id, action.type, 'allowed', now);
      return result;
    });
    if (action.type === 'item.delete') this.syncRecovery();
    return outcome;
  }
  tick(now: number) {
    if (now - this.lastSync >= 10000 || now < this.lastSync) { this.syncRecovery(); this.lastSync = now; }
    this.transaction(() => {
      this.db.prepare('DELETE FROM audit WHERE at<?').run(now - 30 * 86_400_000);
      this.db.prepare('DELETE FROM receipts WHERE at<?').run(now - 30 * 86_400_000);
      this.db.prepare('DELETE FROM notices WHERE delivered_at<?').run(now - 7 * 86_400_000);
      // Retain deletion IDs until a separately verified backup-retirement policy can prune them.
      const owner = this.owner(); if (!owner || !owner.grant_enabled || this.paused()) return;
      const due = this.db.prepare("SELECT * FROM items WHERE owner=? AND household=? AND state='active' AND delivered=0 AND due_at<=? ORDER BY due_at, id LIMIT 100")
        .all(owner.id, owner.household, now) as unknown as ItemRow[];
      for (const item of due) {
        const schedule: Schedule | null = item.schedule ? JSON.parse(item.schedule) : null;
        const window = schedule ? scheduleWindow(schedule, item.schedule_index + 1, now) : null;
        // Honor the already-persisted next deadline; subsequent dates use the
        // installed time-zone database. No older occurrence is ever replayed.
        const dueAt = Math.max(item.due_at!, window?.latest?.dueAt ?? item.due_at!);
        const skipped = schedule?.missed === 'skip' && now - dueAt > MISSED_GRACE_MS;
        if (!skipped) {
          // One inbox entry per reminder. A new occurrence receives a new ID so
          // dismissing a stale UI entry cannot dismiss the newer occurrence.
          this.db.prepare(`INSERT INTO notices VALUES(?,?,?,?,?,?,?) ON CONFLICT(item_id) DO UPDATE SET
            id=excluded.id, due_at=excluded.due_at, delivered_at=excluded.delivered_at, late=excluded.late`)
            .run(randomUUID(), item.id, owner.id, owner.household, dueAt, now, now - dueAt > 5000 ? 1 : 0);
        }
        if (schedule && schedule.frequency !== 'once' && window?.next) {
          this.db.prepare('UPDATE items SET due_at=?,schedule_index=?,delivered=0 WHERE id=?')
            .run(window.next.dueAt, window.next.index, item.id);
        } else this.db.prepare('UPDATE items SET delivered=1 WHERE id=?').run(item.id);
        this.audit(owner.id, skipped ? 'reminder.skipped' : 'reminder.inbox', 'allowed', now);
      }
    });
  }
}
