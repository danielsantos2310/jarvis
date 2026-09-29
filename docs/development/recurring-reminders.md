# Recurring reminders — M1 slice 2

Version `0.2.0-alpha.2` · 2026-09-29 · Implemented for evaluation; full M1 remains open.

## Use it

In **Tasks & reminders**, enter a title and an optional reminder start date/time. With a date selected:

1. Choose **Once**, **Every day** or **Every week**. Weekly uses the starting date's weekday.
2. Confirm the IANA time zone (for example `Europe/Dublin`). The browser's zone is the initial default; the saved zone stays fixed when you travel.
3. Choose what should happen when the clock skips or repeats the requested time.
4. Choose whether a reminder more than one minute late should show its latest due occurrence or be skipped.
5. Select **Preview reminder times**. Check the resolved dates, local times and UTC offsets, then select **Add**.

Changing any schedule setting invalidates the preview. The server independently resolves the first occurrence again when saving and rejects a mismatched preview. A date without a title cannot be saved. The first resolved deadline must be in the future and within one year. Three upcoming occurrences are shown for repeats; one for a one-shot.

Without a date, the form still creates an ordinary task. Text commands remain deliberately unchanged: `remind me in 10 minutes to stretch` creates a one-shot relative reminder, and `timer 5 minutes` creates a timer. Recurring text interpretation is not yet supported.

## Clock-change choices

| Situation | Choice | Behavior |
| --- | --- | --- |
| Local time does not exist when clocks advance | First valid time (default) | Use the first valid instant after the gap, then resume the original requested local time on later dates |
| Local time does not exist | Skip | Omit that occurrence; continue the repeat. A one-shot with no valid occurrence is rejected |
| Local time occurs twice when clocks go back | First occurrence (default) | Use the earlier UTC instant once |
| Local time occurs twice | Second occurrence | Use the later UTC instant once |

Example from the test fixtures: `Europe/Dublin`, 2027-03-28 at 01:30 does not exist. The first-valid policy resolves it to **02:00, UTC+01:00**, then a daily reminder returns to 01:30 on the next date. The server uses Temporal with the runtime's IANA data; it does not add fixed 24-hour durations to recurring local dates.

The preview shows the server's result. The API also returns its timezone database version. Future dates use the installed Node runtime's time-zone rules; upgrading Node can change future rules. The already stored next deadline remains authoritative until consumed. Annual policy changes should trigger review of important schedules; this slice does not pin or download a separate timezone database.

## Offline, pause and inbox behavior

- Saved reminders survive restart. No process runs while the PC is asleep or the core is stopped.
- Default missed policy: put the latest due occurrence in the private inbox. Earlier missed occurrences are consolidated, not replayed one by one.
- **Skip missed occurrences** suppresses a delivery more than 60 seconds late; an occurrence up to and including 60 seconds late still enters the inbox. The existing late label appears after five seconds.
- There is at most one inbox entry per reminder. The next due occurrence updates that entry and receives a new ID. A stale dismiss request cannot dismiss that new entry.
- Dismissing an inbox entry leaves the repeat running. **Stop repeating [title]** completes the entire series; deleting the item removes the series and its inbox entry.
- Global pause and permission revocation stop dispatch and schedule advancement. Resume/restoration uses the saved missed policy. Moving the clock backwards does not replay an already consumed occurrence.
- Delivery, the next deadline and redacted audit metadata commit in one SQLite transaction. Failure rolls them back together.

At most 100 due items are processed per scheduler tick. Calendar arithmetic jumps directly near the current date, with a bounded number of candidates, instead of iterating every missed day. This bounds recovery work but is not a claim that the full M1 latency/load target has been met.

## Upgrade and rollback

This version transactionally upgrades **SQLite schema 1 → 2**, adding only nullable schedule JSON and an occurrence index to existing items. Existing owner records, tasks, notices, receipts and settings remain intact. Reopening schema 2 does not apply the migration again. Newer, unknown schemas are rejected.

Before trying it with an existing **synthetic** alpha workspace, stop JARVIS and retain a protected copy of the entire stopped `.jarvis` folder. This is a development rollback copy, not a completed encrypted personal-backup feature. Do not copy a live database by itself.

The previous alpha refuses schema 2. To roll back a synthetic evaluation, stop JARVIS and restore the full pre-upgrade copy before using the old application; this discards changes made after that copy. There is no automatic schema downgrade. Alpha 3 now provides a separate [encrypted recovery workflow](backup-recovery.md); use it with the current independent journal. Personal-pilot and Windows acceptance remain pending.

## Scope and sources

Daily/weekly local reminders only: no monthly/RRULE import, custom weekdays, series editing, sound, OS push, voice, cloud or external actions. To change a series, create and inspect the replacement, then stop/delete the old one. Existing scoped grants, Origin/CSRF checks, body quotas and action idempotency apply.

- [Temporal ZonedDateTime](https://tc39.es/proposal-temporal/docs/zoneddatetime.html): time-zone arithmetic, ambiguity handling and transitions.
- [Temporal polyfill](https://github.com/js-temporal/temporal-polyfill): pinned `@js-temporal/polyfill` 0.5.1, ISC license. Only the core imports it; the browser receives resolved timestamps.
- [Tests and limits](../testing/m1-slice-2.md).

The default policies above are JARVIS product decisions. Library documentation supports the mechanism, not a guarantee of delivery while the PC is off.
