# ADR-0009 — Encrypted snapshots with independent deletion replay

Date: 2026-09-29. Status: Implemented for evaluation; owner acceptance and independent security review pending.

## Context and decision

M1-04, P-03 and T-26 require an old backup not to revive a deleted item. Local restart persistence and tombstones inside the same snapshot are insufficient. Add terminal-only, stopped-core backups using the native SQLite snapshot API and Node crypto primitives. No new dependency or cloud service is introduced.

Use a versioned AES-256-GCM envelope with fixed-cost scrypt password derivation, random salt/nonce, authenticated format context and bounded input sizes. Include the SQLite snapshot and its SHA-256, application/schema/Node/timezone inventory and recovery metadata. SQLite contains password hashes and the journal key, so the complete envelope is confidential. Snapshot passwords are entered only through hidden interactive prompts. The backup is read back and authenticated before success is reported.

Schema 3 adds recovery configuration. The independent journal is an authenticated encrypted file in a separately selected local directory. Its random key remains in protected live SQLite and inside encrypted snapshots. Each live deletion commits first; journal synchronization follows. Failures do not restore live visibility. The authenticated dashboard distinguishes pending cleanup from successful synchronization, with periodic retry. Atomic file replacement and fsync precede revision advancement. The journal is not rolled back with snapshots.

Restoration creates an exclusive new directory with an incomplete marker. It authenticates the snapshot and current independent journal, validates integrity and scope, replays deletions, clears notices/receipts, resets the password and request digest key, increments auth epoch, revokes the grant and pauses delivery before publication. Existing targets are refused. A missing/currently unrecoverable journal has no bypass. Original and restored authorities must never run together.

## Alternatives and consequences

Raw folder copy was rejected as the backup interface: it provides neither authenticated encryption nor independent deletion replay. Live browser upload/restore was deferred to avoid adding a remote bulk-data authority path. Full encrypted-database replacement was not selected: host disk encryption remains mandatory for personal deployment. Streaming and automatic retention are deferred in favor of a bounded manual alpha.

Opaque deletion records are conservatively retained instead of the earlier 35-day local pruning. The journal caps at 20,000 records; capacity errors leave cleanup pending and block new snapshots, while live deletion still works. The snapshot caps at 16 MiB of SQLite / 32 MiB encrypted file. The full encrypted journal is read/validated per synchronization, at most every ten seconds absent user deletion. Large-scale latency and compaction are not claimed.

Restore rejects snapshots older than 28 days. The seven-daily/four-weekly rotation and physical expiry are still operator tasks, not implemented automation. No RPO/RTO achievement follows from smoke tests. A stale full recovery location newer than the selected snapshot cannot be detected after all later checkpoints are lost; the CLI explicitly requires the operator to recover and attest the latest journal. Offline deletion pending at source loss remains an unresolved reconciliation case. No mechanism overrides that requirement.

Live database/staging plaintext relies on host protection. Forced termination may leave protected staging or blocked restore data. Windows directory-fsync and removable-drive behavior differ from POSIX and need actual Windows validation. The source data directory lock prevents ordinary backup/start overlap, but cross-installation authority transfer remains an operator responsibility. Remote filesystems and cloud-sync folders are unsupported.

## Evidence and references

[Recovery guide](../development/backup-recovery.md) · [Slice-3 tests](../testing/m1-slice-3.md) · [Privacy baseline](../governance/privacy.md) · [Deployment baseline](../architecture/deployment.md).

Primary APIs: [SQLite backup](https://www.sqlite.org/backup.html), [Node SQLite](https://nodejs.org/api/sqlite.html), [Node crypto](https://nodejs.org/docs/latest-v24.x/api/crypto.html). These support the selected primitives; this ADR does not claim an independently audited file format or completed security certification.
