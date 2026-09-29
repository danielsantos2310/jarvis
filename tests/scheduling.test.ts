import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { Store } from '../src/core/database.ts';
import type { Schedule } from '../src/shared/schedule.ts';
import { previewSchedule, occurrenceAt, scheduleWindow } from '../src/core/scheduling.ts';
const base: Schedule = { frequency: 'daily', localStart: '2027-03-27T01:30', timezone: 'Europe/Dublin',
  gap: 'next-valid', overlap: 'earlier', missed: 'inbox' };
function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'jarvis-recurrence-')); const path = join(dir, 'test.sqlite');
  const store = new Store(path); const now = Date.parse('2027-03-26T12:00:00Z'); const owner = store.enroll('synthetic-hash-not-for-login', now);
  return { path, store, owner, now, close() { store.close(); rmSync(dir, { force: true, recursive: true }); } };
}
function create(f: ReturnType<typeof setup>, schedule: Schedule) {
  return f.store.action(f.owner, randomUUID(), { type: 'item.create', kind: 'reminder', title: 'Synthetic repeated reminder',
    schedule, expectedDueAt: previewSchedule(schedule)[0].dueAt }, f.now);
}
test('Dublin spring gap resolves to FIRST valid time; original daily clock time resumes next day', () => {
  const list = previewSchedule(base);
  assert.equal(list[0].dueAt, Date.parse('2027-03-27T01:30:00Z'));
  assert.equal(list[1].requestedLocal, '2027-03-28T01:30');
  assert.equal(list[1].resolvedLocal, '2027-03-28T02:00');
  assert.equal(list[1].dueAt, Date.parse('2027-03-28T01:00:00Z'));
  assert.equal(list[1].adjustment, 'gap-shifted');
  assert.equal(list[2].resolvedLocal, '2027-03-29T01:30');
  assert.equal(list[2].dueAt, Date.parse('2027-03-29T00:30:00Z'));
});
test('gap skip omits an occurrence; an impossible one-shot is rejected', () => {
  assert.equal(previewSchedule({ ...base, gap: 'skip' })[1].requestedLocal, '2027-03-29T01:30');
  assert.throws(() => previewSchedule({ ...base, frequency: 'once', gap: 'skip', localStart: '2027-03-28T01:30' }), /NO_SCHEDULE_OCCURRENCE/);
});
test('autumn overlap uses exactly the selected occurrence, including weekly schedules', () => {
  const schedule: Schedule = { ...base, localStart: '2027-10-31T01:30', frequency: 'weekly' };
  const first = previewSchedule(schedule); const second = previewSchedule({ ...schedule, overlap: 'later' });
  assert.equal(first[0].dueAt, Date.parse('2027-10-31T00:30:00Z'));
  assert.equal(first[0].adjustment, 'overlap-earlier');
  assert.equal(second[0].dueAt, Date.parse('2027-10-31T01:30:00Z'));
  assert.equal(second[0].adjustment, 'overlap-later');
  assert.equal(first[1].requestedLocal, '2027-11-07T01:30');
  const window = scheduleWindow(schedule, 1, Date.parse('2027-10-31T01:45:00Z'));
  assert.equal(window.latest, null); assert.equal(window.next!.requestedLocal, '2027-11-07T01:30');
});
test('non-hour and full-date gaps plus fractional UTC offsets are resolved', () => {
  const halfHour = previewSchedule({ ...base, frequency: 'once', timezone: 'Australia/Lord_Howe', localStart: '2027-10-03T02:15' })[0];
  assert.equal(halfHour.resolvedLocal, '2027-10-03T02:30'); assert.equal(halfHour.adjustment, 'gap-shifted');
  const skippedDate = previewSchedule({ ...base, timezone: 'Pacific/Apia', localStart: '2011-12-30T08:00' });
  assert.equal(skippedDate[0].resolvedLocal, '2011-12-31T00:00');
  assert(skippedDate[1].dueAt > skippedDate[0].dueAt);
  const fractional = previewSchedule({ ...base, timezone: 'Asia/Kathmandu', frequency: 'once', localStart: '2027-04-01T09:00' })[0];
  assert.equal(fractional.offset, '+05:45'); assert.equal(fractional.dueAt, Date.parse('2027-04-01T03:15:00Z'));
});
test('invalid calendar dates, zones and rule values fail instead of normalizing', () => {
  for (const change of [{ localStart: '2027-02-30T09:00' }, { localStart: '2027-01-01T25:00' }, { timezone: 'Made/Up' }, { frequency: 'monthly' }, { overlap: 'both' }])
    assert.throws(() => previewSchedule({ ...base, ...change } as Schedule), /INVALID_SCHEDULE/);
});
test('calendar jumps handle leap day and years of downtime with bounded candidate work', () => {
  const schedule = { ...base, localStart: '2027-01-01T09:00', timezone: 'UTC' };
  const leap = scheduleWindow(schedule, 1, Date.parse('2028-02-29T09:01:00Z'));
  assert.equal(leap.latest!.requestedLocal, '2028-02-29T09:00'); assert.equal(leap.next!.requestedLocal, '2028-03-01T09:00');
  const decade = scheduleWindow(schedule, 1, Date.parse('2037-07-01T12:00:00Z'));
  assert.equal(decade.latest!.requestedLocal, '2037-07-01T09:00'); assert.equal(decade.next!.requestedLocal, '2037-07-02T09:00');
});
test('daily scheduling is atomic across restart, coalesces missed days and preserves the intended wall time', () => {
  const f = setup();
  try {
    create(f, base); const first = previewSchedule(base)[0];
    f.store.tick(first.dueAt); f.store.tick(first.dueAt + 1);
    assert.equal(f.store.notices(f.owner).length, 1);
    assert.equal(f.store.list(f.owner)[0].dueAt, Date.parse('2027-03-28T01:00:00Z'));
    const restored = new Store(f.path);
    try {
      const now = Date.parse('2027-04-04T12:00:00Z'); restored.tick(now); restored.tick(now + 1);
      const notices = restored.notices(f.owner); assert.equal(notices.length, 1);
      assert.equal(notices[0].dueAt, Date.parse('2027-04-04T00:30:00Z')); assert(notices[0].late);
      assert.equal(restored.list(f.owner)[0].dueAt, Date.parse('2027-04-05T00:30:00Z'));
      assert.equal(restored.list(f.owner)[0].schedule?.localStart, base.localStart);
    } finally { restored.close(); }
  } finally { f.close(); }
});
test('skip policy advances missed reminders but delivers those within the one-minute grace', () => {
  const f = setup();
  try {
    create(f, { ...base, missed: 'skip' });
    const due = f.store.list(f.owner)[0].dueAt!; f.store.tick(due + 60_001);
    assert.equal(f.store.notices(f.owner).length, 0);
    f.store.tick(f.store.list(f.owner)[0].dueAt! + 60_000); assert.equal(f.store.notices(f.owner).length, 1);
  } finally { f.close(); }
});
test('stale dismiss cannot erase a newer occurrence; completing stops the entire repeat', () => {
  const f = setup();
  try {
    const created = create(f, base);
    f.store.tick(f.store.list(f.owner)[0].dueAt!); const old = f.store.notices(f.owner)[0];
    f.store.tick(f.store.list(f.owner)[0].dueAt!); const next = f.store.notices(f.owner)[0];
    assert.notEqual(old.id, next.id);
    assert.throws(() => f.store.action(f.owner, randomUUID(), { type: 'notice.dismiss', id: old.id }, next.dueAt), /NOT_FOUND/);
    f.store.action(f.owner, randomUUID(), { type: 'notice.dismiss', id: next.id }, next.dueAt);
    assert.equal(f.store.list(f.owner)[0].state, 'active');
    f.store.action(f.owner, randomUUID(), { type: 'item.complete', id: created.entityId }, next.dueAt);
    f.store.tick(Date.parse('2028-01-01T00:00:00Z')); assert.equal(f.store.notices(f.owner).length, 0);
  } finally { f.close(); }
});
test('pause, revoke, clock rollback and audit failure do not dispatch or advance a repeat', () => {
  const f = setup();
  try {
    create(f, base); const due = f.store.list(f.owner)[0].dueAt!;
    f.store.control(f.owner, 'stop', f.now); f.store.tick(due + 1000);
    assert.equal(f.store.list(f.owner)[0].dueAt, due);
    f.store.control(f.owner, 'resume', f.now); f.store.control(f.owner, 'revoke', f.now); f.store.tick(due + 2000);
    assert.equal((f.store.db.prepare('SELECT due_at FROM items').get() as {due_at:number}).due_at, due);
    f.store.control(f.owner, 'grant', f.now);
    f.store.db.exec("CREATE TRIGGER audit_fail BEFORE INSERT ON audit BEGIN SELECT RAISE(ABORT,'test'); END");
    assert.throws(() => f.store.tick(due)); assert.equal(f.store.list(f.owner)[0].dueAt, due); assert.equal(f.store.notices(f.owner).length, 0);
    f.store.db.exec('DROP TRIGGER audit_fail'); f.store.tick(due); const notice = f.store.notices(f.owner)[0];
    f.store.tick(due - 86_400_000); f.store.tick(due);
    assert.equal(f.store.notices(f.owner)[0].id, notice.id);
  } finally { f.close(); }
});
test('preview mismatch, wrong kind and mixed scheduling authorities are denied; matching creation replays once', () => {
  const f = setup();
  try {
    const action = { type: 'item.create' as const, kind: 'reminder' as const, title: 'Test', schedule: base, expectedDueAt: previewSchedule(base)[0].dueAt };
    assert.throws(() => f.store.action(f.owner, randomUUID(), { ...action, expectedDueAt: action.expectedDueAt + 1 }, f.now), /SCHEDULE_PREVIEW_REQUIRED/);
    assert.throws(() => f.store.action(f.owner, randomUUID(), { ...action, kind: 'timer' }, f.now), /INVALID_SCHEDULE/);
    assert.throws(() => f.store.action(f.owner, randomUUID(), { ...action, dueAt: action.expectedDueAt }, f.now), /INVALID_SCHEDULE/);
    const id = randomUUID(); f.store.action(f.owner, id, action, f.now);
    assert.equal(f.store.action(f.owner, id, action, f.now + 1000).duplicate, true);
    assert.equal(f.store.list(f.owner).length, 1);
  } finally { f.close(); }
});
test('schema-1 migration preserves existing account, items and notices and is repeatable', () => {
  const dir = mkdtempSync(join(tmpdir(), 'jarvis-migrate-')); const path = join(dir, 'old.sqlite');
  try {
    const v1 = new DatabaseSync(path);
    v1.exec(`CREATE TABLE items (id TEXT PRIMARY KEY,owner TEXT,household TEXT,kind TEXT,title TEXT,due_at INTEGER,timezone TEXT,created_at INTEGER,state TEXT,delivered INTEGER DEFAULT 0);
      CREATE TABLE settings(singleton INTEGER PRIMARY KEY,paused INTEGER,digest_key TEXT);
      CREATE TABLE owner(singleton INTEGER PRIMARY KEY,id TEXT,household TEXT,password TEXT,epoch INTEGER,grant_enabled INTEGER);
      CREATE TABLE notices(id TEXT PRIMARY KEY,item_id TEXT UNIQUE REFERENCES items(id) ON DELETE CASCADE,owner TEXT,household TEXT,due_at INTEGER,delivered_at INTEGER,late INTEGER);
      INSERT INTO owner VALUES(1,'owner','house','synthetic',1,1);
      INSERT INTO items VALUES('item','owner','house','task','Original item',NULL,'UTC',1,'active',0);
      INSERT INTO notices VALUES('notice','item','owner','house',1,1,0);
      PRAGMA user_version=1;`); v1.close();
    for (let i=0;i<2;i++) {
      const migrated = new Store(path);
      assert.equal((migrated.db.prepare('PRAGMA user_version').get() as {user_version:number}).user_version, 2);
      assert.equal(migrated.list(migrated.owner()!)[0].title, 'Original item');
      assert.equal(migrated.list(migrated.owner()!)[0].schedule, null);
      assert.equal(migrated.notices(migrated.owner()!)[0].id, 'notice'); migrated.close();
    }
  } finally { rmSync(dir, { force: true, recursive: true }); }
});
