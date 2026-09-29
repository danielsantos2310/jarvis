import { parseArgs } from 'node:util';
import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
import { dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { acquireData } from './paths.ts';
import { Store } from './database.ts';
import { configureRecovery, syncDeletions } from './deletion-journal.ts';
import { createBackup, restoreBackup } from './backup.ts';
import { hashPassword } from './security.ts';
const usage = `Stop JARVIS first. Recovery commands (synthetic data until Windows validation):
  npm run backup -- configure --recovery-dir "E:\\JARVIS-Recovery"
  npm run backup -- create
  npm run backup -- sync
  npm run backup -- restore --file "E:\\JARVIS-Recovery\\snapshot.jbackup" --recovery-dir "E:\\JARVIS-Recovery" --target "C:\\JARVIS-Restored"
Restore requires the CURRENT independent journal and a NEW target directory.
Stop the original core throughout recovery; never run original and restored copies together.
See docs/development/backup-recovery.md. Passwords are prompted, never command arguments.`;
process.umask(0o077);
let rl: ReturnType<typeof createInterface> | undefined;
function ask(prompt: string): Promise<string> {
  if (!process.stdin.isTTY) throw new Error('INTERACTIVE_TERMINAL_REQUIRED');
  rl ??= createInterface({ input: process.stdin, output: new Writable({ write(_c, _e, done) { done(); } }), terminal: true });
  process.stdout.write(prompt);
  return new Promise((resolve, reject) => {
    const closed = () => reject(new Error('INPUT_CANCELLED'));
    rl!.once('close', closed);
    rl!.question('', answer => { rl!.removeListener('close', closed); process.stdout.write('\n'); resolve(answer); });
  });
}
async function confirmedPassword(label: string) {
  const password = await ask(`${label} (12–128 characters; hidden): `);
  if (password !== await ask('Repeat password: ')) throw new Error('PASSWORDS_DO_NOT_MATCH'); return password;
}
try {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { 'recovery-dir': { type: 'string' }, file: { type: 'string' }, target: { type: 'string' }, help: { type: 'boolean' } } });
  const command = positionals[0];
  if (values.help || !command) console.log(usage);
  else if (positionals.length !== 1) throw new Error('INVALID_ARGUMENTS');
  else if (command === 'restore') {
    if (!values.file || !values.target || !values['recovery-dir']) throw new Error('RESTORE_ARGUMENTS_REQUIRED');
    const confirmation = await ask('Confirm the original core is stopped and this is the latest independent deletion journal. Type CURRENT: ');
    if (confirmation !== 'CURRENT') throw new Error('CURRENT_JOURNAL_REQUIRED');
    const password = await ask('Backup password (hidden): ');
    const newPasswordHash = await hashPassword(await confirmedPassword('New restored-workspace password'));
    const result = await restoreBackup({ file: values.file, target: values.target, recoveryDirectory: values['recovery-dir'], password, newPasswordHash });
    console.log(`Verified restore saved to ${result.target}. Replayed ${result.replayedDeletions} deletion records.\nActions are paused and permission is revoked. Point JARVIS_DATA_DIR at the restored folder, sign in with the NEW password, then review Controls.`);
  } else if (['configure', 'create', 'sync'].includes(command)) {
    if (values.file || values.target || (command !== 'configure' && values['recovery-dir'])) throw new Error('INVALID_ARGUMENTS');
    if (command === 'configure' && !values['recovery-dir']) throw new Error('RECOVERY_DIRECTORY_REQUIRED');
    const data = acquireData(); let store: Store | undefined;
    try {
      if (!existsSync(data.database)) throw new Error('NOT_ENROLLED');
      store = new Store(data.database);
      if (command === 'configure') { configureRecovery(store.db, values['recovery-dir']!, dirname(data.database)); console.log('Independent encrypted deletion journal configured. Create your first backup next.'); }
      else if (command === 'sync') { syncDeletions(store.db); console.log('Deletion journal synchronized.'); }
      else console.log(`Encrypted backup verified: ${await createBackup(store, data.database, await confirmedPassword('Separate backup password'))}`);
    } finally { store?.close(); data.release(); }
  } else throw new Error('UNKNOWN_COMMAND');
} catch (error) {
  const message = error instanceof Error ? error.message : '';
  // Do not print filesystem paths, keys, password values or decrypted content from incidental errors.
  console.error(/^[A-Z][A-Z0-9_]+$/.test(message) ? message : 'BACKUP_OPERATION_FAILED: check the guide, available disk space, recovery drive and runtime lock.'); process.exitCode = 1;
} finally { rl?.close(); }
