# JARVIS

Local-first proactive AI assistant with voice, presence awareness, smart-home integration, context, memory and modular widgets.

**Current stage: Milestone 0 — documentation and architecture. No application has been implemented.**

JARVIS starts on one PC and is designed to grow into a private, multi-room home assistant. It should be useful offline, understand when to stay quiet, and keep every action inside permissions controlled by the user.

## Start here

1. [JARVIS MASTER PROJECT SPECIFICATION v0.1](docs/MASTER_PROJECT_SPECIFICATION_v0.1.md)
2. [Milestone 0 deliverables, backlog and exit criteria](docs/milestones/000-foundation.md)
3. [Requirements and acceptance criteria](docs/requirements.md)
4. [Development phases and roadmap](docs/roadmap.md)
5. [Open decisions and risks](docs/governance/open-decisions-and-risks.md)

## Documentation map

| Area | Document |
| --- | --- |
| System boundaries and message contracts | [System architecture](docs/architecture/system.md) |
| PC, home hub and room devices | [Hardware architecture](docs/architecture/hardware.md) |
| Languages, frameworks and selection gates | [Software stack](docs/architecture/software-stack.md) |
| Occupancy and identity uncertainty | [Presence detection](docs/architecture/presence.md) |
| Local speech and conversation sessions | [Voice architecture](docs/architecture/voice.md) |
| Memory, context and proactivity | [Context engine](docs/architecture/context.md) |
| Dashboard and modules | [Widget architecture](docs/architecture/widgets.md) |
| Entities, ownership and lifecycle | [Data model](docs/architecture/data-model.md) |
| Installation, recovery and expansion | [Deployment strategy](docs/architecture/deployment.md) |
| Threats and trust boundaries | [Security model](docs/governance/security.md) |
| Collection, retention and disclosure | [Privacy model](docs/governance/privacy.md) |
| Action authorization | [AI permission model](docs/governance/ai-permissions.md) |
| Verification and release gates | [Testing strategy](docs/testing.md) |
| Decision history | [Architecture Decision Records](docs/adr/README.md) |
| Primary references | [Sources](docs/sources.md) |

## Scope of this version

This is a proposed engineering baseline for review. User requirements are distinguished from proposed implementation choices. Hardware, exact dependency versions, model selection and delivery dates remain subject to the documented gates. There are no setup commands because there is no runnable software yet.

Repository: [danielsantos2310/jarvis](https://github.com/danielsantos2310/jarvis).

See [contribution rules](CONTRIBUTING.md), [security reporting](SECURITY.md) and the [changelog](CHANGELOG.md).
