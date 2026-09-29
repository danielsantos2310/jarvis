import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync, readdirSync, renameSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../src/core/database.ts';
import { AutomaticBackups, retainedCopies } from '../src/core/automatic-backups.ts';
import type { ScheduledCopy } from '../src/core/automatic-backups.ts';
import { configureRecovery, recoveryState } from '../src/core/deletion-journal.ts';
import { seal, unseal } from '../src/core/backup-crypto.ts';
import { createBackup, restoreBackup, MAX_BACKUP_AGE } from '../src/core/backup.ts';
import { hashPassword } from '../src/core/security.ts';
const DAY = 86400000; const now = Date.UTC(2026,8,29,12); const password = 'Synthetic automatic backup passphrase';
const passwordHash = await hashPassword('Synthetic original workspace password');
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'jarvis-auto-')); const data = join(root, 'live'); const recovery = join(root, 'recovery'); mkdirSync(data);
  const database = join(data, 'jarvis.sqlite'); const store = new Store(database); const owner = store.enroll(passwordHash, now);
  configureRecovery(store.db, recovery, data); const state = recoveryState(store.db)!; const catalogPath = join(recovery, `${state.id}.jcatalog`);
  const read = () => JSON.parse(unseal(readFileSync(catalogPath), Buffer.from(state.key, 'hex'), `jarvis-scheduled-catalog-v1:${state.id}`).toString()) as { version:1;id:string;copies:ScheduledCopy[] };
  const save = (catalog: ReturnType<typeof read>) => writeFileSync(catalogPath, seal(Buffer.from(JSON.stringify(catalog)), Buffer.from(state.key, 'hex'), `jarvis-scheduled-catalog-v1:${state.id}`));
  const create = (title = 'Synthetic live item') => store.action(owner, randomUUID(), {type:'item.create',kind:'task',title}, now).entityId as string;
  const copies = () => readdirSync(recovery).filter(p=>p.startsWith('jarvis-auto-'));
  return {root,data,recovery,database,store,owner,state,catalogPath,read,save,create,copies,close(){store.close();rmSync(root,{recursive:true,force:true});}};
}
test('retention keeps newest seven UTC dates and four UTC weeks within 28 days, with deduplication', () => {
  const copies: ScheduledCopy[] = Array.from({length:45}, (_,i)=>({file:String(i),at:now-i*DAY,sha256:''}));
  const keep = retainedCopies(copies,now);
  for(let i=0;i<7;i++)assert(keep.has(String(i)));
  assert(keep.size<=11); assert([...keep].every(id=>Number(id)<=28));
  const duplicate = {file:'older-same-day',at:now-1000,sha256:''}; assert(!retainedCopies([...copies,duplicate],now).has(duplicate.file));
  assert.equal(retainedCopies([{file:'expired',at:now-MAX_BACKUP_AGE-1,sha256:''}],now).size,0);
  const sunday=Date.UTC(2026,8,27,23,59),monday=Date.UTC(2026,8,28,0,0);
  assert.equal(retainedCopies([{file:'sunday',at:sunday,sha256:''},{file:'monday',at:monday,sha256:''}],monday).size,2);
});
test('scheduler deduplicates concurrent runs and UTC days, waits on stop, and authenticates password after restart', async () => {
  const f=fixture(); let scheduler:AutomaticBackups|undefined;
  try {
    f.create(); scheduler=await AutomaticBackups.unlock(f.store,f.database,password);
    const first=scheduler.run(now); assert.equal(scheduler.run(now),first); await first;
    assert.equal(scheduler.status().state,'ready'); assert.equal(f.copies().length,1);
    await scheduler.run(now+1000); assert.equal(f.copies().length,1);
    await scheduler.run(now+DAY); assert.equal(f.copies().length,2);
    await scheduler.stop(); await scheduler.run(now+2*DAY); assert.equal(f.copies().length,2); assert.equal(scheduler.status().state,'off');
    await assert.rejects(AutomaticBackups.unlock(f.store,f.database,'Wrong synthetic backup password'),/RECOVERY_AUTH_FAILED/);
    scheduler=await AutomaticBackups.unlock(f.store,f.database,password); await scheduler.run(now+DAY+1000); assert.equal(f.copies().length,2);
  } finally {await scheduler?.stop();f.close();}
});
test('live writes during snapshot creation preserve embedded journal consistency and deletion replay', async () => {
  const f=fixture();
  try {
    const id=f.create(); const pending=createBackup(f.store,f.database,password,now);
    f.store.action(f.owner,randomUUID(),{type:'item.delete',id},now+1);
    f.create('Created during snapshot'); const file=await pending;
    const restored=await restoreBackup({file,password,recoveryDirectory:f.recovery,target:join(f.root,'restored'),newPasswordHash:passwordHash,now:now+1000});
    const store=new Store(join(restored.target,'jarvis.sqlite'));
    try {assert.equal(store.db.prepare('SELECT COUNT(*) n FROM items WHERE id=?').get(id)!.n,0);assert(store.paused());}finally{store.close();}
  }finally{f.close();}
});
test('disconnected recovery drive reports attention, retries after 15 minutes and leaves live actions working', async () => {
  const f=fixture(); const scheduler=await AutomaticBackups.unlock(f.store,f.database,password);
  try {
    renameSync(f.recovery,f.recovery+'-offline');await scheduler.run(now);
    assert.equal(scheduler.status().state,'attention');assert.equal(scheduler.status().nextAttemptAt,now+15*60000);f.create();
    renameSync(f.recovery+'-offline',f.recovery);await scheduler.run(now+1000);assert.equal(f.copies().length,0);
    await scheduler.run(now+15*60000);assert.equal(scheduler.status().state,'ready');assert.equal(f.copies().length,1);
  }finally{await scheduler.stop();f.close();}
});
test('rotation removes only verified cataloged obsolete copies, preserving manual and uncataloged files', async () => {
  const f=fixture(); const scheduler=await AutomaticBackups.unlock(f.store,f.database,password);
  try {
    await scheduler.run(now);const catalog=f.read();
    for(let i=1;i<=35;i++){
      const at=now-i*DAY;const file=`jarvis-auto-${f.state.id}-${at}-${String(i).padStart(12,'0')}.jbackup`;const bytes=Buffer.from(`Synthetic retention fixture ${i}`);
      writeFileSync(join(f.recovery,file),bytes);catalog.copies.push({file,at,sha256:createHash('sha256').update(bytes).digest('hex')});
    }
    f.save(catalog);writeFileSync(join(f.recovery,'manual.jbackup'),'manual');writeFileSync(join(f.recovery,`jarvis-auto-${f.state.id}-untracked.jbackup`),'untracked');
    await scheduler.stop();const resumed=await AutomaticBackups.unlock(f.store,f.database,password);
    try {await resumed.run(now+1000);assert.equal(resumed.status().state,'ready');const after=f.read();assert(after.copies.length<=11);assert(after.copies.every(c=>now-c.at<=MAX_BACKUP_AGE));
      assert.equal(readFileSync(join(f.recovery,'manual.jbackup'),'utf8'),'manual');assert.equal(readFileSync(join(f.recovery,`jarvis-auto-${f.state.id}-untracked.jbackup`),'utf8'),'untracked');
      for(const copy of catalog.copies)assert.equal(existsSync(join(f.recovery,copy.file)),after.copies.some(c=>c.file===copy.file));
    }finally{await resumed.stop();}
  }finally{await scheduler.stop();f.close();}
});
test('changed retained snapshot blocks cleanup and malformed/missing catalogs cannot reset ownership', async () => {
  const f=fixture(); const scheduler=await AutomaticBackups.unlock(f.store,f.database,password);
  try {
    await scheduler.run(now);const catalog=f.read();const obsolete={file:`jarvis-auto-${f.state.id}-${now-40*DAY}-aaaaaaaaaaaa.jbackup`,at:now-40*DAY,sha256:createHash('sha256').update('old').digest('hex')};
    writeFileSync(join(f.recovery,obsolete.file),'old');catalog.copies.push(obsolete);f.save(catalog);
    writeFileSync(join(f.recovery,catalog.copies[0].file),'changed');await scheduler.run(now+DAY);assert.equal(scheduler.status().state,'attention');assert(existsSync(join(f.recovery,obsolete.file)));
    writeFileSync(f.catalogPath,'broken');await assert.rejects(AutomaticBackups.unlock(f.store,f.database,password),/RECOVERY_AUTH_FAILED/);
    rmSync(f.catalogPath);await assert.rejects(AutomaticBackups.unlock(f.store,f.database,password),/BACKUP_CATALOG_MISSING/);
  }finally{await scheduler.stop();f.close();}
});
test('catalog traversal is rejected and clock rollback after restart creates/deletes nothing', async () => {
  const f=fixture();const scheduler=await AutomaticBackups.unlock(f.store,f.database,password);
  try {
    await scheduler.run(now);await scheduler.stop();const resumed=await AutomaticBackups.unlock(f.store,f.database,password);
    try {await resumed.run(now-DAY);assert.equal(resumed.status().state,'attention');assert.equal(f.copies().length,1);}finally{await resumed.stop();}
    const catalog=f.read();catalog.copies[0].file='../unrelated.jbackup';f.save(catalog);
    await assert.rejects(AutomaticBackups.unlock(f.store,f.database,password),/BACKUP_CATALOG_INVALID/);
  }finally{await scheduler.stop();f.close();}
});

test('shutdown waits for an in-flight backup and prevents any later run', async () => {
  const f=fixture();const scheduler=await AutomaticBackups.unlock(f.store,f.database,password);
  try {
    const pending=scheduler.run(now);await scheduler.stop();await pending;
    assert.equal(scheduler.status().state,'off');assert.equal(f.copies().length,1);
    await scheduler.run(now+DAY);assert.equal(f.copies().length,1);
  }finally{await scheduler.stop();f.close();}
});
