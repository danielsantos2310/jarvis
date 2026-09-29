# M1 slice 3 — Encrypted backup and recovery evidence

Date: 2026-09-29. Application: 0.3.0-alpha.3, schema 3. Status: implemented and locally verified for evaluation; full M1 and personal-pilot acceptance remain open.

## Executed checks

Environment: Linux x64, Node 24.19.0, npm 11.9.0; browser Chromium 153.0.8010.0 with Playwright 1.63.0. Synthetic fixtures only. Windows behavior is not inferred from this run.

| Check | Result | What it establishes |
| --- | --- | --- |
| Core/domain/API tests | 36/36 passed, about 21 seconds | Prior 25 groups plus 11 recovery groups below |
| Type checking and production build | Passed | Server/shared/web contracts compile and browser assets build |
| Browser workflow | Passed, 9.6 seconds | Existing enrollment/task/timer/recurrence/permission/lock workflow plus unconfigured backup status; no external requests/page errors; responsive layout assertions |
| Terminal backup/restore drill | Passed | Actual pseudo-terminal prompts hide passwords; configure, encrypted create/read-back verification and restore into a new folder |
| Documentation links / whitespace | Passed | 143 local Markdown links resolve; patch whitespace check clean |
| Visual inspection | Passed | Desktop backup status is legible within the existing dashboard; recurrence controls fit 390 px |

## Recovery coverage

1. Encrypted snapshot round-trip into an isolated target; post-snapshot deletion and dependent-notice purge; new password, incremented auth epoch, rotated digest key, empty receipts/notices, revoked grant and paused actions. Original installation is preserved.
2. Wrong password, changed ciphertext, truncation, expired/future snapshot: no published target.
3. Missing, damaged or foreign independent journal blocks restoration.
4. Disconnected recovery location: live item disappears, cleanup reports pending, new backup fails, reconnect/tick synchronizes, old-snapshot restoration cannot revive the item.
5. Journal rollback below the live or snapshot revision watermark fails closed.
6. Audit transaction failure does not record a deletion in the independent journal; repeated synchronization deduplicates records; tombstones survive the former 35-day pruning boundary.
7. Nested recovery folder and existing restore target are refused; ordinary backup staging is cleaned.
8. Authenticated but invalid checksum/schema payloads are refused.
9. Recovery status requires authentication and excludes journal keys, identity and filesystem paths.
10. Failure after staging removes only its new target; a simulated interrupted-restore marker prevents normal startup.
11. Schema-2 upgrade preserves the owner and creates unconfigured recovery state. The preexisting schema-1 migration test now covers upgrade to schema 3.

The browser workflow checks the unconfigured status. Configured/pending/retry and restored authority behavior are exercised at domain/API level, not claimed as an end-to-end Windows UI drill.

## Limits and remaining gates

This is recovery smoke evidence, not a clean-machine or household RPO/RTO measurement. No real power cut, disk-full filesystem, removable Windows drive, Windows ACL/rename durability, independent cryptographic review or journal-capacity load benchmark was performed. Controlled disconnection and invalid-data failures were tested.

Automatic daily/weekly scheduling and backup rotation are unimplemented. Restore refuses snapshots older than 28 days, but the operator must retire expired files. Journal IDs are retained conservatively with a 20,000-record capacity; full-file validation/write cost remains part of the performance gate. Local SQLite and interrupted staging rely on host encryption.

An offline restore cannot detect rollback of the entire recovery location beyond every surviving checkpoint. The operator must provide the latest independent journal; unresolved pending deletions after source loss must be reconciled before personal data is made available. No old-journal override is implemented. Original and restored cores must not run concurrently.

See [recovery guide](../development/backup-recovery.md), [ADR-0009](../adr/0009-encrypted-recovery.md), [M1 remaining gates](../milestones/001-local-alpha.md) and the historical [slice-2 report](m1-slice-2.md).

## Subsequent work

[Slice 4](m1-slice-4.md) adds optional live session scheduling/rotation and separately verified live snapshot consistency. The manual-only limits above describe the alpha-3 test baseline.
