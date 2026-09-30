# JARVIS

Local-first proactive AI assistant with voice, presence awareness, smart-home integration, context, memory and modular widgets.

**Current stage: Milestone 1 — local PC alpha with recurring reminders and encrypted recovery, ready for review. The full milestone is not yet accepted.**

JARVIS starts on one PC and is designed to grow into a private, multi-room home assistant. It should be useful offline, understand when to stay quiet, and keep every action inside permissions controlled by the user.

## Browser preview

An interactive sample-data dashboard is prepared for GitHub Pages. See [preview build, hosting setup and limits](docs/development/github-pages-preview.md). It resets on reload and does not connect to a real workspace. [Open the live sample preview](https://danielsantos2310.github.io/jarvis/), verified on 2026-09-29. The owner made the repository public temporarily for testing; returning it to private can disable Pages on the current account plan.

## Run the local alpha

Use Node.js 24.19.0 or a compatible supported Node 24 patch. In the repository folder:

```powershell
npm ci
npm run build
npm start
```

Open **http://127.0.0.1:3000** on the same PC. First-run enrollment uses the code printed in your terminal. Create a password, then try `add task Review JARVIS`, `timer 5 minutes` or `remind me in 1 minute to stretch`.

[Windows / VS Code setup and recovery](docs/development/windows-quickstart.md) · [M1 scope and remaining gates](docs/milestones/001-local-alpha.md) · [Validation evidence](docs/testing/m1-slice-1.md)

This slice includes authenticated local tasks, one-shot and daily/weekly reminders, timers, a private inbox, permission controls and a synthetic presence simulator. Defined text commands work without an AI model. Voice, real sensors, cloud and external actions are not implemented. Manual and opt-in automatic encrypted backups, bounded retention and isolated restoration with deletion replay are available. Use synthetic examples until the personal-pilot gates are met.

See [recurring reminder setup and clock-change choices](docs/development/recurring-reminders.md) for the second M1 slice. See [encrypted backup and recovery](docs/development/backup-recovery.md) and [slice-3 validation](docs/testing/m1-slice-3.md) for the third slice.

See [automatic backup setup](docs/development/automatic-backups.md) to unlock daily backups for a running core session.

## Validate your PC

The local dashboard also includes an optional [30-second microphone test](docs/development/microphone-lab.md). It measures input level only after a click and browser permission; speech recognition, clap activation and real presence sensors are not connected yet. The public sample preview keeps microphone access off.

After building, run `npm run validate:pc -- --recovery-dir "E:\JARVIS-Recovery"` with an existing local directory on your chosen drive. It uses temporary synthetic data and writes a results report without opening your real workspace. See the [Windows PC validation guide](docs/development/pc-validation.md).

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

The master specification preserves the M0 design baseline. The M1 implementation is a bounded evaluation slice, recorded in ADR-0007; it does not imply owner acceptance of every proposed ADR. Exact application dependencies are locked. Hardware, speech/model choices, release acceptance and personal-pilot recovery remain gated.

Repository: [danielsantos2310/jarvis](https://github.com/danielsantos2310/jarvis).

See [contribution rules](CONTRIBUTING.md), [security reporting](SECURITY.md) and the [changelog](CHANGELOG.md).
