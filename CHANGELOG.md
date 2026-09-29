# Changelog

## Local alpha 0.4.0-alpha.4 — 2026-09-29

- Added opt-in daily backups with a terminal password held only for the running session.
- Added bounded UTC daily/weekly retention for verified scheduler-owned files; manual and uncataloged backups remain untouched.
- Added encrypted catalog, retry/status, overlap and shutdown handling.
- Made live snapshots use a separate SQLite read connection and snapshot-consistent recovery metadata.
- Windows/off-disk, clock/power-loss and full performance/security acceptance remain open.

## PC validation tooling — 2026-09-29

- Added an isolated runtime, recovery-drive and loopback HTTP validation command with a shareable metadata report.
- Added checks that preserve existing workspace/recovery files and leave no synthetic data after ordinary completion.
- Added Windows run instructions and explicit remaining manual gates; Linux evidence is not counted as Windows acceptance.

## Local alpha 0.3.0-alpha.3 — 2026-09-29

- Added manual encrypted snapshots and isolated restore through hidden-password terminal commands.
- Added independent encrypted deletion synchronization, retry and dashboard pending-cleanup status.
- Restored workspaces get a new password, revoked permission and paused actions; old deleted records are purged before access.
- Added schema-3 migration, integrity/authentication/failure tests and Windows recovery instructions.
- Automatic scheduling/rotation, actual Windows recovery and remaining M1 release gates remain open.

## Local alpha 0.2.0-alpha.2 — 2026-09-29

- Added daily/weekly reminders with server-resolved previews, explicit DST gap/overlap choices and missed-delivery policies.
- Preserved original local-time intent across transitions; consolidated missed occurrences and protected new notices from stale dismissals.
- Added transactional schema 1 → 2 migration, recurrence regression tests and browser coverage.
- Windows validation, encrypted backup/deletion replay and remaining M1 release gates stay open.

## Local alpha 0.2.0-alpha.1 — 2026-09-28

- Added the first M1 slice: Fastify/TypeScript core, React/Vite dashboard and SQLite persistence.
- Added terminal enrollment, password login/recovery, session/CSRF/origin controls, scoped local actions and redacted audit metadata.
- Added tasks, one-shot reminders, durable timers, private due inbox and synthetic presence.
- Added Windows setup, implementation ADR, automated API/browser tests and a limited-scope evidence report.
- Full M1 acceptance, Windows evidence, recurring reminders and personal backup/restore remain pending.

## Specification v0.1 — 2026-09-16

- Prepared the JARVIS master project specification and Milestone 0 documentation.
- Defined vision, requirements, system/hardware/software architecture, security, privacy and AI permissions.
- Defined presence, voice, context, widgets, data lifecycle, deployment and recovery.
- Added test traceability, milestone roadmap, decision/risk register, six proposed ADRs and review templates.
- Preserved documentation-only scope; no application, infrastructure or firmware implementation.

This version labels design intent. It is not a software release.
