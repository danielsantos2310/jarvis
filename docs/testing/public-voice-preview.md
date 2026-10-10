# Public voice/clap preview verification — 10 October 2026

Scope: explicit browser microphone level/clap tests, bounded opt-in browser recognition, scripted replies and the existing device-speech owner. No account actions, model integration or always-on listening.

## Evidence

- `npm test`: 61 passed, zero failed.
- `npm run build:demo` and `npm run build`: TypeScript and Vite passed.
- `JARVIS_TEST_CHROME=/tmp/chromium npx playwright test -c playwright.demo.config.ts`: 13 passed, including microphone permission/cleanup, voice selection/playback, clap greeting, recognition consent/denial/timeout, stale callbacks, typed fallback, core motion and touch tools.
- Strict Premium audit: zero findings (`public-voice-preview-audit.json`). The canonical Form already disables browser validation; an explicit noValidate prop documents its owner for the static audit.
- `designmd lint DESIGN.md`: zero errors, four existing document-token reference warnings; runtime token mapping remains documented in DESIGN.md.
- `git diff --check`: passed.
- Final rebuilt bundle: both conversation browser tests passed again. `JARVIS_TEST_CHROME=/tmp/chromium npx playwright test -c playwright.speech.config.ts`: one local capture/transcription/PCM-playback regression passed.
- `npm run security:review`: passed across 174 source paths and both final builds, with no recognized secret patterns or unexpected public artifacts. This is a heuristic review, not a security certification.
- Desktop 1440×900 and narrow 390×900 screenshots inspected: readable consent, question and reply controls, internal panel scrolling and no horizontal document overflow. Existing panel styling and core/background are unchanged.

The first timeout test installed a fake clock after scheduling a real timer. Installing it before starting recognition corrected the test. One existing touch double-tap assertion failed during the first run and passed in the complete rerun without application changes.

Recognition and device voices use controlled browser fixtures for automation; the clap input is synthetic Web Audio. These checks do not establish real microphone sensitivity, provider availability, speech quality or autoplay behavior on Daniel's hardware. Test Windows and iPhone directly over HTTPS. A sharp noise can false-trigger the simple clap detector. A clap requests a greeting only; it never starts provider recognition automatically.

The local-only meter does not upload audio. Optional browser recognition may send audio to its provider after separate consent; mocked zero-network assertions are not claims about a real provider's traffic. No dependency, credential, backend endpoint or CSP allowlist was added.
