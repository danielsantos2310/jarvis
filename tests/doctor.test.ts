import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { execFileSync } from 'node:child_process';
import { checkInstallation, checkPort } from '../src/validation/doctor.ts';

test('doctor finds blockers, does not create a workspace and does not leak secrets', async () => {
  const root = mkdtempSync(join(tmpdir(), 'jarvis-doctor-'));
  const options = { root, version: '24.19.0', env: {}, dependencyCheck: () => true, portCheck: async () => true };
  try {
    assert.equal((await checkInstallation(options)).readyToAttemptStartup, false);
    mkdirSync(join(root, 'src/core'), { recursive: true }); mkdirSync(join(root, 'dist'));
    for (const path of ['package.json', 'src/core/server.ts', 'dist/index.html', 'dist/voice-capture.js']) writeFileSync(join(root, path), 'fixture');
    const before = readdirSync(root, { recursive: true });
    const good = await checkInstallation(options);
    assert.equal(good.readyToAttemptStartup, true);
    assert.deepEqual(readdirSync(root, { recursive: true }), before);
    assert.equal((await checkInstallation({ ...options, version: '25.0.0' })).readyToAttemptStartup, false);
    assert.equal((await checkInstallation({ ...options, dependencyCheck: () => { throw new Error('private-file'); } })).readyToAttemptStartup, false);
    let calls = 0;
    const invalid = await checkInstallation({ ...options, env: { JARVIS_PORT: 'secret-invalid-port' }, portCheck: async () => { calls++; return true; } });
    assert.equal(calls, 0); assert.equal(invalid.readyToAttemptStartup, false);
    assert(!JSON.stringify(invalid).includes('secret-invalid-port'));
    const sensitive = await checkInstallation({ ...options, env: { JARVIS_DATA_DIR: join(root, 'private-owner/future-workspace'), JARVIS_GOOGLE_CLIENT_ID: 'private-id', JARVIS_GOOGLE_CLIENT_SECRET: 'private-token' } });
    assert.equal(sensitive.readyToAttemptStartup, true);
    for (const value of [root, 'private-owner', 'private-id', 'private-token']) assert(!JSON.stringify(sensitive).includes(value));
    assert.deepEqual(readdirSync(root, { recursive: true }), before);
    assert.equal((await checkInstallation({ ...options, env: { JARVIS_DATA_DIR: 'invalid\0path' } })).readyToAttemptStartup, false);
    assert.equal((await checkInstallation({ ...options, portCheck: async () => { throw new Error('private error'); } })).readyToAttemptStartup, false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('doctor refuses locked/incomplete/file workspaces without touching existing records', async () => {
  const root = mkdtempSync(join(tmpdir(), 'jarvis-doctor-existing-'));
  try {
    const data = join(root, 'data'); mkdirSync(data);
    writeFileSync(join(data, 'jarvis.sqlite'), 'synthetic data sentinel');
    writeFileSync(join(data, 'runtime.lock'), 'synthetic lock');
    writeFileSync(join(data, 'restore-incomplete'), 'synthetic marker');
    const options = { root, version: '24.19.0', env: { JARVIS_DATA_DIR: data }, portCheck: async () => true, dependencyCheck: () => true };
    const report = await checkInstallation(options);
    for (const name of ['Workspace lock', 'Restore marker']) assert.equal(report.checks.find(c => c.name === name)?.state, 'fail');
    assert.equal(readFileSync(join(data, 'jarvis.sqlite'), 'utf8'), 'synthetic data sentinel');
    assert.equal(readFileSync(join(data, 'runtime.lock'), 'utf8'), 'synthetic lock');
    const file = await checkInstallation({ ...options, env: { JARVIS_DATA_DIR: join(data, 'jarvis.sqlite') } });
    assert.equal(file.checks.find(c => c.name === 'Workspace location')?.state, 'fail');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('loopback availability check detects occupancy and releases its own listener', async () => {
  const server = createServer();
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as { port: number }).port;
  try { assert.equal(await checkPort(port), false); }
  finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
  assert.equal(await checkPort(port), true);
  assert.equal(await checkPort(port), true);
});

test('doctor CLI help and invalid arguments do not run diagnostics', () => {
  const command = 'src/validation/doctor-cli.ts';
  assert.match(execFileSync(process.execPath, [command, '--help'], { encoding: 'utf8' }), /Usage/);
  assert.throws(() => execFileSync(process.execPath, [command, '--unknown'], { stdio: 'pipe' }), error => (error as {status:number}).status === 2);
});

test('doctor JSON CLI uses nonzero exit for blockers without echoing environment values', () => {
  try {
    execFileSync(process.execPath, ['src/validation/doctor-cli.ts', '--json'], {
      encoding: 'utf8', env: { ...process.env, JARVIS_PORT: 'private-invalid-port', JARVIS_GOOGLE_CLIENT_SECRET: 'private-secret-value' }, stdio: 'pipe',
    });
    assert.fail('Expected a failed port check');
  } catch (error) {
    const result = error as { status: number; stdout: string };
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stdout).readyToAttemptStartup, false);
    assert(!result.stdout.includes('private-invalid-port'));
    assert(!result.stdout.includes('private-secret-value'));
  }
});
