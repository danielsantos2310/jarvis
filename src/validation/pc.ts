import { arch, cpus, freemem, platform, release, tmpdir, totalmem } from 'node:os';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, statfsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createServer } from 'node:net';
import { randomBytes, randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { execFileSync } from 'node:child_process';
import { Store } from '../core/database.ts';
import { createApp } from '../core/app.ts';
import { acquireData } from '../core/paths.ts';
import { createBackup, restoreBackup } from '../core/backup.ts';
import { configureRecovery } from '../core/deletion-journal.ts';
import { hashPassword } from '../core/security.ts';
export interface Check { name: string; result: 'passed' | 'failed'; durationMs: number; error?: string }
export interface PcReport {
  format: 1; startedAt: string; finishedAt: string; result: 'passed' | 'failed';
  environment: { platform: string; osRelease: string; architecture: string; node: string; timezone: string; cpu: string; logicalCpus: number; memoryTotalMiB: number; memoryFreeMiB: number; appVersion: string; commit: string | null; workingTree: 'clean' | 'modified' | 'unknown' };
  storage: { sourceFreeMiB: number | null; recoveryFreeMiB: number | null; volumeComparison: 'same-volume' | 'different-volume' | 'unverified' };
  checks: Check[];
  remainingManualChecks: string[];
}
function requireCheck(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
function freeMiB(path: string) { const s = statfsSync(path); return Math.floor(s.bavail * s.bsize / 1048576); }
async function unusedPort() {
  const server = createServer();
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const address = server.address(); const port = typeof address === 'object' && address ? address.port : 0;
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); return port;
}
export async function validatePc(recoveryDirectory: string): Promise<{ report: PcReport; remainingPaths: string[] }> {
  const startedAt = new Date().toISOString();
  const checks: Check[] = []; const cp = cpus(); let commit: string | null = null; let workingTree: 'clean' | 'modified' | 'unknown' = 'unknown';
  try { const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); if (/^[0-9a-f]{40}$/.test(head)) commit = head; workingTree = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() ? 'modified' : 'clean'; } catch { /* Git metadata is optional. */ }
  const report: PcReport = { format: 1, startedAt, finishedAt: '', result: 'failed', environment: {
    platform: platform(), osRelease: release(), architecture: arch(), node: process.versions.node, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    cpu: cp[0]?.model ?? 'unknown', logicalCpus: cp.length, memoryTotalMiB: Math.floor(totalmem() / 1048576), memoryFreeMiB: Math.floor(freemem() / 1048576),
    appVersion: JSON.parse(readFileSync('package.json', 'utf8')).version, commit, workingTree,
  }, storage: { sourceFreeMiB: null, recoveryFreeMiB: null, volumeComparison: 'unverified' }, checks,
  remainingManualChecks: [
    'Confirm the recovery location is on a separate physical drive and protected by suitable account permissions.',
    'Confirm host disk encryption and independent backup-password custody; do not record keys in this report.',
    'Complete the browser, keyboard, mobile layout and hidden terminal-password workflow on this PC.',
    'Validate Ctrl+C shutdown, restart, sleep/wake and removable-drive disconnect/reconnect using synthetic data.',
    'Validate OS-enforced WAN denial, disk-full/power-loss behavior, accessibility and the full workload performance gate.',
    'Automatic backup scheduling/rotation and the household RPO/RTO drill remain open.',
  ] };
  let sourceRoot: string | undefined; let recoveryRoot: string | undefined; let source: Store | undefined; let restored: Store | undefined;
  let app: Awaited<ReturnType<typeof createApp>> | undefined; const remainingPaths: string[] = [];
  async function check(name: string, fn: () => unknown | Promise<unknown>) {
    const start = performance.now();
    try { await fn(); checks.push({ name, result: 'passed', durationMs: Math.round(performance.now() - start) }); }
    catch (e) { const message = e instanceof Error ? e.message : ''; checks.push({ name, result: 'failed', durationMs: Math.round(performance.now() - start), error: /^[A-Z][A-Z0-9_]+$/.test(message) ? message : 'VALIDATION_STEP_FAILED' }); throw e; }
  }
  try {
    await check('runtime-and-build', () => {
      const [major, minor] = process.versions.node.split('.').map(Number);
      requireCheck(major === 24 && minor >= 19, 'NODE_24_19_REQUIRED');
      requireCheck(existsSync('dist/index.html'), 'BUILD_REQUIRED');
      requireCheck(statSync(recoveryDirectory).isDirectory(), 'RECOVERY_DIRECTORY_REQUIRED');
    });
    await check('isolated-storage', () => {
      sourceRoot = mkdtempSync(join(tmpdir(), 'jarvis-pc-check-'));
      mkdirSync(join(sourceRoot, 'live'), { mode: 0o700 });
      recoveryRoot = mkdtempSync(join(resolve(recoveryDirectory), 'jarvis-recovery-check-'));
      report.storage.sourceFreeMiB = freeMiB(sourceRoot); report.storage.recoveryFreeMiB = freeMiB(recoveryRoot);
      if (platform() !== 'win32') report.storage.volumeComparison = statSync(sourceRoot).dev === statSync(recoveryRoot).dev ? 'same-volume' : 'different-volume';
    });
    const live = join(sourceRoot!, 'live');
    await check('runtime-lock-and-release', () => {
      const previous = process.env.JARVIS_DATA_DIR; process.env.JARVIS_DATA_DIR = live;
      try {
        const held = acquireData();
        try {
          let blocked = false;
          try { const unexpected = acquireData(); unexpected.release(); } catch (e) { blocked = e instanceof Error && e.message.startsWith('DATA_LOCKED:'); }
          requireCheck(blocked, 'CONCURRENT_START_NOT_BLOCKED');
        } finally { held.release(); }
        requireCheck(!existsSync(join(live, 'runtime.lock')), 'LOCK_NOT_RELEASED');
      } finally { if (previous === undefined) delete process.env.JARVIS_DATA_DIR; else process.env.JARVIS_DATA_DIR = previous; }
    });
    const database = join(live, 'jarvis.sqlite'); const password = randomBytes(32).toString('base64url');
    const backupPassword = randomBytes(32).toString('base64url'); const restoredPassword = randomBytes(32).toString('base64url');
    let keepId = ''; let deleteId = ''; let file = '';
    await check('synthetic-workspace-and-restart', async () => {
      source = new Store(database); const owner = source.enroll(await hashPassword(password), Date.now());
      keepId = source.action(owner, randomUUID(), { type: 'item.create', kind: 'task', title: 'Synthetic retained validation item' }, Date.now()).entityId;
      deleteId = source.action(owner, randomUUID(), { type: 'item.create', kind: 'reminder', title: 'Synthetic deleted validation item', dueAt: Date.now() + 60_000 }, Date.now()).entityId;
      source.close(); source = new Store(database); requireCheck(source.list(source.owner()!).length === 2, 'RESTART_DATA_MISMATCH');
    });
    await check('encrypted-backup-on-selected-location', async () => {
      configureRecovery(source!.db, recoveryRoot!, live); file = await createBackup(source!, database, backupPassword);
      requireCheck(!readFileSync(file).includes(Buffer.from('Synthetic retained validation item')), 'PLAINTEXT_IN_BACKUP');
    });
    await check('independent-deletion-sync', () => {
      source!.action(source!.owner()!, randomUUID(), { type: 'item.delete', id: deleteId }, Date.now());
      requireCheck(source!.recoveryStatus().deletionSync === 'synced', 'JOURNAL_SYNC_PENDING');
      requireCheck(source!.list(source!.owner()!).every(item => item.id !== deleteId), 'LIVE_DELETION_FAILED');
      source!.close(); source = undefined;
    });
    const target = join(sourceRoot!, 'restored');
    await check('isolated-restore-and-deletion-replay', async () => {
      const result = await restoreBackup({ file, password: backupPassword, recoveryDirectory: recoveryRoot!, target, newPasswordHash: await hashPassword(restoredPassword) });
      requireCheck(result.replayedDeletions === 1, 'DELETION_REPLAY_MISMATCH');
      restored = new Store(join(target, 'jarvis.sqlite'));
      requireCheck(restored.paused() && restored.owner()!.grant_enabled === 0, 'RESTORED_AUTHORITY_NOT_REVOKED');
      requireCheck(restored.db.prepare('SELECT COUNT(*) n FROM items').get()!.n === 1, 'RESTORED_ITEMS_MISMATCH');
    });
    await check('loopback-http-login-and-permission-reapproval', async () => {
      const port = await unusedPort(); app = await createApp({ store: restored!, port, bootstrapCode: 'unused-synthetic-code', serveWeb: true });
      await app.listen({ host: '127.0.0.1', port }); const base = `http://127.0.0.1:${port}`;
      const fetchLocal = (path: string, init?: RequestInit) => fetch(base + path, { ...init, signal: AbortSignal.timeout(5000) });
      requireCheck((await fetchLocal('/')).status === 200, 'DASHBOARD_NOT_SERVED');
      requireCheck((await fetchLocal('/api/snapshot')).status === 401, 'ANONYMOUS_SNAPSHOT_EXPOSED');
      const login = await fetchLocal('/api/login', { method: 'POST', headers: { origin: base, 'content-type': 'application/json' }, body: JSON.stringify({ password: restoredPassword }) });
      requireCheck(login.status === 200, 'RESTORED_LOGIN_FAILED'); const auth = await login.json() as { csrf: string };
      const cookie = login.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
      const hidden = await (await fetchLocal('/api/snapshot', { headers: { cookie } })).json() as { items: unknown[]; grant: boolean; paused: boolean };
      requireCheck(!hidden.grant && hidden.paused && hidden.items.length === 0, 'REVOKED_ITEMS_EXPOSED');
      const granted = await fetchLocal('/api/control', { method: 'POST', headers: { origin: base, 'content-type': 'application/json', cookie, 'x-csrf-token': auth.csrf }, body: JSON.stringify({ change: 'grant', password: restoredPassword }) });
      requireCheck(granted.status === 200, 'PERMISSION_REAPPROVAL_FAILED');
      const visible = await (await fetchLocal('/api/snapshot', { headers: { cookie } })).json() as { items: {id:string}[]; paused: boolean };
      requireCheck(visible.paused && visible.items.length === 1 && visible.items[0].id === keepId, 'RESTORED_VISIBLE_ITEMS_MISMATCH');
      await app.close(); app = undefined; restored!.close(); restored = undefined;
    });
  } catch { /* The failed check is already recorded; clean up only directories owned by this run. */ }
  finally {
    await check('synthetic-data-cleanup', async () => {
      let failed = false;
      try { await app?.close(); } catch { failed = true; }
      try { source?.close(); } catch { failed = true; }
      try { restored?.close(); } catch { failed = true; }
      for (const path of [sourceRoot, recoveryRoot]) if (path) {
        try { rmSync(path, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch { failed = true; remainingPaths.push(path); }
      }
      requireCheck(!failed, 'MANUAL_CLEANUP_REQUIRED');
    }).catch(() => undefined);
  }
  report.finishedAt = new Date().toISOString(); report.result = checks.length === 9 && checks.every(c => c.result === 'passed') ? 'passed' : 'failed';
  return { report, remainingPaths };
}
