# Run the JARVIS local alpha on Windows / VS Code

This is the M1 evaluation alpha (slices 1 and 2). Use synthetic tasks initially. It runs on the work PC; the Alienware server, Docker, Python and AI models are not needed yet.

## 1. Get this branch

In your existing `jarvis` repository, open **Terminal → New Terminal** in VS Code. Check that the terminal is inside the repository folder. Save existing local changes before switching branches.

```powershell
git fetch origin
git switch feat/m1-local-alpha
```

If you do not use Git locally, download the ZIP from the implementation branch on GitHub, extract it, then use **File → Open Folder** to open the folder containing `package.json`. Keep the project and `.jarvis` state on your PC's local disk, outside network/shared/synchronized folders.

## 2. Check Node and install

Install the **Node.js 24 LTS line** from the [official Node website](https://nodejs.org/en/download). Tested version: 24.19.0, npm 11.9.0; minimum supported by this package: 24.19.0, within major 24. If Node was just installed, close and reopen VS Code so the terminal sees it.

```powershell
node --version
npm --version
npm ci
npm run build
npm start
```

`npm ci` needs internet to obtain the locked dependencies. Once installed and built, the application's core flows do not need an internet connection. A printed SQLite experimental warning is from the selected Node API; it is not a missing Python installation. Keep security updates and package review current before a personal pilot.

If PowerShell says `npm.ps1` cannot run because scripts are disabled, use `npm.cmd` in the commands above, or select **Command Prompt** as the terminal profile. No execution-policy weakening is necessary.

## 3. Open and enroll

Open **[http://127.0.0.1:3000](http://127.0.0.1:3000)** in Chrome or Edge on this same PC.

On first launch, the terminal prints a random setup code, valid for ten minutes. Copy it into the form, choose a password of 12–128 characters, and approve local task/reminder/timer storage. The setup code is not a password, is not available through the browser API, and cannot enroll a second owner. If it expires, stop and restart JARVIS for a new code.

On later visits, enter your password. Sessions expire after 30 minutes and after restarting the core. **Lock workspace** signs out and clears the screen. Password recovery is described below.

## 4. Try the first workflows

```text
add task Review the JARVIS project
remind me in 1 minute to stretch
timer 5 minutes
help
```

You can also add items directly in the task form. An optional date opens reminder settings. Choose once, every day or every week; confirm the time zone and clock-change/missed-delivery policies. Select **Preview reminder times**, inspect the local dates and UTC offsets, then select **Add**. See the [recurring reminder guide](recurring-reminders.md), including schema-2 upgrade/rollback instructions.

- Complete/delete tasks, cancel timers and dismiss due inbox entries with the corresponding controls.
- Pause new actions and reminder delivery in **Controls**. Resume requires your password.
- Revoke workspace permission to remove private task/notice data from server responses; restore it with password confirmation.
- Open the sensor simulator to try occupied/vacant/unknown. It is synthetic and resets to unknown after 30 seconds; no microphone or real sensor runs.

A reminder appears silently in the private inbox when due. It cannot wake a sleeping PC or alert you while the core is stopped. When you restart, missed reminders enter the inbox once with a late label. Timers store their deadline; they do not restart their full duration.

## 5. Stop and restart

In the server terminal, press **Ctrl+C**. Then run `npm start` again when needed. Local records persist in `.jarvis/jarvis.sqlite`; that folder is excluded from Git. Never commit or share its contents, session traces, backups or your setup code.

If port 3000 is occupied, select another local port before starting:

```powershell
$env:JARVIS_PORT = "3100"
npm start
```

Use `http://127.0.0.1:3100` in that case. The app intentionally rejects other Host values. Do not use Live Server for this app; it needs the running core API. The address is local to your PC and is not a shareable link. LAN exposure or a VS Code public tunnel requires the later authenticated HTTPS profile.

## Offline password recovery

1. Stop the running core with Ctrl+C.
2. In the same project folder/data-directory environment, run:

```powershell
npm run recover
```

3. Type and repeat a new password at the hidden terminal prompts.
4. Run `npm start`, sign in, then review and resume actions in Controls.

This retains saved items, increments the authentication epoch, invalidates previous sessions and pauses delivery. It requires operating-system access to this installation; it is not an email recovery process.

If `DATA_LOCKED` appears, first check for another running JARVIS/recovery terminal and stop it. After a crash, use Task Manager to confirm that the JARVIS process is no longer running. **Only then** remove `.jarvis/runtime.lock` and restart. Do not delete the SQLite database to fix a lock. Future process supervision should automate safe stale-lock recovery.

## Verification commands

```powershell
npm run check
npx playwright install chromium
npm run test:e2e
```

The browser test provisions its own temporary synthetic workspace and cleans it on normal exit. Test browser downloads require internet. Test files contain fixed synthetic credentials, never used by `npm start`.

## Before using personal household data

This slice is not a completed home deployment. Confirm Windows account permissions and disk encryption, complete the PC inventory, and perform the [encrypted backup and recovery drill](backup-recovery.md) on the actual Windows PC. The SQLite data itself is not application-encrypted. Use the current independent deletion journal for every restore; keep personal data offline if cleanup is pending or journal freshness is uncertain. See [remaining M1 gates](../milestones/001-local-alpha.md).

Official technical references: [Node downloads](https://nodejs.org/en/download), [npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci), [VS Code terminal basics](https://code.visualstudio.com/docs/terminal/basics), [Playwright browser installation](https://playwright.dev/docs/browsers).

## Encrypted backups (alpha 3)

Stop JARVIS, then follow [backup and recovery](backup-recovery.md). Commands configure a separate recovery location, create password-encrypted snapshots and restore to a new folder. Restoration uses a new workspace password, pauses actions and revokes workspace permission. This upgrades storage to schema 3; earlier alphas cannot open it. Windows execution and power-loss/removable-drive behavior still need validation.
