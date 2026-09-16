# Testing and release strategy

Version 0.1 · Test specifications, not executed application results.

## Evidence policy

Each requirement links to a test ID. Record commit, environment, hardware, OS, dependency/model hashes, configuration, dataset, expected result, actual result and artifacts. Use synthetic fixtures first; real audio/calendar/presence samples require specific consent and lifecycle controls. CI must never contain household tokens or recordings.

Proposed tools: Vitest for domain/contract tests, Playwright for UI and end-to-end flows, and controlled hardware/network test harnesses. Pin actual versions at M1. M0 performs documentation validation only and adds no executable CI workflow.

## Acceptance catalogue

| ID | Test and required result | First applicable gate |
| --- | --- | --- |
| T-01 | Block assistant WAN access; prove core workflows work and capture zero attempted/permitted assistant egress in strict-local mode | M1; extend M2/M3 |
| T-02 | Exercise unavailable/stale/offline/pending/failed states; no false completion or invented live data | M1 |
| T-03 | 100 utterances per supported language; ≥95% quiet/≥85% defined-noise intent accuracy; report WER and p95 deterministic response ≤2.5 s | M2 |
| T-04 | Activation, 20 s follow-up expiry, five-minute cap, 30 s utterance cap, mute and stop; p95 playback cancellation ≤500 ms | M2 |
| T-05 | Spoof/replay BLE or sensor identity; no private read or grant issuance | M3 |
| T-06 | Presence calibration and sensor outage; meet room targets and unknown-state timeout | M3 |
| T-07 | Inspect/edit/delete memory; source correction removes stale derivatives; wrong-owner retrieval fails | M4; scope groundwork M1 |
| T-08 | Quiet hours, DND, budgets, cooldown and stale candidates; zero forbidden delivery in replay suite and five-day pilot | M4 |
| T-09 | Disable/fail a widget and deny its data scope; core controls still work | M1 |
| T-10 | Revoke integration read; refresh/subscription stops; cache expires or clears as specified | M3 |
| T-11 | Allowed low-risk target succeeds once; wrong target, duplicate, stale or invalid command rejected/reconciled | M5 |
| T-12 | Two rooms hear one request; one response lease; ambiguity/handoff does not expose private data | M6 |
| T-13 | DST skip/repeat, restart and missed reminder; saved recurrence and missed-delivery policy applied once | M1 |
| T-14 | Global stop and revoke with model unavailable; no new dispatch, pending work canceled | M1; extend M5 |
| T-15 | Inspect suggestion reasons; show source/age and distinguish inference from user-confirmed fact | M4 |
| T-16 | Inspect network payload, DOM, subscription and cache on shared/locked UI; private fields absent | M1 |
| T-17 | Anonymous, wrong-user, wrong-household, expired-session and cross-origin access denied across all resources | M1 |
| T-18 | Malicious external text/tool output/memory requests privilege or secret; no unauthorized effect or disclosure | M1; expand each integration |
| T-19 | Malformed/oversized payload, unknown schema, path traversal, SSRF and arbitrary tool request rejected | M1 |
| T-20 | Change approved content/target, replay nonce, expire/revoke grant during queue; execution denied | M5 |
| T-21 | Inspect bundles/logs/prompts/Git artifacts for credentials; audit reconstructs decision without sensitive bodies | M1 |
| T-22 | Pairing timeout, unauthorized enrollment and device revocation; untrusted events cannot change trusted state | M3 |
| T-23 | Port, TLS, origin, certificate and broker topic checks; unauthorized endpoints inaccessible | First LAN release |
| T-24 | Kill core/model/executor, fail policy store; no privilege escalation and physical controls still usable | M1/M5 |
| T-25 | Audio/transcript absent from persistent storage after normal, error, cancel and crash paths; mute emits no audio | M2 |
| T-26 | Delete sources and restore old backup; tombstones applied before access and derivatives cleared | First personal persistence |
| T-27 | Cloud off/revoked/over-budget/wrong-purpose; request blocked and no payload leaves gateway | Before cloud activation |
| T-28 | Guest/multiple/unknown occupants; no personal announcement or unauthorized capture | M3 |
| T-29 | Third-party executable widget installation denied; built-in scopes cannot be expanded by manifest edits | M1 |
| T-30 | At least 100 update samples: p95 ≤500 ms; core/UI memory/idle CPU measured against N-07 | M1 |
| T-31 | Crash before dispatch, after dispatch, before receipt and after receipt; no blind replay; unknown outcome visible | M5 |
| T-32 | Clean isolated restore with tombstones and revoked sessions; RPO ≤24 h, measured RTO ≤2 h | M6; backup smoke earlier |
| T-33 | Keyboard-only flows, focus order, text status and reduced motion | M1 |
| T-34 | Seven-day powered hub pilot; ≥99% core availability excluding declared maintenance | M6 |
| T-35 | Disk quota, full disk, bounded queues and log rotation; no corruption or unbounded accumulation | M1 |
| T-36 | Upgrade/migration/rollback, locked dependencies, artifact hashes and license inventory | M1 onward |
| T-37 | Sensor flood, long prompt, repeated inference and provider failure; rate/deadline/cost limits terminate safely | M1 onward |

## Test layers

Unit tests target independent domain rules: permission intersection, expiry, deduplication, state transitions, recurrence, audience filtering and retention. Contract tests validate each adapter, schema version and error path. Integration tests use simulated providers and devices with known failures before connecting real ones. End-to-end tests cover meaningful workflows rather than mirroring UI implementation details.

Security tests are adversarial: prompt injection with legitimate-looking instructions; cross-user identifiers; revoked subscriptions; malicious widget payloads; repeated approvals; stale source clocks; provider callbacks; content that attempts to call localhost/private URLs. Each test asserts external effect and data disclosure boundaries, not merely a refusal string from a model.

Hardware tests report room layout, noise source/level measurement method, distance, microphone, speaker, firmware, network conditions and participants' consent. Exact repeatability limits are recorded. Do not call a small sample “production accuracy.”

## Performance workload

Reference PC inventory is a prerequisite to interpreting results. Baseline workload: one authenticated client, ten widgets or synthetic equivalent subscriptions, one voice session and ten low-rate simulated sensor sources. M6 extends to two simultaneous user sessions and at least two rooms. Record warm and cold starts separately. AI workers, browser and core resource costs are reported separately and together.

Voice latency starts at detected end-of-utterance and ends at first response audio; report detection delay separately. Widget latency starts when the core accepts an event and ends at render. Availability means core auth/read/task API responding successfully within its declared timeout; a listening LED alone is not service availability.

## Release gates

M1 requires auth/scope, offline, storage and rollback smoke evidence. Voice cannot ship until mute/stop/retention tests pass. Presence cannot drive personal behavior until guest tests pass. Proactivity stays in shadow mode until attention/audience gates pass. Actions remain disabled until permission race, replay and crash-recovery tests pass. Multi-room expands only after pairing, arbitration, restore and outage drills pass.

Unresolved critical/high authorization, secret-exposure, personal-disclosure or unsafe-actuation defects block release. A performance target may be revised with an ADR and measured evidence; a permission bypass cannot be accepted as a performance tradeoff. Archive a short test report per milestone using the [report template](templates/test-report.md).

## M0 documentation checks

Check relative links, unique requirement/test IDs, complete requirement-to-test mapping, consistent retention/timeouts, ADR references, clear draft status, no unsupported implementation claims, no secrets and no application/configuration code in the change. Review Mermaid syntax and document structure. External source reachability is checked during research; it is not a permanent guarantee.
