# Requirements and acceptance criteria

Version 0.1 · 2026-09-16 · Proposed acceptance baseline.

User-mandated principles are binding. The measurable thresholds below are engineering proposals for owner review. MUST means required for the milestone named; SHOULD requires a documented exception. A later milestone does not weaken an earlier requirement. Test identifiers map to [testing](testing.md). No tests below have been executed against an application.

## Functional requirements

| ID | Requirement | Priority / first gate | Acceptance evidence |
| --- | --- | --- | --- |
| F-01 | Operate a core offline | MUST / M1 | T-01: with assistant WAN egress blocked, auth, local status, tasks, timers and persistence work; no remote asset or identity dependency |
| F-02 | Provide typed conversation and honest status | MUST / M1 | T-02: UI distinguishes offline, unavailable provider, stale data, draft, pending approval and completed action |
| F-03 | Support local voice input/output | MUST / M2 | T-03: selected language corpus passes local STT/intent/TTS evaluation; no silent cloud fallback |
| F-04 | Support bounded natural conversation | MUST / M2 | T-04: activation, follow-up session, expiry, mute and stop follow the documented voice state machine |
| F-05 | Separate occupancy, identity hint and authentication | MUST / M3 | T-05: replayed BLE and presence signals never grant identity privileges |
| F-06 | Represent stale/unknown presence | MUST / M3 | T-06: disconnected sensors become unknown within the configured freshness limit; no false vacancy action |
| F-07 | Keep inspectable context and approved memory | MUST / M4 | T-07: each durable item has owner, origin, visibility and delete/edit controls; corrections invalidate derived facts |
| F-08 | Offer bounded proactive suggestions | MUST / M4 | T-08: quiet hours, focus state, budgets, consent and audience gates suppress prohibited outputs |
| F-09 | Provide modular widgets | MUST / M1 | T-09: remove/disable a widget, deny its data scope, and isolate a rendering failure without losing core controls |
| F-10 | Integrate selected external reads | SHOULD / M3 | T-10: revoked read grants stop refresh and streaming; cached data ages visibly and obeys retention |
| F-11 | Execute approved low-risk actions | MUST / M5 | T-11: allowed target succeeds with receipt; wrong target, expired grant, duplicate command and changed parameters fail safely |
| F-12 | Expand into multiple rooms | MUST / M6 | T-12: two endpoints hearing one request produce one selected response; no private content leaks on handoff |
| F-13 | Support local scheduled reminders | MUST / M1 | T-13: restart, DST transition and missed deadline follow explicit notification rules; no duplicate action replay |
| F-14 | Expose stop, revoke and consent controls | MUST / M1; audio M2 | T-14: pending actions cancel and new automation stops independently of model availability |
| F-15 | Explain decisions and provenance | MUST / M4 | T-15: a suggestion shows source age and gate reasons; model guesses are labeled as inference |
| F-16 | Separate private and shared views | MUST / M1 | T-16: locked/shared clients receive redacted server payloads; DOM, subscription and cache inspection reveal no private data |

## Security and privacy requirements

