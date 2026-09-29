# M1 UI reliability checkpoint — 2026-09-29

Scope: T-02/T-16 delayed or failed sign-out, stale response ordering, and a bounded T-33 keyboard check. This is not complete M1 acceptance.

## Fixes

Lock now removes private dashboard state immediately, while the existing authenticated logout request runs. The entry screen reports that server confirmation is pending and prevents a new login until that request finishes. If the request fails, the screen remains hidden and explicitly warns that server sign-out was not confirmed. This does not claim that a failed request invalidated the cookie or server session; close the browser while the server is unavailable.

Snapshots carry a client request sequence so an older polling response cannot overwrite a newer action refresh. Authentication errors from an earlier UI session cannot reset the current session. Actions completed after locking cannot report success or change the new session's busy state.

## Verification

- TypeScript and local/preview production builds passed on Linux / Node 24.
- Authenticated browser workflow passed, including a held polling response delivered after a newer task creation, delayed logout with immediate private-content removal, late snapshot after locking, successful re-login after confirmed logout, and aborted logout with explicit warning.
- Controls open with focus on Close; Tab reaches Pause; Escape closes the modal and returns focus to the invoking Controls button; Enter reopens it. The native modal may allow focus into browser chrome at its boundary, so no custom focus trap was added.
- Existing enrollment, recurrence/DST preview, permissions, responsive layout, inert text, timer delivery and storage/network checks remain in the browser workflow.
- Static preview browser regression passed (4.4 seconds). The deployed sample preview remains the previously verified build; these local-authentication fixes are proposed in a separate PR.
- Core implementation and database schema are unchanged; the previous 46-test core result remains historical evidence, not a new run for this UI change.

## Remaining evidence

Actual Windows/off-disk recovery, host network denial, disk-full/power-loss behavior, complete accessibility review (including assistive technology), 100-sample update latency and 10-minute resource measurements remain open. Browser route interception is controlled failure injection, not proof of physical PC/network failure handling. Independent security review and owner acceptance remain required before a personal pilot.
