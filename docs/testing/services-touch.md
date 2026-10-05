# Touch and opt-in services verification — 2026-10-05

Scope: double-click/double-tap dismissal replaces the old drop target; touch dragging remains; 50% idle icons and panel backgrounds. YouTube link embeds and approximate-location Open-Meteo weather are opt-in on both builds. Gmail OAuth and bounded read-only messages exist only on the local authenticated backend.

Checks:

- Both builds run TypeScript validation.
- `npm test`: 56 tests passed, including three new Gmail tests covering PKCE and one-use session-bound state, scope denial, expiry, response size limits, auth/CSRF, plain text, pause cancellation, logout and non-disclosure of tokens.
- Public browser coverage: mouse drag and double-click, keyboard movement/deletion/restoration, touch drag and double-tap, 320/390/768/1024px layouts, 50% idle opacity, no drop target, speech animation and existing microphone cleanup.
- Provider fixtures: no weather/YouTube requests before explicit action, rounded coordinates, weather provider errors/retry, location denial, late location after closing, invalid YouTube hosts, normalized embed URLs, closing unloads the iframe.
- Local browser coverage: missing Google setup is explicit; fixture inbox and full text render safely without interpreting email instructions or HTML; closing removes private content. Existing local task/scheduling/auth tests and synthetic speech/microphone suites retained.
- All nine browser scenarios passed (six public, local workspace, speech and microphone); touch dismissal additionally checked at 1920×1080. Premium strict audit has zero findings. DESIGN.md lint has zero errors and four existing orphan-token warnings for runtime CSS roles. `git diff --check` passes.

Not verified: real Google consent/client configuration, actual account messages, a real YouTube video playing through provider policy, real device geolocation, or the owner's physical touchscreen/iPhone Safari. Provider-facing browser tests use intercepted fixtures and do not authorize accounts, send location or load a real video. The local speech test uses synthetic PCM, not the movie voice. OpenAI/model and custom-voice integrations are recommendations, not implemented here.

External data boundary changed deliberately: static preview CSP now permits only Open-Meteo fetch and YouTube privacy-enhanced frames. Its idle workspace remains network-silent after static assets. Gmail access tokens are server-memory-only; restarting, locking, pausing or revoking removes them. Google grant removal is attempted only by Disconnect, with an explicit fallback on failure.
