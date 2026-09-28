import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { createApp } from './app.ts';
import { Store } from './database.ts';
import { acquireData } from './paths.ts';
const port = Number(process.env.JARVIS_PORT ?? 3000);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('JARVIS_PORT must be 1024–65535.');
if (!existsSync('dist/index.html')) throw new Error('Run npm run build first.');
process.umask(0o077);
const data = acquireData();
let store: Store | undefined;
try {
  store = new Store(data.database);
  const code = randomBytes(24).toString('base64url');
  const app = await createApp({ store, port, bootstrapCode: code });
  await app.listen({ host: '127.0.0.1', port });
  console.log(`JARVIS local alpha: http://127.0.0.1:${port}`);
  if (!store.owner()) console.log(`First-time setup code (expires in 10 minutes): ${code}`);
  console.log('Press Ctrl+C to stop. Timers only update while this PC and core are running.');
  let closing = false;
  const stop = async () => { if (closing) return; closing = true; await app.close(); store!.close(); data.release(); };
  process.once('SIGINT', () => { void stop(); }); process.once('SIGTERM', () => { void stop(); });
} catch (error) {
  store?.close(); data.release();
  console.error(error instanceof Error && error.message.startsWith('DATABASE_VERSION') ? error.message : 'JARVIS could not start. Check that the port is free and the data directory is writable.');
  process.exitCode = 1;
}
