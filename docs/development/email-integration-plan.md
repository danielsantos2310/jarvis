# Email integration proposal

Updated implementation: the local build now has session-only read-only Gmail OAuth and bounded inbox/plain-text reading. See [service-connections.md](service-connections.md) for setup and security boundaries. The public Pages preview remains a fictional example with no email backend. Opening Email or issuing “read my email” opens the widget, but does not grant permission or automatically fetch an inbox. AI summaries and voice readout of emails are still future work.

Proposed next increment:

1. Owner selects a provider in the authenticated local workspace and explicitly connects through its authorization flow. Confirm current provider documentation, supported scopes and callback requirements before implementation.
2. Request read-only access for the first release. Store credentials through an appropriate local OS credential store, never in public assets, browser storage or logs. Display connected account and a revoke/disconnect control.
3. After a reviewed voice command, fetch a bounded message list. Offer summary or full message; require an explicit playback action before reading aloud in a shared room. Preserve the existing pause, lock and permission-revocation boundaries.
4. Treat all email bodies as untrusted content: render text safely and never execute instructions from messages. Summarization must retain source attribution and disclose the selected processing destination before sending private content to any external model.
5. Stop fetch/playback on lock or revocation; clear transient private content. Handle expired access, offline state, empty inbox and provider errors explicitly. Sending, deleting and modifying messages stay outside the read-only grant and require separately designed confirmation.

Acceptance: fixture-based provider tests, revoked/expired credentials, HTML injection and prompt-injection tests, summary/full switching, audio cleanup, and an owner test with the chosen provider. No provider has been connected by this change.
