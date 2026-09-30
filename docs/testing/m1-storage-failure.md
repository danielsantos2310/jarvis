# M1 storage-failure checkpoint — 2026-09-30

Scope: bounded T-35 transaction-failure evidence, not full physical disk/power-loss acceptance.

Result: `npm run check` passed on Linux / Node 24: TypeScript, production build and **49/49 tests**, with the test suite taking 34.2 seconds. The automatic-rollback regression failed before the fix and passed afterward.

## Method

The tests create disposable SQLite databases and constrain their page count. An audit trigger attempts a 1 MiB allocation after the application has made its transactional writes, producing real SQLite `SQLITE_FULL` (error 13). No host drive is filled and no household data is opened.

Separate attempts cover task creation, deleting an existing timer, and delivery of that timer. Each checks that item, notice, receipt, audit and tombstone counts remain unchanged, no transaction is left open, and `integrity_check` reports `ok`. After removing the artificial restriction, the timer delivers once across two scheduler ticks and survives reopening the database.

An authenticated HTTP test verifies a generic 503 `SERVICE_UNAVAILABLE` response without internal storage details. Retrying the same request ID after recovery succeeds once; replay returns the stored result instead of creating another task.

## Reproduced bug and fix

A separate `RAISE(ROLLBACK, ...)` trigger exercises SQLite's automatic-rollback path. Before the fix, the wrapper tried a second rollback and replaced the original failure with `cannot rollback - no transaction is active`. The wrapper now checks `DatabaseSync.isTransaction` before issuing rollback. The test verifies the original error, no partial item, and a successful later write.

The page-limit tests and automatic-rollback test are distinct: this SQLite build retained an active transaction in the tested `SQLITE_FULL` path. No claim is made that the page-limit fixture itself reproduced an automatic rollback.

## Remaining gates

Physical Windows disk-full behavior, free-space admission policy, WAL growth, filesystem I/O faults, power interruption, off-disk recovery, resource/latency budgets and independent review remain open. These tests do not establish that every storage failure is recoverable, or that hardware cannot corrupt data.

Reference: [SQLite transaction error behavior](https://www.sqlite.org/lang_transaction.html#response_to_errors_within_a_transaction).

Run `npm run check` to build and execute the core suite, including `tests/storage-failure.test.ts`.
