import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
import { Store } from './database.ts';
import { hashPassword } from './security.ts';
import { acquireData } from './paths.ts';
if (!process.stdin.isTTY) throw new Error('Run recovery in an interactive terminal.');
process.umask(0o077);
const data = acquireData();
let store: Store | undefined;
try {
  store = new Store(data.database);
  if (!store.owner()) throw new Error('Complete first-time browser setup instead.');
  const muted = new Writable({ write(_chunk, _encoding, callback) { callback(); } });
  const rl = createInterface({ input: process.stdin, output: muted, terminal: true });
  const ask = (prompt: string): Promise<string> => { process.stdout.write(prompt); return new Promise(resolve => rl.question('', answer => { process.stdout.write('\n'); resolve(answer); })); };
  try {
    console.log('Local password recovery. Stop the JARVIS server first. Saved items will be retained; sessions will be revoked and actions paused.');
    const password = await ask('New password (12–128 characters; hidden): ');
    if (password !== await ask('Repeat password: ')) throw new Error('Passwords did not match.');
    store.recover(await hashPassword(password), Date.now());
    console.log('Password replaced. Start JARVIS and sign in, then review and resume your workspace.');
  } finally { rl.close(); }
} finally { store?.close(); data.release(); }
