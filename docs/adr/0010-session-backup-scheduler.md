# ADR-0010 — Session-unlocked daily backup scheduler

Date: 2026-09-29. Status: implemented for evaluation; owner acceptance and independent security review pending.

## Decision

Add `npm run start:backups` as an explicit local-operator opt-in. Prompt for a password in the terminal at each start; retain it only for the core process lifetime. Ordinary startup remains unchanged and there is no browser/model unlock authority. OS keychain integration and a background OS service are deferred; automatic operation is bounded to an awake, running, unlocked core session.

Schedule one verified snapshot per UTC day and coalesce downtime into one current snapshot. Use the newest seven distinct UTC dates plus newest four Monday-based UTC weeks, deduplicated and bounded by 28-day age at maintenance. The encrypted recovery catalog identifies the exact scheduler-owned files eligible for rotation. Validate names, hashes and regular-file types; verify retained copies before deletion. Never scan-and-delete manual or uncataloged backups. A current successful snapshot precedes rotation; an error retries after fifteen minutes while normal core work continues.

Use SQLite backup through a separate read connection. The live-write test exposed an error when writes and backup shared the same connection; the separate-reader implementation passed concurrent write/deletion and isolated restoration. Read recovery metadata from the resulting snapshot and re-synchronize the live independent journal before publishing the encrypted file. This preserves schema-3 and envelope-v1 compatibility.

## Trust boundaries and tradeoffs

Passwords stay out of persisted configuration and logs. Dropping JavaScript references is not a forensic erasure guarantee. One backup operation at a time bounds snapshot/KDF concurrency, but a login derivation may overlap a backup derivation; full low-memory and latency gates remain open. Terminal activation authorizes this bounded maintenance even while dashboard actions are paused or workspace permission is revoked.

The catalog uses AES-GCM with a separate authenticated context and the existing journal key. Rollback of all external checkpoints cannot establish freshness; protected local filesystems, one active installation and current independent deletion history remain prerequisites. Known bad/missing catalogs or changed files fail closed. Forced termination may leave uncataloged encrypted outputs, which are never automatically adopted. Missing obsolete files after interrupted cleanup are safely removed from the catalog on retry.

Host-clock accuracy is an operator prerequisite. Backward jumps do not create/delete copies until safe scheduling resumes; forward jumps can expire older backups. Retention does not run while the session is locked/off or the recovery drive is unavailable. Automatic housekeeping does not erase manual copies, prune deletion IDs or establish RPO/RTO targets.

## Validation and references

[Automatic backup guide](../development/automatic-backups.md), [slice-4 evidence](../testing/m1-slice-4.md), [encrypted recovery ADR](0009-encrypted-recovery.md).

Primary primitives remain [SQLite backup API](https://www.sqlite.org/backup.html) and [Node crypto](https://nodejs.org/docs/latest-v24.x/api/crypto.html). No new package dependency or database-schema migration is introduced by this slice.
