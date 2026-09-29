# Development phases and roadmap

Version 0.1 · Gate-based sequence; no committed delivery dates.

Progress 2026-09-28: M0 documentation is merged. [M1 slice 1](milestones/001-local-alpha.md) implements the first PC workflow for evaluation; full M1 acceptance remains open.

Build a useful secure local slice before broad integration. Permissions, privacy and failure behavior are part of every milestone, not a final hardening phase. Work below is planned, not authorized implementation in this documentation-only task.

| Milestone | Scope / deliverable | Dependencies | Exit gate |
| --- | --- | --- | --- |
| M0 — Foundation | Master specification, requirements, architectures, policy, ADRs, risks, issue-ready backlog | Existing repository and owner goals | Documentation complete; owner accepts baseline; M1 blockers resolved or explicitly deferred |
| M1 — Secure PC alpha | Local core, authenticated dashboard, storage, typed interaction, status/task/timer widgets, policy skeleton, synthetic adapters | M0 acceptance, OS/hardware and auth decision | Offline slice; no secrets in UI; authorization, reminder, storage, basic recovery and accessibility tests |
| M2 — Local voice | STT/TTS, deliberate activation, follow-up, cancel/mute, optional measured local LLM | M1; microphone and language inventory | Voice accuracy/latency, retention, stop and no-silent-cloud tests |
| M3 — Presence and scoped reads | One calibrated room, guest-safe state, paired sensor, selected calendar/home reads | M1; voice optional for display-only presence | Sensor freshness, wrong-identity and guest tests; integration revoke works |
| M4 — Context and useful proactivity | Approved memory, provenance, attention policy, shadow mode, limited suggestions | M2 for speech; M3 for room-aware output | Deletion and source correction; five-day attention evaluation; no private audience violation |
| M5 — Bounded actions | One approved light/device, explicit routines, action receipts, read-back and stop | M1 policy; M3 integration; M4 if proactively suggested | Target/parameter, approval replay, revocation race and crash uncertainty tests |
| M6 — Multi-room home pilot | Measured hub, two rooms, pairing/arbitration, PC-to-hub migration, backup drill | Stable M2–M5 | Seven-day pilot, recovery drill, no cross-room leaks and independent manual controls |

M1 local reminders are low-risk P2 operations on user-owned data; M5 introduces physical/external executors. Do not postpone action policy until M5 just because only local records exist earlier.

## Optional branches and decision triggers

| Branch | Trigger | Prerequisite |
| --- | --- | --- |
| Tauri desktop packaging | Browser cannot provide required tray, hotkey or lifecycle function | Narrow native capabilities ADR and OS support matrix |
| Cloud inference/voice | User explicitly values quality beyond measured local capability | Provider privacy/cost review, consent and egress tests; core stays local |
| PostgreSQL | Reproducible write contention or multiple-writer need | Migration and recovery ADR; not simply more rooms |
| Additional sensors/rooms | One-room false-alarm and privacy gates passed | Per-room calibration and consent |
| Remote access | Local operation stable and user requests remote use | Private network design, strong app auth and revocation drill |
| Advanced personal/project widgets | Concrete recurring workflow and approved source | Data contract, scope and lifecycle review |
| External writes/messages | Explicit new product decision | P3 implementation, recipient/target preview and security ADR |

## Deferred research

Ambient no-wake-word initiation, custom wake phrase, automatic room-to-room conversation handoff, low-power inference, federated devices and third-party widget sandboxing need separate experiments. Facial recognition, voice biometrics and dangerous actuation remain out of baseline. Research does not grant permission to collect real household data.

## Planning cadence and definition of done

Each implementation issue should deliver one reviewable capability or risk reduction, name requirement/test IDs, define rollback and update affected docs. Use small branches and PRs. A milestone closes when its evidence and owner review are recorded, not when every planned line of code exists.

At each milestone, review useful workflows, false interruptions, latency, operator burden, model quality, privacy incidents and maintenance cost. Change scope before buying more hardware if the current architecture fails a basic user need. Dates and effort estimates follow the confirmed reference PC and Daniel's available development time.
