import { mkdirSync, openSync, writeFileSync, closeSync, unlinkSync, chmodSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
export function acquireData() {
  const dir = resolve(process.env.JARVIS_DATA_DIR ?? '.jarvis');
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  if (process.platform !== 'win32') chmodSync(dir, 0o700);
  if (existsSync(join(dir, 'restore-incomplete'))) throw new Error('RESTORE_INCOMPLETE: this isolated restore did not finish; keep it offline.');
  const lock = join(dir, 'runtime.lock');
  let fd: number;
  try { fd = openSync(lock, 'wx', 0o600); }
  catch { throw new Error('DATA_LOCKED: another JARVIS process may be running. See docs/development/windows-quickstart.md before removing runtime.lock.'); }
  writeFileSync(fd, String(process.pid)); closeSync(fd);
  let released = false;
  return { database: join(dir, 'jarvis.sqlite'), release: () => { if (!released) { unlinkSync(lock); released = true; } } };
}
