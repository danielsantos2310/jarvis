// Synthetic E2E harness, never used by npm start. No household data or production credentials.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../src/core/database.ts';
import { createApp } from '../src/core/app.ts';
const dir = mkdtempSync(join(tmpdir(), 'jarvis-ui-'));
const store = new Store(join(dir, 'test.sqlite'));
const app = await createApp({ store, port: 3098, bootstrapCode: 'synthetic-browser-setup' });
await app.listen({ host: '127.0.0.1', port: 3098 });
async function stop() { await app.close(); store.close(); rmSync(dir, { recursive: true, force: true }); }
process.once('SIGINT', () => void stop()); process.once('SIGTERM', () => void stop());
