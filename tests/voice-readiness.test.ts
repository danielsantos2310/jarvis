import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkVoice } from '../src/validation/voice-readiness.ts';
test('readiness supports native workers, identifies missing prerequisites and rejects invalid ports before probing', async () => {
  const root = mkdtempSync(join(tmpdir(), 'jarvis-readiness-'));
  const options = { root, version: '24.19.0', dockerCheck: async () => false, probe: async () => ({ stt: true, tts: true }) };
  try {
    assert.equal((await checkVoice(options)).readyForBrowserTest, false);
    mkdirSync(join(root, 'dist')); writeFileSync(join(root, 'dist/index.html'), 'fixture'); writeFileSync(join(root, 'dist/voice-capture.js'), 'fixture');
    const good = await checkVoice(options); assert.equal(good.readyForBrowserTest, true);
    assert.equal(good.checks.find(c => c.name === 'Docker engine')?.state, 'optional');
    assert.equal((await checkVoice({ ...options, version: '25.0.0' })).readyForBrowserTest, false);
    const missing = await checkVoice({ ...options, probe: async () => ({ stt: true, tts: false }) });
    assert.equal(missing.checks.find(c => c.name === 'Piper')?.state, 'fail');
    let called = false;
    const invalid = await checkVoice({ ...options, sttPort: 80, probe: async () => { called = true; return { stt: true, tts: true }; } });
    assert.equal(invalid.readyForBrowserTest, false); assert.equal(called, false);
    const failed = await checkVoice({ ...options, probe: async () => { throw new Error('secret local path'); } });
    assert(!JSON.stringify(failed).includes('secret local path')); assert.equal(failed.readyForBrowserTest, false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
