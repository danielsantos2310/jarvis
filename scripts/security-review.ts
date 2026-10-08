import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Heuristic release gate, not a replacement for secret scanning or code review.
// Report filenames only: never echo a suspected credential into logs.
const findings = new Set<string>();
const tracked = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{40,}\b/,
  /\bAIza[A-Za-z0-9_-]{35}\b/,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{40,}\b/,
  /\bAKIA[A-Z0-9]{16}\b/,
];
function inspect(path: string) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, 'utf8');
  if (patterns.some(pattern => pattern.test(content))) findings.add(path);
}
for (const path of tracked) {
  if (/(^|\/)\.env(?:\.|$)/.test(path) && !path.endsWith('.example')) findings.add(path);
  if (/\.(?:sqlite|db|pem|key|jbackup)$/.test(path)) findings.add(path);
  inspect(path);
}
for (const directory of ['dist', 'dist-demo']) {
  if (!existsSync(directory)) throw new Error(`Build ${directory} before publication review.`);
  for (const entry of readdirSync(directory, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const path = join(entry.parentPath, entry.name);
    if (/\.(?:map|sqlite|db|pem|key)$/.test(path) || entry.name.startsWith('.env')) findings.add(path);
    inspect(path);
    if (directory === 'dist-demo' && !/^(?:index\.html|voice-capture\.js|\.nojekyll|assets\/[\w.-]+\.(?:js|css))$/.test(path.slice(directory.length + 1))) findings.add(path);
  }
}
if (findings.size) { console.error('Publication review needs attention:', [...findings]); process.exitCode = 1; }
else console.log(`Publication review passed: ${tracked.length} tracked paths and both build outputs; no recognized secret patterns or unexpected public artifacts.`);
