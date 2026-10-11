import { checkInstallation } from './doctor.ts';
const args = process.argv.slice(2);
if (args.includes('--help') && args.length === 1) {
  console.log('Usage: npm run doctor -- [--json]\nRun before startup, from the repository root. No installs, workspace writes or external requests. Briefly checks the loopback port.');
} else if (args.some(arg => arg !== '--json') || args.length > 1) {
  console.error('Usage: npm run doctor -- [--json]'); process.exitCode = 2;
} else {
  try {
    const report = await checkInstallation();
    if (args.includes('--json')) console.log(JSON.stringify(report, null, 2));
    else {
      console.log('JARVIS — installation check');
      for (const check of report.checks) {
        console.log(`[${check.state.toUpperCase()}] ${check.name}: ${check.detail}`);
        if (check.next) console.log(`  Next: ${check.next}`);
      }
      console.log(report.readyToAttemptStartup ? '\nReady to attempt local startup: npm start' : '\nResolve the failed checks, then rerun npm run doctor.');
      for (const limit of report.limits) console.log(`- ${limit}`);
    }
    process.exitCode = report.readyToAttemptStartup ? 0 : 1;
  } catch { console.error('INSTALLATION_CHECK_FAILED: consult docs/development/installation-night.md.'); process.exitCode = 2; }
}
