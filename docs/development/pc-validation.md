# PC and recovery-drive validation

This command prepares evidence for M1-02 and the Windows portion of M1-04. It runs on the machine where you execute it. A Linux report never counts as a Windows result, and a same-volume run never proves off-disk recovery.

## Run on Daniel's Windows PC

Open the repository folder in VS Code on the implementation branch containing this command. Use PowerShell:

```powershell
npm ci
npm run build
```

Choose an existing local directory on the drive you want to test. For example, if your separate recovery drive is E:, create a folder using File Explorer, then run:

```powershell
npm run validate:pc -- --recovery-dir "E:\JARVIS-Recovery"
```

Replace E: with your actual drive. Do not select a cloud-sync directory or network share; the current recovery implementation supports local filesystems. If no separate drive is available, an existing local folder can run a **same-disk smoke test**, but off-disk validation stays pending. The command does not create the selected parent directory or install any packages itself.

You can leave your ordinary workspace stopped for a clear test. The validator does not open `.jarvis` or the directory named by your existing `JARVIS_DATA_DIR`. It creates uniquely named synthetic subfolders in the OS temporary directory and selected recovery folder. The temporary loopback server uses an available port, with a small port-allocation race that may require rerunning if another process takes it. No firewall changes, external network requests, personal-data copy or real backup-password entry are performed by the validator.

## What runs

| Check | Expected evidence |
| --- | --- |
| Runtime and assets | Node 24.19 or newer Node 24 patch; built dashboard; existing recovery directory |
| Isolated storage | Synthetic folders created; available space recorded |
| Runtime lock | Second normal start blocked; lock released afterward |
| Workspace and restart | Synthetic task and reminder persist after database reopen |
| Encrypted snapshot | Backup written and authenticated on the selected location |
| Deletion synchronization | Reminder deleted locally and in the independent encrypted journal |
| Isolated restoration | Older snapshot restores only the retained item; permission revoked and delivery paused |
| Real loopback HTTP | Dashboard served; anonymous private read refused; new password logs in; permission reapproval reveals only the retained item while actions remain paused |
| Cleanup | Only this run's synthetic folders removed |

The command prints each result and writes a new JSON report under `artifacts/pc-validation-…json`. It returns a nonzero exit status if a check or cleanup fails. If interrupted, synthetic folders may remain; they use `jarvis-pc-check-` or `jarvis-recovery-check-` prefixes. Inspect them before removing them. Normal failure handling does not remove existing files in your selected folder.

## Reading and sharing the report

The report records OS release, architecture, Node version, CPU model/count, RAM, timezone, free space, application version, Git commit/working-tree status, check durations and remaining manual gates. Git metadata may be absent in a downloaded ZIP. `workingTree: modified` means the reported commit alone does not identify every tested edit.

It omits account names, hostnames, serial numbers, filesystem paths, passwords, journal keys and item content. Inspect the report before sharing it. Attach the JSON report when returning results so failures and the actual platform can be assessed without guessing. Do not attach `.sqlite`, `.jbackup`, `.jdel` or the contents of your real data directory.

`volumeComparison` compares filesystem device numbers on POSIX. On Windows it is deliberately `unverified`; drive letters/partitions alone are not proof of separate physical hardware. Confirm the recovery drive physically and record that in the hardware inventory. Different volumes also do not necessarily mean different physical disks.

Durations are a tiny synthetic smoke test, not the full workload latency benchmark or an achieved household RPO/RTO.

## Still manual

- Fill in the [hardware inventory](../templates/hardware-inventory.md), including actual Windows version, encryption, recovery-key custody, browser and power/sleep settings. Do not record secret values.
- Follow the [Windows quickstart](windows-quickstart.md) for browser enrollment, task/reminder interaction, keyboard use, Ctrl+C/restart and hidden password recovery.
- Follow the [backup guide](backup-recovery.md) for a real terminal backup/restore drill with synthetic records and an independently retained password. The automated drill generates ephemeral passwords in memory, so it does not validate human password custody or terminal UX.
- Validate removable-drive disconnect/reconnect and pending-cleanup behavior on Windows. The automatic smoke test does not unplug a drive or inject a real power failure.
- Confirm OS account permissions, disk encryption, WAN denial, accessibility, full-workload performance and disk-full/power-loss recovery before M1 acceptance.

Automatic backup scheduling and rotation remain unimplemented. This validation command does not configure backups for your real workspace or close M1 automatically.

## Development verification

`npm run check` builds (including type checking) before running tests, because the PC drill exercises the built dashboard over real loopback HTTP. For `npm test` directly, build once first. The wrapper tests verify that existing workspace/recovery files remain unchanged and that invalid destinations fail without deleting unrelated data.

Implementation references: [Node OS API](https://nodejs.org/docs/latest-v24.x/api/os.html), [Node filesystem API](https://nodejs.org/docs/latest-v24.x/api/fs.html), and the project's [recovery ADR](../adr/0009-encrypted-recovery.md). The actual run evidence, rather than these API references, determines platform acceptance.
