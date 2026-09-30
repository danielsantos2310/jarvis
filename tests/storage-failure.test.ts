import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Store } from '../src/core/database.ts';
import { createApp } from '../src/core/app.ts';
import { hashPassword } from '../src/core/security.ts';

// Limit only a disposable SQLite database, never the host filesystem.
function failAuditWithFullDatabase(store: Store) {
  store.db.exec('CREATE TABLE disk_pressure (data BLOB)');
  const pages = Number(store.db.prepare('PRAGMA page_count').get()!.page_count);
  store.db.exec(`PRAGMA max_page_count=${pages + 2}`);
  store.db.exec(`CREATE TRIGGER full_audit BEFORE INSERT ON audit BEGIN
    INSERT INTO disk_pressure VALUES(zeroblob(1048576)); END`);
}
function counts(store: Store) {
  return ['items','notices','receipts','audit','tombstones'].map(table => Number(store.db.prepare(`SELECT COUNT(*) n FROM ${table}`).get()!.n));
}
test('an automatic SQLite rollback does not hide the original failure', () => {
  const store = new Store(':memory:');
  try {
    const owner = store.enroll('synthetic-unused-hash',Date.now());
    store.db.exec("CREATE TRIGGER rollback_audit BEFORE INSERT ON audit BEGIN SELECT RAISE(ROLLBACK,'synthetic automatic rollback'); END");
    assert.throws(() => store.action(owner,randomUUID(),{type:'item.create',kind:'task',title:'Not persisted'},Date.now()), /synthetic automatic rollback/);
    assert.equal(store.db.isTransaction,false); assert.equal(store.list(owner).length,0);
    store.db.exec('DROP TRIGGER rollback_audit');
    store.action(owner,randomUUID(),{type:'item.create',kind:'task',title:'Recovered'},Date.now());
    assert.equal(store.list(owner).length,1);
  } finally { store.close(); }
});
test('real SQLITE_FULL preserves the original error and rolls back create, delete and delivery', () => {
  const dir = mkdtempSync(join(tmpdir(),'jarvis-full-')); const path = join(dir,'test.sqlite');
  let store = new Store(path); const now = Date.now();
  try {
    const owner = store.enroll('synthetic-unused-hash',now);
    const saved = store.action(owner,randomUUID(),{type:'item.create',kind:'timer',title:'Preserve this timer',dueAt:now+1000},now);
    const before = counts(store);
    failAuditWithFullDatabase(store);
    for (const attempt of [
      () => store.action(owner,randomUUID(),{type:'item.create',kind:'task',title:'Must not persist'},now),
      () => store.action(owner,randomUUID(),{type:'item.delete',id:saved.entityId},now),
      () => store.tick(now+2000),
    ]) {
      assert.throws(attempt, error => (error as {errcode?:number}).errcode === 13);
      assert.equal(store.db.isTransaction,false);
      assert.deepEqual(counts(store),before);
      assert.equal(store.db.prepare('PRAGMA integrity_check').get()!.integrity_check,'ok');
    }
    store.db.exec('DROP TRIGGER full_audit; PRAGMA max_page_count=10000');
    store.tick(now+2000); store.tick(now+3000);
    assert.equal(store.notices(owner).length,1);
    store.close(); store = new Store(path);
    assert.equal(store.list(owner).length,1);
    assert.equal(store.notices(owner).length,1);
    assert.equal(store.db.prepare('PRAGMA integrity_check').get()!.integrity_check,'ok');
  } finally { store.close(); rmSync(dir,{recursive:true,force:true}); }
});

test('full-database API returns an opaque failure and a recovered retry creates exactly once', async () => {
  const dir = mkdtempSync(join(tmpdir(),'jarvis-full-api-')); const store = new Store(join(dir,'test.sqlite'));
  const password = 'Synthetic disk failure passphrase';
  store.enroll(await hashPassword(password),Date.now());
  const app = await createApp({store,bootstrapCode:'unused',serveWeb:false,scheduler:false});
  try {
    const headers = {host:'127.0.0.1:3000',origin:'http://127.0.0.1:3000','content-type':'application/json'};
    const login = await app.inject({method:'POST',url:'/api/login',headers,payload:{password}});
    assert.equal(login.statusCode,200);
    const authorized = {...headers,cookie:String(login.headers['set-cookie']).split(';')[0],'x-csrf-token':login.json().csrf};
    const payload = {requestId:randomUUID(),action:{type:'item.create',kind:'task',title:'Synthetic retry'}};
    failAuditWithFullDatabase(store); const before = counts(store);
    const failed = await app.inject({method:'POST',url:'/api/actions',headers:authorized,payload});
    assert.equal(failed.statusCode,503); assert.deepEqual(failed.json(),{error:'SERVICE_UNAVAILABLE'});
    assert.deepEqual(counts(store),before);
    store.db.exec('DROP TRIGGER full_audit; PRAGMA max_page_count=10000');
    const first = await app.inject({method:'POST',url:'/api/actions',headers:authorized,payload});
    const retry = await app.inject({method:'POST',url:'/api/actions',headers:authorized,payload});
    assert.equal(first.statusCode,200); assert.equal(retry.statusCode,200);
    assert.equal(retry.json().duplicate,true); assert.equal(first.json().entityId,retry.json().entityId);
    assert.equal(store.list(store.owner()!).length,1);
  } finally { await app.close(); store.close(); rmSync(dir,{recursive:true,force:true}); }
});
