# Open decisions and risk register

Implementation update (2026-09-28): see [M1 slice 1](../milestones/001-local-alpha.md) and [ADR-0007](../adr/0007-m1-local-alpha.md) for selected choices, prior Windows/hub context and remaining gates. The proposal register below is the M0 baseline.

Version 0.1 · Unknown values are intentionally not invented.

## Open decisions

| ID | Question / proposed default | Owner | Must resolve before | Blocks current documentation? |
| --- | --- | --- | --- | --- |
| D-01 | Actual PC OS, CPU, RAM, storage, GPU and peripherals? | Daniel | M1 setup | No |
| D-02 | First three workflows and weekly development capacity? | Daniel | M1 scope | No |
| D-03 | Accept TypeScript/Next.js/core boundary and SQLite start? | Daniel + implementer | M1 | No |
| D-04 | Local auth library, enrollment and offline recovery UX? Password baseline; passkeys optional | Implementer, Daniel approves | M1 | No |
| D-05 | First voice language: English, Brazilian Portuguese or both? | Daniel | M2 corpus and model selection | No |
| D-06 | Timezone and quiet-hour defaults? Candidate Europe/Dublin, 22:00–08:00 | Daniel | First real reminder/proactivity setup | No |
| D-07 | Who shares the home, which rooms may sense/capture, guest expectations? | Daniel and affected participants | Real household sensing | No |
| D-08 | Existing Home Assistant, smart devices or sensors? | Daniel | M3 integration | No |
| D-09 | Model/voice licenses, latency and memory footprint on actual PC? | Implementer | M2 feature acceptance | No |
| D-10 | Hardware budget, room layout and acceptable fan/power/noise level? | Daniel | Any purchase / M6 hub choice | No |
| D-11 | Allow any cloud inference or external data integrations? Default off | Daniel | Each external capability | No |
| D-12 | Backup location, key custodian and restore operator? | Daniel | Persistent personal pilot | No |
| D-13 | Keep repository private; choose any future redistribution license? | Daniel | Public release/distribution | No; no license assumed |
| D-14 | HA Container or existing HA/HA OS VM; sensor transport source of truth? | Implementer + Daniel | M3/M6 | No |

## Initial risks

Likelihood and impact are qualitative planning assessments, not measured probabilities.

| ID | Risk | Likelihood / impact | Mitigation and owner | Trigger / contingency |
| --- | --- | --- | --- | --- |
| R-01 | Local voice/model too slow on existing PC | Medium / High | Benchmark early; deterministic fallback; implementer | Miss N-02/N-03 → smaller model, typed path or explicit scope change |
| R-02 | Presence misidentifies person or audience | High / High | Separate identity/auth; guest-safe outputs; implementer | Any disclosure → disable personal room output and investigate |
| R-03 | Useful assistant becomes interruptive | Medium / High | Shadow mode, budgets, DND and easy disable; Daniel evaluates | Attention target miss → return to shadow mode |
| R-04 | Prompt injection drives a tool or egress | Medium / Critical | Deterministic gateway, no secrets in model; implementer | Any bypass → block affected release/integration |
| R-05 | Broad HA token increases compromise impact | Medium / High | Isolated executor and smallest practical identity; implementer | Insufficient isolation → keep read-only or defer integration |
| R-06 | PC sleep/offline breaks reminders | High / Medium | Visible availability and missed-event policy; Daniel | Need continuous service → evaluate always-on hub |
| R-07 | Scope expands before a useful slice | High / Medium | Gate-based roadmap and three workflows; Daniel | Repeated unfinished milestones → cut optional scope |
| R-08 | Sensor/audio firmware incompatibility | Medium / Medium | Inventory exact board; one-device pilot; implementer | Failed compatibility → alternative endpoint, no bulk purchase |
| R-09 | Model/voice redistribution restrictions | Medium / High | Artifact/license inventory; project owner | Unresolved rights → block redistribution/change asset |
| R-10 | Backup loss or restore resurrects data/grants | Medium / High | Encrypted off-disk copy, tombstones and drills; operator | Failed restore → block home pilot |
| R-11 | Multi-room duplicate playback or private handoff | Medium / High | Turn leases, explicit handoff, ambiguity fallback; implementer | Any cross-room leak → disable handoff |
| R-12 | Cloud cost/data exposure | Medium / High if enabled | Off by default, purpose grants and hard budget; Daniel | Limit/revocation → block new requests, local fallback |
| R-13 | Single hub failure stops assistant | Medium / Medium | Backup, manual controls, honest unavailable state; operator | Reliability shortfall → improve operations before adding rooms |

Review at each milestone, after a security incident, before a new integration and before hardware purchases. Record changed decisions in an ADR; do not silently rewrite accepted history.
