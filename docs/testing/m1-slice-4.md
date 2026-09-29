# M1 slice 4 — Session automatic backups

Date: 2026-09-29. Application: 0.4.0-alpha.4. Schema 3 and encrypted snapshot format v1 remain compatible. Status: implementation for evaluation; full M1 acceptance remains open.

## Checks

- Core/domain/API/integration suite: **46/46 groups passed**, approximately 90.8 seconds on Linux x64 / Node 24.19.0.
- Type checking and production build passed.
- Browser workflow passed in 19.4 seconds (23.5 seconds total), including the automatic-backup off status; no external page requests or page errors. The cached browser executable was absent after environment restoration and was re-extracted before the successful run.
- Real pseudo-terminal `start:backups` accepted hidden repeated password input, started the core and produced an authenticated automatic snapshot. A separate persistent parent/PTY harness sent normal SIGINT: exit code 0, runtime lock removed, one automatic file created, and no password echoed. Force-terminating an entire execution session left the expected stale lock; that is not counted as graceful shutdown evidence. This is Linux terminal evidence, not Windows evidence.
- All 176 local documentation links resolve; patch whitespace checks pass.
- Eight new groups cover UTC daily/weekly retention, overlap/day deduplication, password verification after restart, writes during a snapshot, disconnected-drive retry, preservation of manual/uncataloged files, changed retained files, malformed/missing catalogs, traversal, clock rollback and shutdown awaiting an in-flight backup.
- The live-write test initially exposed a native SQLite error when writes and backup shared a connection. The implementation now uses a separate read connection; that regression and the full suite pass.

## Evidence boundaries

Rotation tests use recorded hashes and synthetic owned-file fixtures to verify the deletion scope, plus real encrypted scheduled snapshots for round-trip/password checks. Simulated clock jumps and folder disconnection are not physical Windows power-loss/removable-drive evidence. No real household files or backup credentials were used.

The PC validation runner still reports its actual platform and volume relationship. Actual Windows startup/terminal UX, off-disk recovery, disk-full/power-loss behavior, host-clock operational checks and independent security review remain open. Ordinary startup leaves automation off; opt-in sessions require a terminal password on every restart. No OS service or persistent password store exists.

The performance numbers above are test durations, not latency targets or an achieved household RPO/RTO. One backup derivation may overlap one login derivation; low-memory and complete workload tests remain pending. Automatic retention leaves manual and uncataloged files untouched and does not prune deletion IDs.

[Automatic backup guide](../development/automatic-backups.md) · [ADR-0010](../adr/0010-session-backup-scheduler.md) · [M1 gates](../milestones/001-local-alpha.md).
