import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
export async function unlockBackupPassword() {
  if (!process.stdin.isTTY) throw new Error('INTERACTIVE_TERMINAL_REQUIRED');
  const rl = createInterface({ input: process.stdin, output: new Writable({ write(_chunk, _encoding, callback) { callback(); } }), terminal: true });
  const ask = (prompt: string): Promise<string> => {
    process.stdout.write(prompt);
    return new Promise((resolve, reject) => {
      const closed = () => reject(new Error('INPUT_CANCELLED')); rl.once('close', closed);
      rl.question('', answer => { rl.removeListener('close', closed); process.stdout.write('\n'); resolve(answer); });
    });
  };
  try {
    console.log('Automatic backups: one per UTC day while running; keep up to 7 daily and 4 weekly copies within 28 days. Only scheduler-owned copies are rotated.');
    console.log('The password is kept in this process only. Use the same scheduled-backup password after restart. See docs/development/automatic-backups.md.');
    const password = await ask('Scheduled-backup password (12–128 characters; hidden): ');
    if (password !== await ask('Repeat password: ')) throw new Error('PASSWORDS_DO_NOT_MATCH');
    return password;
  } finally { rl.close(); }
}
