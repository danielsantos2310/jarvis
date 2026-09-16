# Widget architecture

Version 0.1 · Built-in reviewed widgets first.

## Dashboard contract

The dashboard shell owns navigation, layout, session state, global stop/mute, processing-mode indicator, approval surfaces and accessibility. Widgets cannot replace or hide these controls. Essential status remains readable with reduced motion, without audio and on a small display. A futuristic visual style may be layered on after usability gates pass.

| Widget candidate | Data scope | Phase |
| --- | --- | --- |
| Assistant status | Public service/mic/provider status | M1 |
| Local tasks and reminders | Own user records | M1 |
| Clock and timers | Public time, own timer state | M1 |
| Calendar | Selected personal calendar read grant | M3 |
| Room/home state | Approved room/entity state | M3 |
| PC status | Opt-in coarse health/idle state | M3 or later native adapter |
| Weather | Consented location and external fetch | M3 optional; unavailable offline except labeled cache |
| Project view, such as IVI | Explicit chosen data source | Later; no automatic account connection |
| Approval inbox | Trusted core-rendered action preview | M1 policy UI; actions enabled by phase |

A widget manifest declares ID, version, API version, title, supported sizes, data scopes, permitted action types, sensitivity, refresh/subscription budget, settings schema, local/offline behavior and accessibility description. This is a specification of future contracts, not an executable manifest delivered in M0.

## Data and action flow

The core builds an authorized view model for each widget instance. It owns refresh and provider calls; the browser never receives provider tokens. Shared-display endpoints get redacted responses before serialization. Sensitive routes are excluded from service-worker caches and persisted browser storage by default. Clear ephemeral client data on lock/logout and revoke subscriptions immediately.

Mutations use the common action-request gateway. An “on” button and a spoken request have the same target allowlist and policy checks. UI intent does not bypass approval for a high-risk operation. Widget visibility is a layout preference, not an access-control mechanism.

Every data view includes source, last update, stale/error/offline state and scope. Never fabricate live values or silently replace unavailable data with a simulation. Development fixtures are visibly labeled synthetic and confined to development.

## Lifecycle and failure isolation

States are unconfigured, loading, ready, stale, denied, error and disabled. Schema-validate settings; migrate layout/settings with versioned transformations. Set minimum refresh intervals, cap event rates and coalesce redundant updates. A rendering error is caught in that widget's boundary; global controls remain usable.

Disabling a widget cancels its subscriptions. It does not implicitly revoke an integration grant shared with other widgets; offer an explicit integration revoke control with impact preview. Uninstalling an integration revokes its credentials and clears its caches according to privacy policy.

## Trust model

Built-in React widgets are trusted code and share the frontend trust boundary. Manifests and React error boundaries do not sandbox malicious code. Third-party executable widgets are unavailable in the baseline. A future marketplace requires a separate ADR covering code provenance, isolated origin/process, CSP, sanitized structured messages, quotas, denied-by-default network access and revocable capabilities. No arbitrary HTML/JavaScript from retrieved content is rendered as executable UI.

Test keyboard navigation, focus, reduced motion, denied scopes, wrong-owner subscription, shared-display payloads, rendering failure and offline stale states. Relevant requirements: F-09, F-16, P-06 and N-10.
