# Milestone 1 — Local PC alpha

Status: **implementation slices 1–4 prepared for review; full M1 acceptance remains open**.
Date: 2026-09-28. Baseline: merged [PR #1](https://github.com/danielsantos2310/jarvis/pull/1), commit `d479389241f32c650b6787faa30a5ac59ec9df20`.

Daniel's subsequent instruction, “ok lets go to next step in the project,” authorizes progressing from documentation to the next implementation step. This change implements the roadmap's first reversible local slice. It does not record owner sign-off on all six proposed ADRs or claim the complete M1 release gate has passed.

## What you can try

1. Enroll from a code shown only in the local terminal, choose a password, and open a private dashboard.
2. Create, complete and delete local tasks; create one-shot or daily/weekly reminders; run durable timers through forms or defined text commands.
3. Inspect current service state, a private due-reminder inbox, redacted action metadata and an explicitly synthetic room-presence adapter.
4. Pause new actions and delivery, revoke workspace access, restore it with password confirmation, and lock the dashboard.

Start with the [Windows / VS Code quickstart](../development/windows-quickstart.md). The product is a local application served by one Node process, not a hosted service or a free-form AI chatbot. The browser is its interface. No Python, Docker, model weights, microphone, sensor or server purchase is needed for this slice.

## Implementation decisions and readiness

| M0 decision | Resolution for this implementation slice | Remaining gate |
| --- | --- | --- |
| D-01 development PC | Earlier user-provided context identifies a Windows work PC with VS Code. Its detailed specifications are unknown. This code uses a cross-platform Node runtime and no audio/GPU dependency. | Actual Windows build, permissions, CPU/RAM/disk and peripherals; do not treat Linux tests as Windows evidence |
| D-02 first workflows | Implementer selected the bounded workflows above from M1's planned scope. | Daniel's usability review; no weekly capacity assumed |
| D-03 stack | TypeScript, Fastify, React/Vite, SQLite; [ADR-0007](../adr/0007-m1-local-alpha.md) records why Vite and npm were selected. | Owner review; earlier ADRs remain Proposed |
| D-04 authentication | First-run terminal enrollment; `@fastify/session`; scrypt password storage; offline terminal recovery. | Windows recovery UX and independent security review before personal pilot |
| D-06 time/privacy | Use browser-reported IANA timezone for explicit one-shot dates; store UTC instant and timezone. No unsolicited suggestions or audio. | Recurrence/DST UI implemented in slice 2; real reminder setup acceptance pending |
| D-12 backups | Manual encrypted snapshots, independent deletion journal and isolated restore implemented in slice 3; session scheduling/retention added in slice 4. | Daniel selects off-disk location/key custody; actual Windows recovery, retention acceptance and independent review before personal pilot |

The planned future hub remains the user's Alienware Alpha R1 (i5-4590T, GTX 860M-derived 2 GB GPU, 8 GB DDR3L, 1 TB HDD), as described in prior project context. These are supplied specifications, not verified inventory. No performance claim or upgrade purchase follows from them.

## Slice 2 update — 2026-09-29

[Recurring reminders](../development/recurring-reminders.md) now implement daily/weekly schedules, explicit clock-gap/overlap previews and missed-delivery choices. [ADR-0008](../adr/0008-local-recurring-reminders.md) and [slice-2 evidence](../testing/m1-slice-2.md) describe the schema-2 migration and limits. This completes the bounded M1-03 implementation; owner/Windows acceptance and the full milestone remain open.

## Slice 3 update — 2026-09-29

[Encrypted recovery](../development/backup-recovery.md) adds stopped-core backup commands, authenticated snapshots, independent deletion replay, pending-cleanup status and isolated restoration with a new password, revoked grants and paused delivery. [ADR-0009](../adr/0009-encrypted-recovery.md) and [slice-3 evidence](../testing/m1-slice-3.md) record the bounded M1-04 implementation and schema-3 migration. Slice 4 adds opt-in session scheduling/rotation; Windows recovery and full personal-pilot acceptance remain open.

## Slice 4 update — 2026-09-29

[Session-unlocked automatic backups](../development/automatic-backups.md) now create daily snapshots while the core runs and rotate only verified scheduler-owned files. The password is entered each start and stays in memory. [ADR-0010](../adr/0010-session-backup-scheduler.md) records limits; no OS service, unattended credential storage or completed Windows acceptance is claimed.

## UI reliability checkpoint — 2026-09-29

[Immediate locking and stale-response checks](../testing/m1-ui-reliability.md) remove private content before waiting for logout, reject older snapshots and exercise keyboard controls. These are bounded T-02/T-16/T-33 checks; Windows and complete M1 acceptance remain open.

## Contracts and boundaries

- Fastify owns authentication, schemas, storage and the action gateway. React never accesses SQLite or any integration directly.
- Only `127.0.0.1` is bound. Exact Host and Origin checks reject LAN/public proxies and unapproved browser origins. The documented address uses `127.0.0.1`, not `localhost`.
- Login uses a fixed 30-minute server-validated session, HttpOnly/SameSite=Strict cookie and a random per-process signing key. Restart, recovery and logout invalidate sessions. HTTP/`secure:false` is restricted to this loopback profile; it is not a LAN configuration.
- Mutations require JSON, exact Origin and session CSRF token. Actor and household are loaded from the trusted session and checked again in the write transaction. User fields cannot supply authority.
- Explicit enrollment grants only own local records. Revocation excludes private items and notices from responses. Restoration/resumption/revocation require password confirmation. Chat cannot manage grants.
- The P2 action registry contains create, complete, delete-one-item and dismiss-one-notice. Unknown fields/actions fail schema validation. External actions, P3/P4, integrations and third-party executable widgets have no executor.
- Core scheduler and action writes are transactional. Audit write failure rolls back local effects. New creates and scheduler delivery stop while paused; manual completion/deletion remain possible.
- Text parser accepts a deliberately small grammar. Unsupported requests return help. A task title is inert data, including markup or instruction-like text.
- Request IDs deduplicate successful writes for 30 days. Changed content using the same ID conflicts. Relative command retries use a stable command fingerprint, preserving the first stored deadline. Clients do not automatically retry writes.
- Pending one-shot reminders survive restart and reach the private inbox once. More than five seconds late is labelled missed. Delivery is silent; no speech, sound, OS push or replayed external effect exists in this slice.
- Synthetic room state lives in memory, expires to unknown after 30 seconds, and cannot establish identity or activate recording.

## Storage, privacy and limits

One SQLite database contains owner/auth metadata, items, notices, settings, idempotency receipts, redacted audit records and deletion tombstones. No default conversation history, browser local/session storage, service worker, analytics or outbound application integration is used. React renders strings as text. CSP and Permissions-Policy disable third-party resources, camera, geolocation and framing. The owner-authorized [microphone lab](../development/microphone-lab.md) permits same-origin microphone requests only after an explicit click and browser permission, with bounded in-memory input metering and no transcription or upload.

Titles persist until deleted. Notices reference live items and expire after seven days. Audit/receipts expire after 30 days. Deletion IDs are now retained conservatively in SQLite and, when configured, a separate encrypted journal. Transactions and foreign keys remove linked notices. Failed journal synchronization leaves live deletion effective and reports backup cleanup pending. Restoration requires the current independent journal; a snapshot alone is insufficient.

Limits: 4 KiB request body; 500-character command; 160-character title; 1,000 items; 20,000 receipts; 50,000 audit rows; 100 sessions; global/request-specific rate limits. Login derivation is serialized; an opted-in backup derivation can overlap it. Low-memory and performance validation remain open. Schemas 1 and 2 upgrade to schema 3 on open; a newer schema is refused. The local runtime lock prevents two normal launch/recovery processes from using the same data directory concurrently. A stale lock requires operator inspection after a crash.

Database content is not application-encrypted. Linux directory/file permissions are restricted; Windows uses the current account's inherited permissions. Host encryption, account protection, off-disk encrypted backups and deletion replay are prerequisites for a personal/home pilot. Start with synthetic examples on the work PC.

## Exit evidence and follow-up backlog

See the [slice-1](../testing/m1-slice-1.md), [slice-2](../testing/m1-slice-2.md) and [slice-3](../testing/m1-slice-3.md) test reports for exact results and limits.

| ID | Next bounded work | Gate / evidence |
| --- | --- | --- |
| M1-02 | [PC validation runner](../development/pc-validation.md) implemented; execute on Daniel's Windows PC and record inventory/recovery UX | Runner verified on Linux; actual Windows report, Ctrl+C/restart, browser and human password recovery remain pending |
| M1-03 | Daily/weekly recurrence and explicit DST preview implemented | Synthetic tests and browser evidence in slice 2; Windows/owner review pending |
| M1-04 | Manual encrypted backup and independent deletion replay implemented | T-26 and isolated recovery smoke in slice 3; Windows/off-disk drill and acceptance pending; session scheduling/retention implemented in slice 4 |
| M1-05 | Replace one-second polling with authorized live updates if needed | T-09/T-30, measured end-to-end p95 and resource budget |
| M1-06 | Validate host network denial, disk-full/quota behavior, accessibility and release environment | T-01/T-24/T-33/T-35/T-36; remaining M1 release gates |
| M1-07 | Owner review of this slice and M1 closeout | Record actual decisions, remaining defects and acceptance |

M2 voice starts after a dependable M1 baseline, microphone/language inventory and the local voice benchmark plan. Do not jump to multi-room listening or physical device control from this alpha.