| ID | Requirement | Priority / first gate | Acceptance evidence |
| --- | --- | --- | --- |
| S-01 | Authenticate and authorize every API and subscription | MUST / M1 | T-17: anonymous, expired, wrong-user and wrong-household access denied; loopback origin also validated |
| S-02 | Keep model output outside authority | MUST / M1 | T-18: injection in documents, tool results and memory cannot add grants, read secrets or execute a tool |
| S-03 | Validate bounded, typed tool contracts | MUST / M1; hardware M5 | T-19: invalid resource, unknown field, unsafe path, arbitrary URL and oversized payload rejected |
| S-04 | Bind approval to exact action and current authority | MUST / M5 | T-20: altered payload, stale session, revoked grant, reused approval or expired nonce cannot execute |
| S-05 | Protect credentials and audit outcomes | MUST / M1 | T-21: frontend bundle, prompts, logs and repository contain no live secrets; policy metadata is reconstructable |
| S-06 | Pair and revoke devices securely | MUST / M3 | T-22: unpaired or revoked device cannot publish trusted observations or receive personal data |
| S-07 | Enforce encrypted authenticated network links | MUST / first LAN release | T-23: disallowed clients, invalid certificates and unauthorized MQTT topics fail; no exposed plaintext LAN endpoint |
| S-08 | Preserve manual controls and safe failure | MUST / M1 | T-24: core/model failure cannot enable permissions or block physical device control |
| P-01 | Keep strict-local mode free of assistant egress | MUST / M1 | T-01: packet/firewall evidence covers core, workers, widgets, assets, telemetry and integrations during test window |
| P-02 | Avoid default audio/transcript retention | MUST / M2 | T-25: normal sessions and failures leave no durable raw audio or transcript without opt-in |
| P-03 | Enforce data lifecycle and deletion | MUST / first persistent personal data | T-26: deletion clears primary data and derivatives; old backup restore reapplies tombstones before serving users |
| P-04 | Apply purpose-specific cloud consent | MUST / before any cloud feature | T-27: off/revoked/over-budget/unsupported data class prevents outbound payload; visible active-transfer state |
| P-05 | Protect guests and bystanders | MUST / M3 | T-28: unknown or multiple occupants suppress personal spoken content and shared-screen details |
| P-06 | Disable third-party executable plugins initially | MUST / M1 | T-29: unreviewed widget or integration cannot be dynamically installed or granted native access |

## Quality targets

All latency values are measured on a recorded reference PC over at least 100 representative operations; report p50, p95, max, error rate, sample count and warm/cold status. Voice and sensor tests have their own datasets. Absolute safety constraints use zero violations in the specified suite; this is evidence, not proof against every possible attack.

| ID | Target | Gate / test |
| --- | --- | --- |
| N-01 | Core event accepted → visible local widget update p95 ≤500 ms | M1 / T-30; model inference excluded |
| N-02 | Local deterministic voice end-of-utterance → first response audio p95 ≤2.5 s | M2 / T-03; selected PC/language, warm services |
| N-03 | Optional local LLM voice response p95 ≤6 s | M2 evaluation / T-03; if unmet, label/defer free-form voice and retain deterministic path |
| N-04 | Stop/barge-in → audio stopped p95 ≤500 ms | M2 / T-04; local endpoint |
| N-05 | Zero quiet-hour violations; ≤1 false proactive spoken interruption per eight-hour pilot day | M4 / T-08, five consented days; scheduled reminders measured separately |
| N-06 | ≥95% correct intent on 100 consented/synthetic commands per supported language in quiet conditions; ≥85% in defined noise test | M2 / T-03; report ASR word errors separately |
| N-07 | Reference core+UI idle RAM ≤1 GB and idle CPU mean <5% of total host capacity over 10 min | M1 / T-30; AI workers and browser measured separately |
| N-08 | Core recovers after service restart in ≤60 s; no duplicate external effect in crash scenarios | M5 / T-31 |
| N-09 | Backup RPO ≤24 h; restore RTO ≤2 h in a clean-machine drill | M6 / T-32; explicit operator start time and dependency availability |
| N-10 | Keyboard access, visible focus, reduced motion and text alternatives for essential controls | M1 / T-33; manual accessibility checks plus automated checks later |
| N-11 | Seven-day hub pilot with ≥99% measured core availability, excluding declared maintenance | M6 / T-34; track PC/hub power outages separately |
| N-12 | Storage remains within configured quota; low disk stops nonessential writes before corruption | M1 / T-35 |

## Scope and change rules

The first release does not include autonomous external messages, transactions, dangerous physical controls or arbitrary terminal execution. No confidence threshold can substitute for permission. Requested personal data must remain private even when the user is likely nearby.

New requirements receive a stable ID, linked test, target milestone, owner and impact on security, privacy, operations and licensing. Removed requirements remain in history with a reason. Performance changes need benchmark evidence; privacy or permission changes require explicit owner acceptance and an ADR.
