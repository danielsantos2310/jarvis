# Privacy model

Version 0.1 · Proposed defaults. This document defines engineering behavior, not a legal-compliance determination.

## Data classes and boundaries

| Class | Examples | Permitted baseline handling |
| --- | --- | --- |
| Public | Time, redacted system health | Local UI and public room output |
| Household | Room availability, approved device state | Paired household clients, without personal movement history |
| Personal | Tasks, calendar titles, preferences | Owner-scoped authenticated clients; shared display redaction |
| Sensitive | Private messages, recordings, detailed occupancy patterns | Avoid collection; additional purpose consent if a later capability needs it |
| Secret | Tokens, passwords, recovery keys, device private keys | Credential store only; never model input or widget data |

Derived facts inherit the most restrictive class of their inputs. A summary is not automatically anonymous. Model context is a disclosure destination, including a local model with logs enabled. Enforce limits at retrieval and output, not just in the prompt.

## Operating modes

**Strict-local:** after provisioning, assistant processes cannot access the WAN, including analytics, fonts, model downloads and integrations. Local status, saved tasks, timers, policy, local speech and selected local devices remain available. Hardware capacity may limit free-form model conversation.

**Local-first with selected integrations:** named external services may synchronize only consented data. The UI identifies online dependencies, last refresh and the active destinations. Local authority and offline fallback remain intact.

**Optional cloud AI:** separately enabled per provider and purpose, after displaying which data leaves the home. There is no automatic promotion from local to cloud when inference is slow or unavailable. A revocation stops new requests immediately; already transmitted data is subject to the provider's actual terms and deletion facilities.

## Collection and retention

| Data | Default persistence | Optional retention / deletion rule |
| --- | --- | --- |
| Raw microphone audio | Memory only during deliberate capture | Capture cap 30 s per utterance; clear after consumption/cancel; no disk recording in normal operation |
| Wake detector pre-roll | Off until wake mode enabled; then RAM ring ≤2 s | Never uploaded; only local activation processing |
| Transcript and conversation | Active session RAM only | Explicit history opt-in: seven days; clear transient session at close, with five-minute maximum conversation lifetime |
| Presence observations | RAM until freshness expiry; no durable history | Diagnostic collection separately consented, maximum 24 h; no personal path inference |
| Current room state | Minimal latest state, no person movement log | Mark unknown on restart until fresh observations arrive |
| PC activity | Optional coarse idle/focus/lock status only | No keystrokes, window titles, screenshots or application-content collection |
| Tasks and user-approved memory | Local until user deletes or assigned expiry | Show provenance and last confirmation; review memory every 90 days |
| Context facts and summaries | RAM by default; explicitly saved facts follow source retention | Delete derivatives when source is deleted or expires |
| Calendar/integration cache | Only selected upcoming data, maximum seven-day cache age | Revoke clears cache within 24 h; token revoked immediately; do not cache full mailboxes |
| Notifications | Seven days, minimal text | Sensitive body not retained unless user enables history |
| Action/audit metadata | 30 days | No raw prompts, audio, message bodies or secret fields; keep minimal outcome/decision metadata |
| Health logs | Seven days | Redacted; crash dumps disabled by default for data-bearing processes |
| Encrypted backups | Seven daily plus four weekly snapshots; oldest ≤28 days | Separate backup key; deletion tombstones applied before restored data becomes visible |

These values are proposed defaults. Owners may shorten retention; expanding collection or retention requires a visible policy change and purpose. Audio must not be copied into error logs, retry queues or model tracing. RAM-only is not a guarantee against OS swap or forensic memory access; host encryption, protected swap and disabled content dumps reduce that residual risk.

## Consent and household behavior

Microphone, wake mode, room sensing, personal source access, history, memory, proactivity and cloud processing each have an independent consent record with purpose, scope, policy version, date and revocation. New room devices start inactive until pairing and consent setup finish. Capture has a visible indicator and accessible mute; room devices should include a hardware microphone disconnect or a verifiable hardware mute.

Guest mode suppresses personal announcements, personal memory writes and identity inference. Room occupancy is household context, not consent to collect a visitor's speech. Personal content on shared speakers requires an explicit private-room session with user affirmation of privacy; any audience uncertainty closes that privilege. In the multi-room pilot, personal summaries default to a personal display or headphones.

Room entry does not imply who entered. No biometric templates, camera feed, continuous transcription or silent collection of nearby people's conversations is in this baseline. Explicitly scheduled public announcements still follow room consent and quiet settings.

## Deletion and export

An authenticated user can inspect, correct, export and delete their data and grants. Export uses a versioned, readable format with source timestamps and excludes live secrets; sensitive exports require reauthentication. Delete stops retrieval immediately and schedules physical deletion of indexes/caches within 24 hours. Deleting a source invalidates dependent facts and embeddings. No cloud embeddings are enabled by default.

Deletion tombstones identify records with opaque IDs and are kept at least until every backup containing those records has expired, plus seven days. Maintain an encrypted deletion journal independently of rollback snapshots, and synchronize it to the separate recovery location before reporting backup-safe deletion complete. Ordinary daily backup RPO is not sufficient protection for a newly acknowledged deletion. If that synchronization is unavailable, remove live access immediately and show backup cleanup as pending.

Backup restores occur in isolation, load the current independent deletion journal, purge deleted records and derivatives, invalidate sessions/approvals, then permit user access. If the latest journal cannot be recovered, keep affected personal data unavailable until deletion status is reconciled; do not silently serve the old snapshot. Do not claim immediate forensic erasure from SSDs or immutable snapshots. Document residual retention until backup expiry and key destruction when retiring an installation.

## Privacy acceptance

Inspect files, logs, queues, browser caches, crash handling and restored snapshots. Verify that muted capture sends zero audio frames, strict-local mode has zero assistant WAN egress, revoked cloud grants prevent new requests, and shared clients never receive private payloads. Consent and deletion tests are release gates, not optional UI checks. See [T-25–T-28](../testing.md).
