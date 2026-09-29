# Automatic daily backups and retention

Alpha 4 adds an **opt-in, process-session scheduler**. Ordinary `npm start` leaves it off. It runs only while the PC is awake and this JARVIS core is running; it is not an OS service or an achieved 24-hour RPO guarantee.

## Enable for this session

First complete the [recovery-folder setup](backup-recovery.md) and keep its independent deletion journal available. Stop the ordinary core, then run:

```powershell
npm run build
npm run start:backups
```

The terminal explains the retention policy and prompts twice for a scheduled-backup password, with input hidden. Store that password independently in your password manager. If scheduled copies already exist, the password is authenticated against the newest cataloged copy before startup proceeds. A wrong password, damaged catalog or unavailable journal blocks this opt-in startup; ordinary `npm start` remains available without automatic backups.

The password stays in process memory and is not saved to SQLite, files, environment variables, browser state or logs. The scheduler drops its reference at shutdown; JavaScript does not guarantee forensic memory erasure. After every restart you must explicitly run `start:backups` and unlock again. The existing manual backup command remains available and may use a separate password.

The dashboard reports off, ready, running or needs-attention status and the next scheduled check in UTC. Passwords, paths and catalog details are not exposed through the API. Chat cannot enable the scheduler or rotate backups.

## Schedule and retention

- Create one scheduled backup per UTC calendar day, immediately on startup if today's copy is missing, then on the first minute check at/after UTC midnight.
- After downtime, create one current snapshot; do not fabricate backups for missed days. Clock rollback defers work until the schedule catches up or reports attention after restart.
- Keep the newest copy on up to seven distinct UTC dates, plus the newest copy in up to four UTC weeks (Monday boundary), with duplicates counted once. Copies over 28 days old are excluded at successful maintenance.
- Cleanup applies **only** to the exact files listed in this installation's encrypted scheduler catalog. Manual backups and uncataloged files are never adopted or deleted automatically.
- Before deleting an obsolete file, verify its regular-file type, safe filename and recorded SHA-256. Verify retained copies exist and match their hashes before discarding older ones. Changed files, symlinks and malformed metadata block cleanup instead of broadening its scope.
- Create and authenticate a new snapshot before rotating old copies. A failed backup does not trigger retention deletion. Overlapping runs share one operation.

Weekly copies are retained daily snapshots, not a second weekly backup operation. With missing days or overlapping daily/weekly selections, fewer than eleven files are normal. UTC scheduling does not shift for daylight-saving changes. Keep the host clock correct: there is no external trusted clock, and a large incorrect forward jump can classify old copies as expired.

## Live snapshots and failures

The scheduler uses SQLite's backup API through a separate read connection, permitting normal core writes. Metadata comes from that exact snapshot, so concurrent deletion-journal revisions cannot make the snapshot internally inconsistent. The current independent journal is synchronized again before publishing the encrypted file. Later deletions still use the normal pending-cleanup contract.

If the recovery drive disappears, a write fails or catalog/file validation fails, the core keeps serving local work. Automatic backup status becomes needs attention and retries after fifteen minutes. Retention and missed backups remain pending while the drive is absent, the scheduler is off or the process is stopped. Ctrl+C waits for an in-flight snapshot before closing storage. Do not unplug the drive during that operation.

The encrypted `.jcatalog` is separate from rollback snapshots and uses a distinct authenticated context with the journal key. It contains only scheduler-owned filenames, timestamps and file hashes. Its capacity is 128 records; repeated unresolved failures eventually block new scheduled copies rather than allowing unbounded catalog growth. A missing catalog in a location that already has this installation's `jarvis-auto-…` files is refused; do not delete the catalog as a repair shortcut.

An interruption after creating a snapshot but before catalog registration can leave an uncataloged copy. It remains untouched for manual inspection. An interruption after unlinking an obsolete file but before catalog update is retried safely. Whole-catalog rollback after every later checkpoint is lost cannot be detected; the same protected-location and single-writer assumptions apply as for the independent journal. Unsupported competing processes or manual filesystem modifications require reconciliation.

## Recovery and acceptance

Use the existing [isolated restore command](backup-recovery.md) with the chosen `jarvis-auto-…jbackup` and the **current** deletion journal. Scheduled filenames do not change the version-1 encryption format or schema-3 restoration checks. Use the scheduled-backup password for those copies. Restore remains offline and requires a new target, a new workspace password and explicit permission reapproval.

Old manual snapshots and uncataloged copies still require operator retirement. Expiry does not promise forensic erasure. The scheduler does not prune deletion IDs, install a Windows task, persist an unattended credential or prove off-disk recovery. Actual Windows/removable-drive behavior, physical-drive separation, password custody, independent security review and workload performance remain acceptance gates.

[ADR-0010](../adr/0010-session-backup-scheduler.md) · [Slice-4 evidence](../testing/m1-slice-4.md) · [PC validation command](pc-validation.md).
