# Architecture Decision Records

An ADR records a significant decision, its alternatives, consequences and validation. Use [the template](0000-template.md), a sequential four-digit ID and a short filename. The ID never changes. Link affected requirements, sources, tests and any superseded ADR.

## Lifecycle

Proposed → Accepted or Rejected. An Accepted record may later become Deprecated or Superseded by a new record. Preserve old rationale in Git history; do not silently rewrite an accepted decision. Acceptance requires named owner, date and evidence. A draft PR is not owner acceptance.

Create an ADR for changes to trust boundaries, persistence, major dependencies, provider use, data collection, AI permissions, protocols, hardware deployment or meaningful performance/privacy tradeoffs. Small UI copy and routine implementation choices do not need one.

| ID | Decision | Status |
| --- | --- | --- |
| [0001](0001-local-authority.md) | Local authority with optional consented external services | Proposed |
| [0002](0002-modular-core.md) | TypeScript modular core with isolated workers/executor | Proposed |
| [0003](0003-local-persistence.md) | SQLite first; measured migration trigger | Proposed |
| [0004](0004-deterministic-permissions.md) | Deterministic permissions outside model reasoning | Proposed |
| [0005](0005-presence-and-voice.md) | Non-biometric presence and deliberate bounded voice sessions | Proposed |
| [0006](0006-pc-to-home-hub.md) | One-PC pilot to single home hub with thin room endpoints | Proposed |

Future ADRs should cover cloud provider selection, native desktop capabilities, executable plugin isolation, database migration and any P3 external-write feature. These are not implicitly approved by the initial records.

## Implementation follow-up

[ADR-0007: first local PC alpha](0007-m1-local-alpha.md) records selected implementation choices and their limits. Implemented for evaluation; owner acceptance pending. Earlier proposed ADRs are not silently marked accepted.
