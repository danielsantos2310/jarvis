import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readdirSync, renameSync, unlinkSync } from 'node:fs';
import { basename, join } from 'node:path';
import type { Store } from './database.ts';
import { createBackup, MAX_BACKUP_AGE } from './backup.ts';
import { recoveryState, readJournal } from './deletion-journal.ts';
import type { RecoveryState } from './deletion-journal.ts';
import { decryptBackup, readBounded, replacePrivate, seal, syncDirectory, unseal, writePrivate } from './backup-crypto.ts';
import type { AutomaticBackupStatus } from '../shared/contracts.ts';
const DAY = 86_400_000;
export interface ScheduledCopy { file: string; at: number; sha256: string }
interface Catalog { version: 1; id: string; copies: ScheduledCopy[] }
const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const utcDay = (at: number) => Math.floor(at / DAY);
const utcWeek = (at: number) => Math.floor((utcDay(at) + 3) / 7); // Monday boundary, UTC.
export function retainedCopies(copies: ScheduledCopy[], now: number): Set<string> {
  const recent = copies.filter(c => now - c.at <= MAX_BACKUP_AGE).sort((a, b) => b.at - a.at || a.file.localeCompare(b.file));
  const days = new Set<number>(); const weeks = new Set<number>(); const keep = new Set<string>();
  for (const copy of recent) {
    if (days.size < 7 && !days.has(utcDay(copy.at))) { days.add(utcDay(copy.at)); keep.add(copy.file); }
    if (weeks.size < 4 && !weeks.has(utcWeek(copy.at))) { weeks.add(utcWeek(copy.at)); keep.add(copy.file); }
  }
  return keep;
}
export class AutomaticBackups {
  private store: Store; private database: string; private password: string | undefined; private state: RecoveryState;
  private active: Promise<void> | undefined; private timer: ReturnType<typeof setInterval> | undefined;
  private stopped = false; private nextAttempt = 0;
  private statusValue: AutomaticBackupStatus = { state: 'ready', nextAttemptAt: null };
  private constructor(store: Store, database: string, password: string, state: RecoveryState) { this.store = store; this.database = database; this.password = password; this.state = state; }
  static async unlock(store: Store, database: string, password: string) {
    if (password.length < 12 || password.length > 128) throw new Error('BACKUP_PASSWORD_LENGTH');
    const state = recoveryState(store.db); if (!state || !store.owner()) throw new Error('RECOVERY_NOT_CONFIGURED');
    readJournal(state, store.owner()!);
    const scheduler = new AutomaticBackups(store, database, password, state);
    if (!existsSync(scheduler.catalogPath())) {
      if (readdirSync(state.directory).some(file => file.startsWith(`jarvis-auto-${state.id}-`))) throw new Error('BACKUP_CATALOG_MISSING');
      scheduler.save({ version: 1, id: state.id, copies: [] }, true);
    }
    const catalog = scheduler.read();
    const newest = [...catalog.copies].sort((a, b) => b.at - a.at)[0];
    if (newest) {
      const payload = JSON.parse((await decryptBackup(scheduler.verifiedBytes(newest), password)).toString());
      if (payload.recovery?.id !== state.id || payload.owner !== store.owner()!.id) throw new Error('BACKUP_CATALOG_IDENTITY');
    }
    return scheduler;
  }
  status(): AutomaticBackupStatus { return { ...this.statusValue }; }
  private catalogPath() { return join(this.state.directory, `${this.state.id}.jcatalog`); }
  private context() { return `jarvis-scheduled-catalog-v1:${this.state.id}`; }
  private read(): Catalog {
    const catalog = JSON.parse(unseal(readBounded(this.catalogPath(), 65536), Buffer.from(this.state.key, 'hex'), this.context()).toString()) as Catalog;
    if (catalog.version !== 1 || catalog.id !== this.state.id || !Array.isArray(catalog.copies) || catalog.copies.length > 128) throw new Error('BACKUP_CATALOG_INVALID');
    const files = new Set<string>(); const pattern = new RegExp(`^jarvis-auto-${this.state.id}-([0-9]+)-[a-f0-9]{12}\\.jbackup$`);
    for (const copy of catalog.copies) {
      const match = typeof copy.file === 'string' ? pattern.exec(copy.file) : null;
      if (!match || !Number.isSafeInteger(copy.at) || copy.at < 0 || Number(match[1]) !== copy.at || !/^[a-f0-9]{64}$/.test(copy.sha256) || files.has(copy.file)) throw new Error('BACKUP_CATALOG_INVALID');
      files.add(copy.file);
    }
    return catalog;
  }
  private save(catalog: Catalog, initial = false) {
    const bytes = seal(Buffer.from(JSON.stringify(catalog)), Buffer.from(this.state.key, 'hex'), this.context());
    if (initial) writePrivate(this.catalogPath(), bytes); else replacePrivate(this.catalogPath(), bytes);
  }
  private verifiedBytes(copy: ScheduledCopy) {
    const path = join(this.state.directory, copy.file);
    if (!lstatSync(path).isFile()) throw new Error('BACKUP_FILE_CHANGED'); // Do not follow symlinks for retention.
    const bytes = readBounded(path); if (hash(bytes) !== copy.sha256) throw new Error('BACKUP_FILE_CHANGED'); return bytes;
  }
  private prune(catalog: Catalog, now: number) {
    const keep = retainedCopies(catalog.copies, now);
    // Never discard older copies on the strength of a missing/changed retained copy.
    for (const copy of catalog.copies) if (keep.has(copy.file)) this.verifiedBytes(copy);
    for (const copy of catalog.copies) if (!keep.has(copy.file)) {
      const path = join(this.state.directory, copy.file);
      try { this.verifiedBytes(copy); unlinkSync(path); syncDirectory(this.state.directory); }
      catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
      // A crash between unlink and catalog replacement is recoverable: a missing
      // obsolete file is removed from the catalog on the next attempt.
    }
    const remaining = catalog.copies.filter(c => keep.has(c.file));
    if (remaining.length !== catalog.copies.length) this.save({ ...catalog, copies: remaining });
  }
  run(now = Date.now()): Promise<void> {
    if (this.active) return this.active;
    if (this.stopped || now < this.nextAttempt) return Promise.resolve();
    this.active = this.perform(now).finally(() => { this.active = undefined; }); return this.active;
  }
  private async perform(now: number) {
    this.statusValue = { state: 'running', nextAttemptAt: null };
    try {
      const current = recoveryState(this.store.db); if (!current || current.id !== this.state.id || current.directory !== this.state.directory || current.key !== this.state.key) throw new Error('BACKUP_CONFIGURATION_CHANGED');
      readJournal(current, this.store.owner()!);
      const catalog = this.read();
      const newest = Math.max(0, ...catalog.copies.map(c => c.at));
      if (now < newest) throw new Error('BACKUP_CLOCK_ROLLBACK');
      // Check cataloged copies before adding a new snapshot or allowing retention.
      const retained = retainedCopies(catalog.copies, now);
      for (const copy of catalog.copies) if (retained.has(copy.file)) this.verifiedBytes(copy);
      if (!catalog.copies.length || utcDay(now) > utcDay(newest)) {
        if (catalog.copies.length >= 128) throw new Error('BACKUP_CATALOG_CAPACITY');
        const file = await createBackup(this.store, this.database, this.password!, now);
        const name = basename(file).replace('jarvis-', `jarvis-auto-${this.state.id}-`);
        const destination = join(this.state.directory, name);
        renameSync(file, destination); syncDirectory(this.state.directory);
        catalog.copies.push({ file: name, at: now, sha256: hash(readBounded(destination)) });
        this.save(catalog);
      }
      this.prune(catalog, now);
      this.nextAttempt = (utcDay(now) + 1) * DAY;
      this.statusValue = { state: 'ready', nextAttemptAt: this.nextAttempt };
    } catch {
      this.nextAttempt = now + 15 * 60_000;
      this.statusValue = { state: 'attention', nextAttemptAt: this.nextAttempt };
    }
  }
  start() { if (this.timer || this.stopped) return; void this.run(); this.timer = setInterval(() => { void this.run(); }, 60_000); this.timer.unref(); }
  async stop() {
    this.stopped = true; if (this.timer) clearInterval(this.timer);
    await this.active; this.password = undefined; this.statusValue = { state: 'off', nextAttemptAt: null };
  }
}
