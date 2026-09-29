# Milestone 0 — Foundation and specification

**Progress update, 2026-09-28:** [PR #1](https://github.com/danielsantos2310/jarvis/pull/1) was merged on 2026-09-16. Daniel subsequently requested the next project step. [M1 slice 1](001-local-alpha.md) records the bounded implementation scope, selected choices and unresolved acceptance gates. The original review record below is retained as the historical documentation-task status, not current implementation authorization.

Version 0.1 · Status: **documentation prepared; owner acceptance and implementation-readiness decisions pending**.

## Goal and boundary

Make JARVIS concrete enough to implement safely: define what it should do, where authority lives, which data it uses, how it grows and how success will be verified. This milestone creates documentation only. No application scaffold, dependency installation, runtime configuration, firmware, database migration, executable CI or deployment belongs in this change.

Repository: [danielsantos2310/jarvis](https://github.com/danielsantos2310/jarvis). The repository's existing README intent is preserved; the baseline expands it into a reviewable specification.

## Deliverables

| Deliverable | Location | State |
| --- | --- | --- |
| Master specification v0.1 | [Master](../MASTER_PROJECT_SPECIFICATION_v0.1.md) | Prepared for review |
| Requirements and test traceability | [Requirements](../requirements.md), [testing](../testing.md) | Prepared |
| Architecture: system/hardware/software | [System](../architecture/system.md), [hardware](../architecture/hardware.md), [stack](../architecture/software-stack.md) | Prepared |
| Architecture: presence/voice/context/widgets | [Presence](../architecture/presence.md), [voice](../architecture/voice.md), [context](../architecture/context.md), [widgets](../architecture/widgets.md) | Prepared |
| Data and operations | [Data](../architecture/data-model.md), [deployment](../architecture/deployment.md) | Prepared |
| Security/privacy/AI policy | [Security](../governance/security.md), [privacy](../governance/privacy.md), [permissions](../governance/ai-permissions.md) | Prepared |
| Risks and unresolved choices | [Decision register](../governance/open-decisions-and-risks.md) | Assigned by role and deadline |
| Initial proposed ADRs | [ADR index](../adr/README.md) | Proposed; not marked accepted |
| Roadmap and reusable review templates | [Roadmap](../roadmap.md), [inventory](../templates/hardware-inventory.md), [test report](../templates/test-report.md) | Prepared |
| Primary technical references | [Sources](../sources.md) | Researched 2026-09-16 |

## Issue-ready backlog

These IDs are planning IDs, not claims that GitHub issues or a GitHub Milestone object have been created. Copy one row into the repository's milestone-task template when issue creation is requested.

| ID / suggested title | Owner | Dependencies | Completion evidence |
| --- | --- | --- | --- |
| M0-01 Review vision and first workflows | Daniel | Master spec | Choose three first workflows; record included/deferred scope |
| M0-02 Complete PC and peripheral inventory | Daniel | Inventory template | OS, CPU, RAM, disk, GPU if any, mic/speaker, sleep/encryption and network recorded |
| M0-03 Accept or revise core ADRs | Daniel with implementer | M0-01, architecture review | Status/date/rationale recorded for ADR-0001–0006 |
| M0-04 Review threats and action classes | Daniel with security reviewer role | Permissions/security docs | Confirm excluded tools, grants, approval and failure model; no undocumented bypass |
| M0-05 Review household privacy defaults | Daniel; other affected members decide own consent | Privacy/context docs | Languages, timezone, quiet hours and desired sensing purposes chosen; no assumed bystander consent |
| M0-06 Select M1 authentication approach | Implementer; Daniel accepts recovery UX | M0-02 | Mature library candidate, offline enrollment/recovery and LAN upgrade path documented |
| M0-07 Define model and voice benchmark plan | Implementer | M0-02 and language choice | Candidate licenses, sample corpus and performance setup recorded; no model purchase required |
| M0-08 Validate documentation package | Implementer | All prepared documents | Link, ID, source, consistency and no-code scope checks recorded |
| M0-09 Review and merge documentation baseline | Daniel | M0-01,03,04,05,06,08 | PR approved/merged or explicit requested revisions; no fabricated sign-off |
| M0-10 Authorize M1 implementation | Daniel | M0 exit gate | Explicit implementation scope and first issue selected |

## M0 exit checklist

- [x] Master specification and all requested architecture areas documented.
- [x] User requirements distinguished from proposed technical choices.
- [x] Permissions, privacy defaults, threats, failure modes and excluded capabilities defined.
- [x] Requirements mapped to named test cases and milestones.
- [x] ADR structure, initial proposals, roadmap, risks and issue-ready backlog prepared.
- [ ] PC inventory and first three workflows confirmed by Daniel.
- [ ] M1 authentication/recovery approach selected.
- [ ] Owner reviews privacy/attention defaults and records baseline acceptance.
- [ ] Documentation review and final repository merge recorded by owner.
- [ ] M1 application work explicitly authorized in a subsequent task.

Prepared documents are not proof that runtime controls work. The documentation package may be reviewed now while hardware-specific questions remain open. M1 cannot begin until its blocking decisions are resolved; later room/voice decisions can remain pending until their own gates.

## Suggested first three workflows for review

1. Open the private local dashboard and inspect assistant health, tasks and timers while internet is disconnected.
2. Ask by text, later by voice, to create a local reminder and inspect exactly what was saved.
3. View one room's occupancy as occupied/vacant/unknown without inferring identity or speaking personal information.

These are proposed testable slices, not substituted user decisions. Calendar summaries and proactive briefings follow after scope and privacy gates.

## Owner review record

| Field | Value |
| --- | --- |
| Review date | Pending |
| Reviewer | Daniel |
| Baseline decision | Pending |
| First workflows | Pending M0-01 |
| Accepted ADRs | Pending |
| Approved deviations | None recorded |
| M1 authorization | Not granted by this documentation task |
