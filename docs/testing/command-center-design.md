# Command center design — 2026-10-05

The owner's requested Iron Man inspired dashboard is implemented with original SVG rings, cyan instrument details and everyday language. A larger core anchors the desktop command panel; mobile gains persistent, labelled section navigation. The preview notice is collapsible, the microphone shortcut only navigates, and primary controls have larger hit areas.

Shared Form now owns inline constraint feedback, first-invalid-field focus and ARIA association. PasswordInput adds explicit reveal/hide. Controls resets its form when closed and ignores delayed close events after reopening, fixing a keyboard timing failure exposed by testing. Authentication, domain schemas, consent, persistence, voice transport and permission policies are unchanged.

## Executed verification

- `npm run build` and `npm run build:demo`: passed, including TypeScript checks.
- `JARVIS_TEST_CHROME=/tmp/jarvis-chromium npx playwright test`: 1 passed; enrollment, invalid fields/reveal, task CRUD, recurrence/DST, stale responses, keyboard dialog, pause/grant, responsive layout, immediate locking and failed sign-out.
- Same browser with `-c playwright.demo.config.ts`: 3 passed; sample commands/tasks/timers, no backend or storage, microphone denial/timeout/stop, inline validation, labelled navigation, explicit microphone shortcut, 44px send target and 320/390/768/1024px overflow checks.
- Same browser with `-c playwright.speech.config.ts`: 1 passed; synthetic capture, reviewed transcription, PCM waveform playback and cleanup on lock.
- Same browser with `-c playwright.voice.config.ts`: 1 passed; explicit microphone click, denial/cancel, timeout and lock cleanup.
- Premium strict audit: zero findings; saved alongside this report.
- `npx -y -p @google/design.md designmd lint DESIGN.md`: zero errors; four orphan-token warnings for documented runtime CSS roles not referenced by frontmatter components. These roles are mapped and consumed in hud.css.
- `git diff --check`: passed.
- Inspected desktop, mobile and entry screenshots. CSS includes reduced-motion and forced-colors fallbacks; computed global scrollbar color checked in browser.

The existing full workflow test was updated for the intentional heading change. Subsequent failures exposed the Controls close-event race and a password accessible-name mismatch; both were fixed and the complete browser sequence rerun successfully.

## Limits

Chromium on Linux, with synthetic audio. This is not physical Windows/iPhone/VoiceOver acceptance, a complete WCAG audit or real microphone/speaker recognition evidence. No backend code changed; the core unit suite was not rerun for this design-only source scope. Full milestone 1 acceptance remains open. The public site is still a sample interface and browser microphone meter, not a hosted local assistant or connected hardware.

## Canonical design decisions

See root DESIGN.md and premium-ui.json. Native date/select popup ownership is deliberate. Existing CRUD and API contracts take precedence. Styling remains in the established hud.css theme with structural CSS underneath, rather than a new theme layer. No external assets, telemetry, automatic microphone activation or copied logos were introduced.
