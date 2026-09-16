# AI permission model

Version 0.1 · Proposed policy contract. Relevant requirements: S-01–S-05, F-11, F-14, P-04.

## Authority

The model has no independent authority. A model-generated plan is untrusted input to the core. The core derives actor identity from an authenticated session or an owner-approved routine principal, never from model text, event payload claims, a BLE address or voice recognition.

Authorization is deterministic and deny-by-default. User interfaces, scheduler jobs and AI requests share the same action gateway. A dedicated executor holds integration credentials and checks a short-lived, authenticated core request with the action digest and resource constraints. Native code modules within the core are trusted code; separate worker processes are used where isolation is required.

## Capability levels

| Level | Allowed capability examples | Required authority | Initial availability |
| --- | --- | --- | --- |
| P0 | Help, local public time, redacted health | Authenticated client or paired endpoint with public-view grant | M1 |
| P1 | Read own tasks, scoped calendar, private memory | User authentication, explicit data-source grant, private output channel | Own tasks M1; integrations M3 |
| P2 | Create local reminder, save explicitly confirmed preference, set one approved light | Explicit user request under bounded grant, or preapproved deterministic routine | Reminders M1; device writes M5 |
| P3 | Send message, change remote calendar, bulk deletion/export | Exact preview plus fresh user authentication and one-use approval | Disabled in initial implementation; new ADR required |
| P4 | Arbitrary shell, edit policy/security settings through AI, unlock doors, disable alarms, cooking/medical actuation | No AI grant exists | Excluded |

Memory deletion initiated in the authenticated privacy UI is permitted as a direct user operation. AI-proposed bulk deletion requires P3 review. An ordinary P2 device action is bounded by entity, permitted state, duration and rate. Lighting does not imply permission over every Home Assistant service.

Owner role manages installations, household settings and policies; it does not silently grant access to another member's private content. Members control their own grants. Guests receive public functions only. Services have named workload identities, not owner-wide session tokens.

## Grant contract

Each grant records grant ID, household, subject, capability, exact resource selector, operation, allowed parameters, time window, daily/rate ceiling, audience constraint, issuer, creation, expiry, revocation and version. Wildcard resource grants are disallowed for actuator writes. Read/write scopes are separate. Permission changes require the trusted settings UI and fresh authentication; conversation cannot change policy.

A model's claimed confidence, a durable memory or an external document cannot issue, extend or reinterpret a grant. Grants do not transfer across users, integrations or providers. Consent for cloud inference is separate from permission to read the underlying information.

## Execution protocol

1. Authenticate actor and origin; resolve user, household and session server-side.
2. Normalize the proposed action against a versioned schema. Reject arbitrary commands, URLs, paths and unrecognized fields.
3. Resolve target through a server-side registry, classify risk using fixed policy, and load current grants/consents.
4. Check resource state/version, channel privacy, expiry, quotas and global stop. Fail closed if policy or audit storage is unavailable.
5. If confirmation is required, present exact action, recipient/target, content, provider disclosure, cost ceiling and reversibility in trusted UI.
6. Store approval bound to actor, session, canonical payload digest, target version, policy version, expiry and random single-use nonce. Proposed approval lifetime: 60 seconds; regenerate if expired.
7. Immediately before execution, recheck authority and preconditions. Atomically consume approval and record the execution intent with idempotency key before dispatch.
8. Executor performs one bounded operation, captures acknowledgment and reconciles result. Record succeeded, failed, canceled or outcome-unknown honestly.

Fresh authentication means an explicit trusted reauthentication within five minutes for sensitive operations; final authenticator choice is an M1 blocker. A spoken “yes” may confirm low-risk conversational parameters in an already authenticated private session; it never authorizes P3. On shared room endpoints, private read or sensitive approval is handed to an authenticated personal screen.

## Retries, cancellation and races

Action states: proposed → denied, awaiting-approval or authorized; awaiting-approval → authorized, expired or canceled; authorized → executing or canceled; executing → succeeded, failed or outcome-unknown. Unknown outcomes enter reconciliation and are not silently retried.

Use provider idempotency where supported. When unavailable, prefer desired-state operations such as “set light on” over “toggle.” If an acknowledgment is lost, read back state or ask the user before any potentially duplicate external effect. MQTT QoS does not make a physical operation exactly-once.

Revocation and global stop invalidate pending requests, cancel cancellable work and reject new dispatches. An already sent external message cannot be unsent by stopping the model. The UI must explain that limit and offer a compensating operation only if supported and separately authorized.

## Cloud and disclosure budget

A cloud request is a permissioned disclosure with provider, purpose, fields, data classes, retention notice reference and maximum request/cost budget. Defaults: cloud disabled and monetary budget zero. Enabling it requires user-selected limits. Fixed limits on model steps, tool calls and wall-clock time prevent runaway loops; initial interactive limits are five model/tool cycles and 30 seconds before returning control, excluding a user actively reviewing an approval.

Credentials, raw ambient audio, biometric data and another user's private content are never included. External search, weather and calendar synchronization also count as network use even when an LLM is local. Strict-local mode blocks them.

OWASP recommends narrow tool permissions and independent validation of high-impact operations; JARVIS turns these into the concrete policy contract above. [OWASP AI Agent Security](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html). The detailed levels and timing limits are project choices.
