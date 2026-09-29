import { parseArgs } from 'node:util';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { validatePc } from './pc.ts';
import { writePrivate } from '../core/backup-crypto.ts';
process.umask(0o077);
try {
  const { values } = parseArgs({ options: { 'recovery-dir': { type: 'string' }, help: { type: 'boolean' } } });
  if (values.help || !values['recovery-dir']) {
    console.log('Build first: npm run build\nRun: npm run validate:pc -- --recovery-dir "E:\\JARVIS-Recovery"\nChoose an existing local directory. The drill creates and removes only its own synthetic subfolders.\nIt does not open your JARVIS_DATA_DIR or .jarvis workspace, install software, change firewall settings or make external network requests.\nA hardware/results report without passwords, personal records or filesystem paths is written to artifacts/.\nSee docs/development/pc-validation.md.');
    if (!values.help) process.exitCode = 1;
  } else {
    console.log('Running isolated PC/recovery validation with temporary synthetic data…');
    const { report, remainingPaths } = await validatePc(values['recovery-dir']);
    mkdirSync('artifacts', { recursive: true, mode: 0o700 });
    const file = join('artifacts', `pc-validation-${Date.now()}-${randomUUID()}.json`);
    writePrivate(file, JSON.stringify(report, null, 2) + '\n');
    for (const check of report.checks) console.log(`${check.result.toUpperCase()} ${check.name} (${check.durationMs} ms)${check.error ? `: ${check.error}` : ''}`);
    console.log(`Report: ${file}\nPlatform: ${report.environment.platform}. Recovery-volume comparison: ${report.storage.volumeComparison}.\nA passed drill is not full Milestone 1 acceptance. Complete the remaining manual checks in the report.`);
    for (const path of remainingPaths) console.error(`Synthetic temporary data needs manual cleanup: ${path}`);
    if (report.result !== 'passed') process.exitCode = 1;
  }
} catch {
  console.error('PC_VALIDATION_FAILED: run from the repository root; check the command, chosen directory and available storage.'); process.exitCode = 1;
}
