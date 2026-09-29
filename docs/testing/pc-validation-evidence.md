# PC validation runner — implementation evidence

Date: 2026-09-29. Scope: validation tooling on the alpha-3 branch; no change to backup format, database schema or production authority model.

The initial direct `npm run validate:pc -- --recovery-dir /tmp` execution passed all nine checks in approximately 7.2 seconds on Linux x64 / Node 24.19.0. The selected location was on the same filesystem volume as the source. This is neither actual Windows evidence nor an off-disk recovery drill. The report included the restored instance's real loopback HTTP login, revoked-grant privacy, reapproval and retained/deleted item checks.

Verification: **38/38 core/domain/API/integration test groups passed** (about 70.4 seconds in this environment); type checking and production build passed. All 154 local documentation links resolve and patch whitespace checks pass. The existing browser assets/production behavior are unchanged by this tooling update.

Two wrapper tests cover preservation of an existing `JARVIS_DATA_DIR` and preexisting recovery-folder files, environment restoration, synthetic cleanup, bounded report metadata, and rejection of a file selected as a recovery directory. The standard check now builds before tests so a fresh checkout has the dashboard assets required by this integration test.

Pending: actual Windows run and report, separate physical recovery drive, Windows ACL/removal/power-loss behavior, human terminal password UX/custody, browser accessibility and remaining M1 release gates. No sensor, voice, cloud service, automatic backup schedule or retention rotation was added.

[Run instructions](../development/pc-validation.md) · [Recovery implementation evidence](m1-slice-3.md) · [Remaining M1 gates](../milestones/001-local-alpha.md).
