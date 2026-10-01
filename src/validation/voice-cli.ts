import { checkVoice } from './voice-readiness.ts';
const args = process.argv.slice(2);
if (args.some(arg => arg !== '--json')) {
  console.error('Usage: npm run voice:check -- [--json]'); process.exitCode = 2;
} else {
  try {
    const report = await checkVoice();
    if (args.includes('--json')) console.log(JSON.stringify(report, null, 2));
    else {
      console.log('JARVIS — local voice readiness');
      for (const check of report.checks) { console.log(`[${check.state.toUpperCase()}] ${check.name}: ${check.detail}`); if (check.next) console.log(`  Next: ${check.next}`); }
      console.log(report.readyForBrowserTest ? '\nReady for a browser test. Run npm run start:voice, unlock, and select Check voice engines.' : '\nNot ready yet. Follow the steps above and rerun npm run voice:check.');
      for (const limit of report.limits) console.log(`- ${limit}`);
    }
    process.exitCode = report.readyForBrowserTest ? 0 : 1;
  } catch { console.error('Voice readiness check failed. Run it from the JARVIS repository root and consult docs/development/local-voice.md.'); process.exitCode = 2; }
}
