// Synthetic speech fixture: never imported by the production server.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../src/core/database.ts';
import { createApp } from '../src/core/app.ts';
import { makeWav } from '../src/core/voice.ts';
const dir = mkdtempSync(join(tmpdir(), 'jarvis-speech-ui-'));
const store = new Store(join(dir, 'test.sqlite'));
const pcm = Buffer.alloc(16000 * 2 * 3);
for (let i = 0; i < pcm.length / 2; i++) pcm.writeInt16LE(Math.round(Math.sin(i * Math.PI * 2 * 220 / 16000) * 8000), i * 2);
const app = await createApp({ store, port: 3098, bootstrapCode: 'synthetic-browser-setup', speech: {
  status: async () => ({ stt: true, tts: true }),
  transcribe: async audio => { if (!audio.some(byte => byte !== 0)) throw new Error('No captured signal'); return 'add task Voice review check'; },
  synthesize: async () => makeWav(pcm, 16000),
} });
await app.listen({ host: '127.0.0.1', port: 3098 });
async function stop() { await app.close(); store.close(); rmSync(dir, { recursive: true, force: true }); }
process.once('SIGINT', () => void stop()); process.once('SIGTERM', () => void stop());
