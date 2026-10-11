import { accessSync, constants, existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';

type Check = { name: string; state: 'pass' | 'fail' | 'optional'; detail: string; next?: string };
export type DoctorReport = { readyToAttemptStartup: boolean; checks: Check[]; limits: string[] };

/** Briefly reserve loopback only, accept no data, then release. Never contacts a service. */
export function checkPort(port: number): Promise<boolean> {
  return new Promise(resolveResult => {
    const server = createServer(socket => socket.destroy());
    let settled = false;
    const finish = (available: boolean) => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      if (server.listening) server.close(() => resolveResult(available));
      else resolveResult(false);
    };
    const timer = setTimeout(() => finish(false), 2000);
    server.once('error', () => finish(false));
    server.once('listening', () => { if (settled) server.close(); else finish(true); });
    try { server.listen({ host: '127.0.0.1', port, exclusive: true }); } catch { finish(false); }
  });
}

export async function checkInstallation(options: {
  root?: string; version?: string; env?: NodeJS.ProcessEnv;
  portCheck?: (port: number) => Promise<boolean>;
  dependencyCheck?: () => boolean;
} = {}): Promise<DoctorReport> {
  const root = resolve(options.root ?? process.cwd());
  const env = options.env ?? process.env;
  const checks: Check[] = [];
  const add = (name: string, ok: boolean, detail: string, next: string) => checks.push({ name, state: ok ? 'pass' : 'fail', detail, ...(!ok ? { next } : {}) });
  const version = options.version ?? process.versions.node;
  const parts = version.split('.').map(Number);
  add('Node runtime', parts[0] === 24 && parts[1] >= 19, 'Requires Node 24.19 or later within major 24.', 'Install the supported Node 24 runtime, reopen the terminal, and retry.');
  const isFile = (path: string) => { try { return statSync(path).isFile(); } catch { return false; } };
  add('Repository', isFile(join(root, 'package.json')) && isFile(join(root, 'src/core/server.ts')), 'Run this command from the JARVIS repository root.', 'Open the extracted/cloned JARVIS folder containing package.json.');
  let dependencies = false;
  try {
    dependencies = options.dependencyCheck ? options.dependencyCheck() : (() => {
      const require = createRequire(join(root, 'package.json'));
      for (const name of ['fastify', '@fastify/cookie', '@fastify/rate-limit', '@fastify/session', '@fastify/static', '@fastify/swagger', '@js-temporal/polyfill', 'react', 'react-dom', 'vite', 'typescript']) require.resolve(name);
      return true;
    })();
  } catch { /* Do not print package-manager errors or filesystem paths. */ }
  add('Dependencies', dependencies, dependencies ? 'Required packages resolve.' : 'Required packages are missing.', 'Run npm ci; do not use an automatic dependency upgrade for installation.');
  add('Local build', isFile(join(root, 'dist/index.html')) && isFile(join(root, 'dist/voice-capture.js')), 'Checks the local build, not the GitHub Pages sample.', 'Run npm run build. Rebuild after every source update.');

  try {
    const data = resolve(root, env.JARVIS_DATA_DIR ?? '.jarvis');
    if (data.includes('\0')) throw new Error('INVALID_PATH');
    let parent = data;
    while (true) {
      try { statSync(parent); break; } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT' || dirname(parent) === parent) throw error;
        parent = dirname(parent);
      }
    }
    let writable = false;
    try { writable = statSync(parent).isDirectory(); accessSync(parent, constants.W_OK | constants.X_OK); } catch { writable = false; }
    add('Workspace location', writable, writable ? 'Existing directory or nearest parent passes OS access checks.' : 'Workspace location is not accessible as a writable directory.', 'Choose a local private directory owned by your account. Do not run as administrator to bypass a permissions problem.');
    add('Workspace lock', !existsSync(join(data, 'runtime.lock')), 'A lock can mean JARVIS or recovery is already running.', 'Stop the existing core first. After a crash, verify the process has exited before following the documented lock recovery; never delete the database.');
    add('Restore marker', !existsSync(join(data, 'restore-incomplete')), 'An incomplete restore must remain offline.', 'Use the recovery guide to create a fresh isolated restore; do not remove the marker to force startup.');
  } catch {
    add('Workspace location', false, 'Workspace configuration could not be checked.', 'Check JARVIS_DATA_DIR without sharing its value or private files.');
  }

  const port = Number(env.JARVIS_PORT ?? 3000);
  const validPort = Number.isInteger(port) && port >= 1024 && port <= 65535;
  add('Port configuration', validPort, 'JARVIS_PORT must be an integer from 1024 to 65535.', 'Unset JARVIS_PORT for 3000 or choose a valid unoccupied local port.');
  if (validPort) {
    let available = false;
    try { available = await (options.portCheck ?? checkPort)(port); } catch { /* Redacted diagnostic. */ }
    add('Loopback port', available, available ? `127.0.0.1:${port} was available and released.` : 'Port is occupied or the OS denied the check.', 'Stop the existing JARVIS process or choose another JARVIS_PORT. This check never terminates processes or changes the firewall.');
  }
  const gmailId = !!env.JARVIS_GOOGLE_CLIENT_ID, gmailSecret = !!env.JARVIS_GOOGLE_CLIENT_SECRET;
  checks.push({ name: 'Gmail configuration', state: 'optional', detail: gmailId && gmailSecret ? 'Both variables are present; OAuth authorization has not been checked.' : gmailId || gmailSecret ? 'Only one required variable is present; Gmail will not connect.' : 'Not configured; the local core can still run.', next: 'For Gmail, follow docs/development/service-connections.md. Never paste credentials into a report or chat.' });
  checks.push({ name: 'Local voice', state: 'optional', detail: 'Whisper/Piper are optional and not probed by this command.', next: 'After starting the workers, run npm run voice:check, then npm run start:voice.' });
  return { readyToAttemptStartup: !checks.some(c => c.state === 'fail'), checks, limits: [
    'No database is opened, no files are created or changed, and no credentials or personal paths are printed. No microphone, cloud or account access.',
    'The port is briefly bound on loopback only. Availability and filesystem access can change before startup; the server remains authoritative.',
    'Package resolution/build presence do not prove exact versions or freshness. Run npm ci and npm run build from the reviewed checkout.',
    'This is not host-security or milestone acceptance. Test the real PC, disk encryption, permissions, off-disk recovery, peripherals and offline operation separately.',
  ] };
}
