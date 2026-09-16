# System architecture

Version 0.1 · Proposed baseline · [ADR-0001](../adr/0001-local-authority.md), [ADR-0002](../adr/0002-modular-core.md).

## Runtime shape

A single local core is authoritative for one household. It owns identity, grants, schedules, context and persistence. Multiple dashboards and room endpoints connect to it; no endpoint has an independent writable copy of household permissions. Begin with a modular monolith rather than distributed business microservices. Extract a service only for measured scaling, lifecycle, hardware or security needs.

| Component | Responsibility | Must not do |
| --- | --- | --- |
| Dashboard/UI gateway | Authenticated views, subscriptions, approvals, settings | Hold provider tokens or execute native commands |
| Core API | Authentication, validation, resource ownership, rate limits | Trust client-supplied identity fields |
| Context module | Scoped current facts, relevance and expiry | Convert inference into verified identity |
| Scheduler/proactivity | Durable reminders, candidate ranking and attention gates | Override consent, quiet hours or action policy |
| Model adapter | Translate bounded inference requests/results | Call tools directly or read arbitrary files |
| Policy module | Deterministic authorization and disclosure decisions | Ask the model to decide its own privilege |
| Executor process | Perform allowlisted integration operations | Expose generic shell/URL/service-call capabilities |
| Data access module | Transactions, owner filtering, lifecycle | Allow widgets/workers to query storage directly |
| Ingestion adapter | Normalize source events and provenance | Treat an unsigned source claim as trusted state |
| Audit module | Redacted decisions and execution outcomes | Store prompts/audio by default |

The policy module is in the trusted core initially. The executor independently validates the authenticated action envelope and its own static resource restrictions. In-process interfaces improve maintainability; they do not isolate a malicious package. AI workers and credential-bearing executors therefore cross process boundaries from their first implementation.

## Request and event contracts

REST/JSON handles queries and commands; WebSocket handles authorized live subscriptions and state updates. Contracts have a schema version, size limit, validation rules and explicit errors. Use JSON Schema for shared payload definitions and OpenAPI for HTTP. Logical routes include sessions, widgets, context, action requests, approvals, grants and privacy exports; concrete API files are deferred to M1.

Every event envelope contains event ID, schema version, type, household ID, source ID, observed-at, received-at, expiry, source sequence where available, correlation/causation IDs and privacy class. Room and subject are nullable. Confidence is advisory evidence, not permission. The ingestion adapter derives source identity from the authenticated transport and rejects claimed household/room values outside the device's registered scope.

Keep event payloads bounded and semantic. Example event types are presence.observed, presence.changed, context.updated, notification.candidate, action.requested and action.completed. An observation cannot impersonate an approval or grant change. Sensitive personal events never enter general device topics.

State snapshots carry a monotonic version and source-health status. Subscribers reconnect using a cursor where supported; if the cursor is too old, request an authorized snapshot. Reauthorize subscriptions on policy changes, logout and device revocation. Never trust a stale client cache for an action decision.

## Reliability and message semantics

Use an in-process event bus initially, plus transactional records for durable schedules and action intents. Add MQTT at the device boundary, not as the business database. Assume duplicate/out-of-order deliveries. Deduplicate by event ID and source sequence within a bounded window; discard expired messages and quarantine large clock skew.

MQTT telemetry may use QoS 1 with application deduplication. Only non-sensitive last-known state/availability may be retained, with expiry and source timestamps. Action commands and approvals are never retained. Use Last Will availability and reconnect snapshots. MQTT's delivery guarantees are transport-level, not a guarantee of one physical side effect. [MQTT 5.0 specification](https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html).

Durable schedule claiming and action intent creation use database transactions. Non-idempotent external actions use execution receipts and reconciliation after a crash; uncertain outcome is visible to the user. Limit concurrent requests, queue depth, retries and model tokens. Backpressure can drop superseded sensor observations but never silently drop a required permission check.

## Dependency ownership

Home Assistant owns device integration and ordinary home automation. JARVIS owns conversation, permission policy and user context. JARVIS reads HA through a dedicated adapter and writes through its executor. Avoid duplicate sensor ingestion paths; choose HA→JARVIS or direct device→broker for each device, with a recorded source-of-truth mapping.

Cloud services are optional adapters behind an egress gateway. Loss of an external source makes related widgets stale; it does not make local authentication, tasks or permissions unavailable. A hub outage makes satellites unavailable for assistant functions; independent physical controls continue. Never allow satellites to improvise elevated actions offline.

## Evolution boundaries

M1 has one PC and no broker requirement. M2 adds speech/model workers. M3 adds normalized device ingestion and scoped external reads. M5 enables a constrained device executor. M6 relocates the same authority to a hub with paired endpoints. PostgreSQL or additional workers can replace adapters after a migration ADR; public API and policy semantics must remain stable.
