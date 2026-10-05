import { localSpeech } from './voice.ts';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { createApp } from './app.ts';
import { Store } from './database.ts';
import { recoveryState } from './deletion-journal.ts';
import { AutomaticBackups } from './automatic-backups.ts';
import { unlockBackupPassword } from './backup-unlock.ts';
import { acquireData } from './paths.ts';
const automatic = process.argv.slice(2).includes('--backups');
if (process.argv.slice(2).some(arg => !['--backups', '--voice'].includes(arg))) throw new Error('Unknown server option. Supported: --backups, --voice');
const port = Number(process.env.JARVIS_PORT ?? 3000);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('JARVIS_PORT must be 1024–65535.');
if (!existsSync('dist/index.html')) throw new Error('Run npm run build first.');
process.umask(0o077);
const data = acquireData();
let store: Store | undefined;
let backups: AutomaticBackups | undefined;
try {
  store = new Store(data.database);
  if (automatic && !recoveryState(store.db)) throw new Error('RECOVERY_NOT_CONFIGURED');
  if (automatic) backups = await AutomaticBackups.unlock(store, data.database, await unlockBackupPassword());
  const code = randomBytes(24).toString('base64url');
  const gmail = process.env.JARVIS_GOOGLE_CLIENT_ID && process.env.JARVIS_GOOGLE_CLIENT_SECRET ? { clientId: process.env.JARVIS_GOOGLE_CLIENT_ID, clientSecret: process.env.JARVIS_GOOGLE_CLIENT_SECRET } : undefined;
  const app = await createApp({ gmail, speech: process.argv.includes('--voice') ? localSpeech(Number(process.env.JARVIS_STT_PORT ?? 10300), Number(process.env.JARVIS_TTS_PORT ?? 10200)) : undefined, store, port, bootstrapCode: code, automaticBackupStatus: () => backups?.status() ?? { state: 'off', nextAttemptAt: null } });
  await app.listen({ host: '127.0.0.1', port });
  backups?.start();
  console.log(`JARVIS local alpha: http://127.0.0.1:${port}`);
  if (!store.owner()) console.log(`First-time setup code (expires in 10 minutes): ${code}`);
  console.log('Press Ctrl+C to stop. Timers only update while this PC and core are running.');
  let closing = false;
  const stop = async () => { if (closing) return; closing = true; await app.close(); await backups?.stop(); store!.close(); data.release(); };
  process.once('SIGINT', () => { void stop(); }); process.once('SIGTERM', () => { void stop(); });
} catch (error) {
  await backups?.stop(); store?.close(); data.release();
  console.error(error instanceof Error && (/^[A-Z][A-Z0-9_]+$/.test(error.message) || error.message.startsWith('DATABASE_VERSION')) ? error.message : 'JARVIS could not start. Check that the port is free and the data directory is writable.');
  process.exitCode = 1;
}
