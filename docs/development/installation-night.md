# PC installation night — local alpha

Prepared for Daniel's planned setup on **Monday 12 October 2026, evening (Europe/Dublin)**. The operating system is not yet confirmed. These project commands work in a terminal on Windows or Linux; they do not install an OS or change firewall settings. Actual hardware acceptance remains pending.

## Before starting

- Use a normal, protected user account. Keep the repository and private data on a local disk, outside shared/cloud-sync folders. Confirm disk encryption before entering personal data.
- Have the microphone, speakers/headphones and an independent recovery drive available. A same-disk folder can test recovery mechanics but cannot prove off-disk recovery.
- Install Git if using a clone, and the project-supported Node **24.19.0 or later within major 24**, using the [official Node download](https://nodejs.org/en/download). Reopen your terminal and check `node --version` and `npm --version`.
- Use a reviewed checkout. This installation-readiness change is on `feat/installation-readiness` until reviewed/merged. Preserve local edits before switching. Do not reinstall over an existing workspace or delete `.jarvis` to fix startup.

## 1. Build and check the core

From the folder containing `package.json`:

```text
npm ci
npm run build
npm run doctor
```

Run each command separately and proceed only if it succeeds. On restricted Windows PowerShell, use `npm.cmd` instead of `npm`; do not weaken execution policy. `npm ci` installs the lockfile's dependencies and replaces `node_modules`, not your workspace. Internet is needed for initial dependencies. See [npm's documented behavior](https://docs.npmjs.com/cli/v11/commands/npm-ci/).

`doctor` checks the runtime, package resolution, local build, workspace access, runtime/restore markers, and loopback port. Gmail/voice are optional. It does not open SQLite, create data folders, install software, kill processes, print credentials or contact accounts. It briefly binds/releases the configured **127.0.0.1** port. A pass means **ready to attempt startup**, not a completed installation/security certification. Build presence does not establish freshness.

Exit codes: `0` = required checks passed; `1` = blockers; `2` = invalid arguments/unexpected diagnostic error. For clean machine-readable output after prerequisites are installed, use `npm run --silent doctor -- --json`. Review any report before sharing. Checks inspect the current process environment; they do not automatically load a `.env` file.

## 2. First launch and essential tests

```text
npm start
```

Open **http://127.0.0.1:3000** on that same PC (or the configured port printed in the terminal). This local loopback profile deliberately uses HTTP; it is not public/LAN hosting. Never forward the port or bind it to all interfaces. GitHub Pages is only the sample preview, not your installed core.

1. Enroll using the terminal setup code; choose a unique password. Do not share screenshots of that code.
2. Start with synthetic records: `add task Installation test`, `timer 1 minute`, `remind me in 1 minute to test the inbox`.
3. Confirm the due inbox, task completion, lock/unlock and pause/resume.
4. Stop with **Ctrl+C**, restart with `npm start`, and confirm the saved test task survives. Never use `doctor` to clear a running process's lock.
5. In Microphone, try **Test device voice** and the local input meter. Device voices depend on what the browser reports as local. The optional cloud/browser-recognition and clap greeting from Pages remain **public-preview-only**; they are not a private local AI conversation.

## 3. Local Whisper/Piper (optional second stage)

First confirm the core works without Docker. Then follow the [local voice guide](local-voice.md). The supplied Compose setup needs a working Docker/Compose installation; on Windows it expects Linux containers. Native compatible workers are also supported. Do not install privileged services automatically from this checklist.

```text
docker compose -f deploy/voice.compose.yaml up -d
docker compose -f deploy/voice.compose.yaml ps
npm run voice:check
npm run start:voice
```

Stop the existing core before `start:voice`. Initial image/model downloads need internet. The Compose images use moving `latest` tags; record resolved digests and model licences before accepting the installation. Test **Check voice engines**, **Test spoken voice**, then capture → review transcript → send command. Recognition does not execute commands automatically.

Test Stop, microphone denial, tab hide, lock during playback, worker failure and operation offline after model downloads. Measure latency and CPU/RAM on the real PC. No assumption is made about the older NVIDIA GPU, memory upgrade, voice quality or model speed. No AI conversational model, owner identification, sensor wake-up or Echo connection is installed by these steps.

## 4. Gmail and recovery

- Gmail: follow [read-only email setup](service-connections.md); set credentials locally in the server environment, never in browser code or Git. Variable presence is not OAuth authorization. Confirm the redirect port matches the local core. Connect/read only when ready to use personal data.
- Recovery: after the build, run `npm run validate:pc -- --recovery-dir "YOUR_EXISTING_RECOVERY_FOLDER"`. Replace the placeholder with your real existing local recovery folder. The [PC validation guide](pc-validation.md) describes the isolated synthetic drill and its limits.
- Configure real encrypted backups only through the [backup guide](backup-recovery.md). Keep backup-password custody independent. SQLite itself is not application-encrypted.

## Acceptance record to complete on the PC

Record OS/version, Node version, microphone/speaker models, git commit, core restart outcome, voice workers/model digests, measured latency, offline result and recovery-drive result. Do not record passwords, tokens, setup codes, email contents or recordings in Git. Mark unfinished tests as pending, not passed.

M1 remains open until the [remaining acceptance gates](../milestones/001-local-alpha.md) and owner review are complete. There is no unattended startup or promised overnight background work in this change. Start manually and stop safely before considering OS service installation.

Technical references: [Node net API](https://nodejs.org/docs/latest-v24.x/api/net.html), [Node filesystem access limitations](https://nodejs.org/docs/latest-v24.x/api/fs.html#fsaccesssyncpath-mode), [npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/). Project contracts and actual PC evidence determine readiness.
