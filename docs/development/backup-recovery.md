# Encrypted backup and isolated recovery

Alpha 3 adds a manual, offline backup workflow for the local PC alpha. Use synthetic data until the Windows, host-encryption and personal-pilot gates are completed. Alpha 4 adds [opt-in automatic backups](automatic-backups.md); this manual workflow does not prove household RPO/RTO targets.

## Configure a recovery location

1. Stop JARVIS with Ctrl+C. Keep it stopped for all terminal backup commands.
2. Choose a protected folder outside the live data folder, preferably on a separate local drive. A second folder on the same disk is suitable only for a synthetic drill. This alpha supports local filesystems, not network shares, cloud-sync folders or competing writers.
3. In the repository's VS Code PowerShell terminal, run (replace the example drive):

```powershell
npm run backup -- configure --recovery-dir "E:\JARVIS-Recovery"
npm run backup -- create
```

The first command creates an encrypted `.jdel` deletion journal. The second prompts twice for a separate backup password, 12–128 characters, then creates a uniquely named `.jbackup`. Password entry is hidden; never put it in a command, environment variable, script, chat or Git. Keep the password independently accessible in your password manager. There is no password-reset route for an encrypted backup.

The live SQLite database holds the journal key and recovery-folder path as protected local configuration. The encrypted backup contains that key for disaster recovery. The recovery folder holds no plaintext journal key. This does not encrypt the live database: use OS account protection and disk encryption. Configuration is one-time in this alpha; do not change the database manually to relocate a journal.

Restart JARVIS to see backup and deletion-sync status. The dashboard never receives the journal key or filesystem paths. Backups are deliberately terminal-only and cannot be requested by chat, a model or a web endpoint.

## Deletions while the recovery drive is absent

Deleting an item removes it and its linked inbox notice from the live database in one transaction. An independent encrypted journal update follows. If that update fails, deletion remains effective locally and **Backup cleanup is pending** appears. JARVIS retries at most every ten seconds while running, and immediately after another deletion. Only a successful journal update reports synchronization.

Reconnect the recovery drive and wait for synchronized status. Or stop JARVIS and run:

```powershell
npm run backup -- sync
```

Do not restore any old backup while cleanup is pending. If the live PC is lost before a pending deletion is synchronized, the recovery location alone cannot know about that deletion. Keep the restored personal data offline until the missing deletion history is reconciled. Never replace a missing or damaged `.jdel` with a copy from an older snapshot.

The journal contains opaque item IDs and deletion times, not task titles. The live database and journal conservatively retain those IDs; pruning is deferred until backup retirement can be verified. At 20,000 journal records, further live deletions still work but journal synchronization becomes pending and new backups are blocked. This bounded alpha requires a retention/compaction upgrade before that limit; do not delete the journal to clear it.

## Restore into a new folder

1. Stop the original core and keep it stopped throughout the drill. Never run original and restored copies simultaneously. The alpha has no cross-installation authority lock.
2. Recover the current independent `.jdel` and chosen `.jbackup`, plus the backup password. Use the current recovery location, not an archived copy of the entire recovery drive.
3. Select a **new, nonexistent** local target folder; its parent must exist. The command never overwrites a live installation.
4. Run with your actual snapshot name:

```powershell
npm run backup -- restore --file "E:\JARVIS-Recovery\jarvis-TIMESTAMP-ID.jbackup" --recovery-dir "E:\JARVIS-Recovery" --target "C:\JARVIS-Restored"
```

The command asks you to confirm the original core is stopped and the journal is current, then asks for the backup password and a new workspace password. The confirmation is substantive: an offline machine cannot prove that an entire recovery location has not been rolled back after the selected backup. Known revision rollback, missing records from the snapshot, altered bytes, foreign journals and missing journals are rejected, but cryptography cannot establish freshness against loss of every newer checkpoint.

Before making the new folder available, restoration authenticates/decrypts the snapshot, validates its checksum, schema, owner scope and SQLite integrity, replays current deletions, removes inbox notices and idempotency receipts, replaces the workspace password, increments the authentication epoch, rotates the request digest key, revokes workspace permission and pauses all actions. The final journal is rechecked before publication. No reminders dispatch during restoration.

5. After success, choose the restored instance explicitly:

```powershell
$env:JARVIS_DATA_DIR = "C:\JARVIS-Restored"
npm start
```

Open http://127.0.0.1:3000 and sign in with the **new workspace password**. In Controls, restore local workspace permission with that password. Inspect saved items, particularly reminder deadlines and any work completed after the backup. Then separately resume actions. The old snapshot cannot reproduce edits/completions after its timestamp; deletion replay specifically prevents revival of deleted source items.

Keep the original core stopped if adopting this restored instance. The environment variable applies to this terminal; retain the selected data-directory setting for future starts. Do not accidentally start the old default `.jarvis` instance from another terminal.

## Failure and interruption

- Wrong password, authentication damage, unsupported format/schema, missing or stale journal: no target is published.
- Existing target: refused; nothing is overwritten.
- Failure after isolated staging: the newly created target is removed, never the source installation.
- Abrupt process termination may leave a protected target containing `restore-incomplete`. Normal JARVIS startup refuses it. Keep it offline and retry into another new folder; do not remove the marker to bypass validation.
- An interrupted backup may leave `.backup-*.sqlite` staging files inside the protected live folder or an invalid encrypted output. Use only files reported verified. Normal completion/failure removes its plaintext staging; forced termination cannot guarantee cleanup or forensic erasure.
- Missing journal, pending deletions that were lost, forgotten password or uncertain freshness require reconciliation; there is no “ignore journal” override.

## Retention, limits and portability

Snapshots older than 28 days, or over one minute in the future, are refused by the restore command. Set the host clock correctly. The encrypted file is limited to 32 MiB and the SQLite snapshot to 16 MiB; oversized workspaces fail without replacing existing data.

The design target remains seven daily plus four weekly snapshots, none older than 28 days. **Manual backups remain operator-managed.** Alpha 4 can [schedule and rotate its own copies](automatic-backups.md) while explicitly unlocked and running; the operator must retire manual/uncataloged expired copies; refusing restore does not erase ciphertext. Never retire the current independent deletion journal with old snapshots. Key destruction and forensic erasure are not claimed. Manual backups do not establish the ≤24-hour RPO target.

Schema 1 or 2 upgrades to schema 3 when opened. Alphas 1 and 2 refuse schema 3; alpha 3 and alpha 4 share this schema. Restore accepts only this versioned encrypted schema-3 format; manual old-folder rollback is not a supported personal-data restore. Tests run on Linux; Windows ACL inheritance, external-drive removal, rename/power-loss durability and full clean-machine recovery remain release gates. POSIX directory metadata is fsynced; Windows cannot use that same directory-fsync mechanism.

## Implementation and primary references

[ADR-0009](../adr/0009-encrypted-recovery.md) records the format, trust boundaries and tradeoffs. [Slice-3 test evidence](../testing/m1-slice-3.md) records what has actually passed.

- [SQLite backup API](https://www.sqlite.org/backup.html): consistent snapshot operation rather than copying a live database file.
- [Node SQLite API](https://nodejs.org/api/sqlite.html): native backup and database integrity access; implementation is tested on pinned Node 24.19.0.
- [Node crypto](https://nodejs.org/docs/latest-v24.x/api/crypto.html): AES-GCM authenticated encryption, random bytes and scrypt. Backup format v1 fixes scrypt at N=131072, r=8, p=1, a random 32-byte salt and a 32-byte derived key. AES-256-GCM uses a random 12-byte nonce, 16-byte tag and authenticated format context. No file-supplied KDF parameters are executed.
