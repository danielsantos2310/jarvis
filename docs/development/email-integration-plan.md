# Email integration proposal

Current implementation: an unconnected email widget with clearly fictional summary/full-message examples. Opening it, including via “read my email”, grants no permission and reads no account. The public Pages preview has no email backend.

Proposed next increment:

1. Owner selects a provider in the authenticated local workspace and explicitly connects through its authorization flow. Confirm current provider documentation, supported scopes and callback requirements before implementation.
2. Request read-only access for the first release. Store credentials through an appropriate local OS credential store, never in public assets, browser storage or logs. Display connected account and a revoke/disconnect control.
3. After a reviewed voice command, fetch a bounded message list. Offer summary or full message; require an explicit playback action before reading aloud in a shared room. Preserve the existing pause, lock and permission-revocation boundaries.
4. Treat all email bodies as untrusted content: render text safely and never execute instructions from messages. Summarization must retain source attribution and disclose the selected processing destination before sending private content to any external model.
5. Stop fetch/playback on lock or revocation; clear transient private content. Handle expired access, offline state, empty inbox and provider errors explicitly. Sending, deleting and modifying messages stay outside the read-only grant and require separately designed confirmation.

Acceptance: fixture-based provider tests, revoked/expired credentials, HTML injection and prompt-injection tests, summary/full switching, audio cleanup, and an owner test with the chosen provider. No provider has been connected by this change.
