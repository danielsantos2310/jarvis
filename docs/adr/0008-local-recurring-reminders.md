# ADR-0008: Calendar recurrence with explicit time resolution

- Status: Implemented for evaluation; owner acceptance pending
- Date: 2026-09-29
- Scope: M1-03; F-13 / T-13; extends ADR-0007

## Decision

Store one declarative schedule on a reminder: frequency (once/daily/weekly), starting local date/time, IANA timezone, missing-time policy, repeated-time policy and missed-delivery policy. Also persist the next UTC deadline and intended occurrence index. Timers and existing relative one-shot commands retain their original instant-based behavior.

Use `@js-temporal/polyfill` 0.5.1 in the core. Fixed 24-hour arithmetic fails the local-time requirement across clock changes. Hand-maintained transition tables add an unnecessary correctness/maintenance burden. Runtime Temporal support is not assumed from a Node version string; the pinned polyfill defines the API, using Node's installed IANA data.

Resolve gaps to the first valid instant after the transition by default; the user can instead skip. Resolve repeated times to the earlier instant by default; the user can select the later one. Show these resolutions and UTC offsets in a server-produced preview. Changes invalidate the UI preview, and scheduled creates must carry a matching expected first deadline. This is a P2 intent check, not a P3 approval or additional authority grant.

After downtime, jump by calendar date near now. Default to one inbox entry for the latest due occurrence; provide skip-after-60-seconds as an alternate. The existing one-entry-per-item storage cap is retained. Assign a fresh notice ID on each new occurrence to prevent a late dismiss request deleting newer data. Completing a recurring item ends the series; dismissing its notice does not.

Persist notification replacement, cursor advancement and redacted audit atomically. Pause/revocation prevent advancement. A schema-1-to-2 forward migration retains all existing entities. A newer schema fails closed; downgrade requires an operator's stopped-instance development snapshot, with personal restore still gated separately.

## Consequences

The polyfill adds one runtime dependency plus its locked transitive dependency, but no browser bundle or network request. Timezone changes shipped with a later Node runtime can affect future occurrences; the next already-persisted instant is honored. UI/API describe one-minute missed grace and consolidation rather than promising every missed alert. No audio/OS delivery, monthly rules or editing exceptions are introduced.

Tests cover Dublin gaps/overlaps, Lord Howe half-hour changes, Samoa's skipped date, fractional offsets, leap day, long downtime, restart persistence, stale dismiss, revocation, pause, clock rollback, injected storage failure, preview mismatch and migration. This is implementation evidence for the bounded recurrence behavior, not full M1 acceptance.

See [user/developer guide and primary sources](../development/recurring-reminders.md) and [test evidence](../testing/m1-slice-2.md).
