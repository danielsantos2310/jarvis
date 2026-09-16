# ADR-0003: SQLite first with an explicit migration trigger

- Status: Proposed
- Proposed date: 2026-09-16
- Decision owner: Daniel; implementer supplies benchmark
- Acceptance: Pending
- Requirements: F-01, P-03, N-08, N-09

## Context and options

The first deployment has one authority and modest local state. Alternatives are SQLite, local PostgreSQL or hosted Supabase. Earlier PostgreSQL/Supabase suggestions are not accepted constraints. A hosted authority conflicts with the intended offline baseline; local PostgreSQL adds administration before a measured need.

## Proposed decision

Use SQLite on local disk behind a repository interface and versioned migrations. One core process owns writes. Clients use the API, never a shared database file. Use consistent snapshots and tested restore. Keep canonical data export and stable IDs for a future PostgreSQL migration.

## Consequences and validation

SQLite serializes writers, so short transactions and queue monitoring matter. Revisit when a representative workload repeatedly misses latency targets due to measured write contention, or a justified design needs multiple independent writers. More rooms alone is not a migration trigger. T-13, T-26, T-30–T-32 and T-35–T-36 validate lifecycle and performance.

Sources: [SQLite appropriate uses](https://www.sqlite.org/whentouse.html), [backup API](https://www.sqlite.org/backup.html). Detail: [data model](../architecture/data-model.md).
