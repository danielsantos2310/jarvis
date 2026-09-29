import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validatePc } from '../src/validation/pc.ts';
test('PC drill preserves existing workspace and recovery files, restores environment, reports only bounded metadata and cleans synthetic data', async () => {
  const root = mkdtempSync(join(tmpdir(), 'jarvis-pc-wrapper-')); const live = join(root, 'existing'); const recovery = join(root, 'recovery');
  mkdirSync(live); mkdirSync(recovery); writeFileSync(join(live, 'jarvis.sqlite'), 'EXISTING DATA DO NOT OPEN'); writeFileSync(join(recovery, 'keep.txt'), 'EXISTING RECOVERY DATA');
  const previous = process.env.JARVIS_DATA_DIR; process.env.JARVIS_DATA_DIR = live;
  try {
    const { report, remainingPaths } = await validatePc(recovery);
    assert.equal(report.result, 'passed', JSON.stringify(report.checks)); assert.equal(report.checks.length, 9); assert.equal(remainingPaths.length, 0);
    assert.equal(process.env.JARVIS_DATA_DIR, live); assert.equal(readFileSync(join(live, 'jarvis.sqlite'), 'utf8'), 'EXISTING DATA DO NOT OPEN');
    assert.deepEqual(readdirSync(recovery), ['keep.txt']); assert.equal(readFileSync(join(recovery, 'keep.txt'), 'utf8'), 'EXISTING RECOVERY DATA');
    assert(!JSON.stringify(report).includes(root)); assert(!JSON.stringify(report).includes('Synthetic retained validation item'));
    assert(report.remainingManualChecks.some(c => c.includes('physical drive')));
  } finally { if (previous === undefined) delete process.env.JARVIS_DATA_DIR; else process.env.JARVIS_DATA_DIR = previous; rmSync(root, { recursive: true, force: true }); }
});
test('invalid recovery directory returns failed prerequisite and leaves unrelated files untouched', async () => {
  const root = mkdtempSync(join(tmpdir(), 'jarvis-pc-invalid-')); const file = join(root, 'not-a-directory'); writeFileSync(file, 'UNCHANGED');
  try {
    const { report, remainingPaths } = await validatePc(file);
    assert.equal(report.result, 'failed'); assert.equal(report.checks[0].result, 'failed');
    assert.equal(report.checks[0].error, 'RECOVERY_DIRECTORY_REQUIRED');
    assert.equal(report.checks.at(-1)?.result, 'passed'); assert.deepEqual(remainingPaths, []); assert.equal(readFileSync(file, 'utf8'), 'UNCHANGED');
  } finally { rmSync(root, { recursive: true, force: true }); }
});
