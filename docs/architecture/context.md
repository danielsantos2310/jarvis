# Context engine, memory and proactivity

Version 0.1 · Rules are authoritative; a language model may summarize or phrase permitted results.

## Context layers

| Layer | Examples | Trust and lifetime |
| --- | --- | --- |
| Live observations | Occupancy, service health, device state | Source-bound, short TTL, may be unknown |
| Active session | Current request and conversation turns | User/session scoped; transient by default |
| Selected external facts | Upcoming calendar event, task status | Source age, access scope and provider refresh policy |
| Confirmed preferences | Quiet hours, language, units, preferred room | Explicit user confirmation; editable |
| Durable memory | User-approved project fact or reminder preference | Provenance, owner, class, expiry/review date |
| Inferences | Possible interruptibility or relevant suggestion | Labeled inference; never identity or authorization |

Each fact carries fact ID, household/user scope, type, value, source ID, observed/received time, expiry, trust label, confidence, privacy class, consent reference and dependencies. Resolve conflicting facts by current authoritative source and freshness; keep ambiguity instead of inventing a coherent story. A user correction supersedes an inference, but cannot silently rewrite a source integration record.

## Request-time assembly

Authenticate the actor, select only permitted sources, remove expired facts, filter by purpose and audience, and fit a bounded context budget. Retrieval must filter by household/user before ranking and again before output. Limit model context by token budget and sensitivity; do not pass an entire calendar/mailbox because it fits in memory.

Retrieved documents, integration text and summaries are untrusted data. Never load them as policy instructions. Fact provenance remains available after summarization; derived records inherit restrictive classification and deletion dependencies. A model cannot write an item into authoritative long-term memory without a specific user action or narrow grant.

Start with structured tables and text search. Embeddings are deferred until a measured retrieval need exists. If added, create them locally by default, scope indexes by owner, record their source links and delete them when source data is deleted. Vector similarity is relevance, not truth.

## Proactivity decision procedure

1. A deterministic trigger creates a candidate with purpose, subject, deadline, source, priority, channel and deduplication key.
2. Reject if consent is absent, data is stale, the source is untrusted for the claimed purpose, or the proposed disclosure exceeds the audience.
3. Apply quiet hours, manual focus/DND, active call hint if consented, sleep state and known interruptibility. Unknown interruptibility permits silent UI only.
4. Apply cooldowns, topic deduplication, daily/hourly budgets and candidate expiry. Prefer a digest over repeating similar notices.
5. Rank eligible candidates with a simple explainable rule. The model may rewrite selected text within the allowed data and length, but cannot alter priority or delivery permissions.
6. Deliver, defer until the deadline, or drop. Expired low-priority candidates are dropped, not delivered in a burst after a quiet period.
7. Record redacted gate outcomes; expose “why now,” snooze, dismiss and disable controls.

Default proactivity is off. When enabled, proposed defaults are quiet hours 22:00–08:00 in the configured IANA time zone, maximum two unsolicited suggestions/hour and six/day per user across all endpoints, at most one unsolicited spoken suggestion/hour, a 30-minute same-topic cooldown and a 15-minute expiry for low-priority candidates. The owner chooses the timezone; Europe/Dublin is a candidate, not an assumed installation setting.

Explicitly scheduled reminders and user-requested timer alarms have separate delivery rules shown when created. They do not silently bypass quiet hours: the user selects whether that reminder may sound during quiet hours. System security alerts go to a private UI by default. The model cannot mark a suggestion “emergency” to bypass attention gates.

## Worked scenarios

| Situation | Result | Reason |
| --- | --- | --- |
| User enters room during a meeting | No spoken greeting; optional silent public status | Focus/attention gate |
| Calendar event approaching on private PC | Consented reminder with source timestamp | Scope, freshness and private channel satisfied |
| Presence sensor occupied, phone nearby, guest unknown | No personal spoken calendar summary | Identity/audience unproven |
| Three similar task suggestions in an hour | Digest/defer/drop within limits | Global budget and deduplication |
| Internet lost | Local tasks/timers work; external data marked stale | Local authority, honest freshness |
| User says “stop suggesting this” | Stop topic, offer persistent preference through trusted control | No need to infer an unrelated broad preference |

## Evaluation

Run shadow mode before any unsolicited speech: evaluate gates without delivery and collect consented accept/reject judgments. Diagnostic reason logs expire within seven days and do not contain private bodies. Then run five opt-in days with counts of useful, dismissed, mistimed and repeated suggestions, including quiet-hour violation count. Zero quiet-hour/audience violations is mandatory; at least 80% of rated suggestions should be useful or appropriately timed, with at least 20 rated samples before treating that percentage as informative. Failures return to shadow mode.

Never optimize only for interaction volume. Less interruption can be success. See [privacy](../governance/privacy.md), [permissions](../governance/ai-permissions.md) and T-07/T-08/T-15.
