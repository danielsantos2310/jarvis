# Device voice, atmosphere and Gmail verification

Verified 2026-10-06.

- Local and public production builds pass TypeScript and Vite.
- Eight public-preview browser scenarios pass, including local-only voice selection, explicit playback, cancellation on close/tab hide/pause, the playback time limit, animated background pause/reduced-motion and narrow touch layout.
- Local workspace, microphone lifecycle and Piper PCM waveform browser scenarios pass (three additional scenarios).
- Three Gmail provider tests pass, including the authenticated account profile fixture.
- Desktop and 390px-wide screenshots inspected; atmosphere remains behind controls.

Browser speech tests use synthetic browser voice fixtures. They do not establish that a particular Windows installation exposes voices or that physical speakers work. Gmail tests use provider fixtures; no real account was authorized or read here. Local environment credentials were absent. Public Pages cannot connect Gmail; use the local app after Google configuration and consent. Device voice waves illustrate speaking state; Piper waves use actual PCM. Physical sensor and owner-PC acceptance remain outstanding.
