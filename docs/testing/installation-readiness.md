# Installation readiness evidence — 11 October 2026

Scope: a prerequisite CLI (`npm run doctor`) and current installation documentation. No runtime authority, browser UI, dependencies, database schema, cloud connection or automatic startup was changed.

## Executed checks

- `npm run check`: local production build/typecheck passed; all 66 unit/integration tests passed.
- Final `npm run typecheck`: passed.
- `node --test tests/doctor.test.ts`: all five passed again after the final diagnostic-copy adjustment.
- `npm run doctor`: required checks passed on the Linux development host. Optional Gmail and speech were not configured/probed. No target-PC readiness is inferred.
- `npm run security:review`: passed against source and both available build outputs; no recognized secret patterns or unexpected public artifacts. This heuristic is not an independent security review.
- `git diff --check`: passed.

The five new tests cover missing repository/build/dependencies, unsupported runtime, invalid ports without probing, filesystem non-mutation, secret/path redaction, incomplete restore and lock refusal, a file used as workspace directory, occupied/released loopback listeners, CLI help/argument handling and machine-readable nonzero failure output.

No browser files changed; no new browser tests or Pages deployment are required for this CLI-only update. The existing published voice/clap preview is unchanged.

## Remaining evidence

Windows/Linux target OS selection, real Windows access semantics, disk encryption, lock recovery UX, physical microphone/speakers, model performance/licensing, off-disk restore, offline worker behavior and owner sign-off remain pending. Filesystem access checks are advisory; the actual server still enforces runtime locks and handles startup errors. A successful port check cannot reserve the port for later startup.

Use [installation-night.md](../development/installation-night.md) on the PC. Do not commit personal data, audio, credentials or private diagnostic traces while collecting acceptance evidence.
