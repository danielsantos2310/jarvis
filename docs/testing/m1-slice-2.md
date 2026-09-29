# M1 slice 2 — recurrence verification

Date: 2026-09-29. Version: `0.2.0-alpha.2`. Synthetic data only. Extends the [slice-1 report](m1-slice-1.md); Windows hardware and full M1 acceptance remain pending.

## Changes under test

Daily/weekly reminders, authenticated schedule preview, explicit missing/repeated clock-time choices, missed-delivery policy, atomic schedule advancement, stale-dismiss protection and SQLite schema 1 → 2 migration. See [behavior and sources](../development/recurring-reminders.md).

## Execution results

- Core/domain/API tests: **25/25 passed**, including 12 new recurrence/migration groups and the schedule-preview authorization test.
- Type check and Vite build: passed.
- Browser scenario: **passed** (10.2 seconds); reviewed the 390 px scheduling screenshot. No external page requests or page errors observed.
- Dependency audit: **zero known vulnerabilities reported** for the locked package graph; this is advisory coverage, not an independent security audit.

Environment: Linux x64, Node 24.19.0, npm 11.9.0, IANA data 2026b, Chromium 153.0.8010.0 and Playwright 1.63.0. The cached Chromium binary had been truncated during environment restoration; re-extracting the same browser package restored the executable. Windows results are not inferred from this run.

Documentation: 126 local links resolve and patch whitespace checks passed.

## Coverage

The new deterministic scheduler tests exercise:

- Dublin's spring gap resolves 01:30 to the first valid 02:00; the next daily occurrence returns to 01:30.
- Gap skip, impossible one-shot rejection and both autumn overlap choices; weekly recurrence keeps its weekday.
- Lord Howe's half-hour gap, Samoa's skipped calendar date and Kathmandu's fractional offset.
- Invalid dates/zones/rules fail instead of silently normalizing.
- Leap day and a decade of downtime resolve without iterating every missed day.
- Reopened storage, once-only delivery, missed-day consolidation and preserved local-time intent.
- Skip policy's 60-second boundary.
- Stale dismiss cannot erase a newer notice; completion stops the series.
- Pause, revocation, backwards clock movement and audit failure do not dispatch or advance improperly.
- Changed previews, mixed deadline authorities and wrong item kinds fail; valid requests remain idempotent.
- Schema-1 migration retains existing owner, item and notice records and can be reopened safely.
- API preview requires authentication and current local grant; strict schemas reject unknown fields.

Browser coverage extends the original scenario with daily reminder creation, missing-time preview and offset, invalidation after changing a policy, 390 px schedule controls, persistence through reload and stopping a repeat.

## Limits

T-13 is now implemented/tested for this explicit once/daily/weekly policy set. Monthly/custom rules, complete fault/load testing, cross-version timezone-change drills, actual Windows hardware, encrypted backups/independent deletion replay, OS-enforced WAN denial and full accessibility/performance targets remain outside this evidence. No runtime on a sleeping/off PC or audible notification is claimed.

Reproduce with `npm run check`, `npm run test:e2e` after installing Playwright Chromium, and `npm audit`. The temporary test environment may supply `JARVIS_TEST_CHROME` as described in the first report. The backend's timezone database comes from Node; the tested version is recorded in the final results above.

## Subsequent work

Alpha 3 adds manual encrypted snapshots and deletion replay; see [slice-3 evidence](m1-slice-3.md). The earlier results above remain a historical record.
