# Living wave core — 9 October 2026

Reference: owner's supplied hollow cyan/electric-blue waveform ring. Replaced mechanical geometry with 18 overlapping periodic strands, restrained glow and a large transparent aperture. The existing neural background and touch tools were not modified. Removed the old preview-button center tint and placed speech waves beneath the ring.

Canonical owners: CoreDisplay for decorative SVG, energy-loop.ts for bounded geometry, VoiceWaveform for the single measured/illustrative audio envelope, hud.css for palette and breathing. No new graphics library, image asset, external network request, microphone permission or service capability.

Verification:
- Both production builds and TypeScript passed.
- 58 Node tests passed, including two new geometry tests for closure, aperture bounds, changing time and audio response.
- Living-core browser tests passed: SVG-only operation, changing contours, transparent center, state colors, selected-widget feedback, reduced-motion still geometry, hidden-tab freeze and mobile touch.
- Local voice pipeline passed with synthetic PCM, pending-work/listening states and resource release on lock.
- Full preview suite covers consent, service failures, voice cancellation, drag/hide/restore and sample data.
- Desktop 1440×1000 and mobile 390×844 screenshots inspected for idle/speaking and spacing.
- Strict premium audit: zero findings. DESIGN.md lint: zero errors, four existing token-reference warnings.
- Publication source/build scan passed. No security boundary changed.

An initial reduced-motion test sampled before the browser dispatched the media-change event. It now waits for the exact neutral geometry before checking that geometry remains stationary; application motion behavior was already correct.

Not claimed: iOS-device or home-touchscreen hardware validation, voice identity recognition, a connected AI mind, or measured browser-device TTS audio. Device speech and silent preview remain illustrative.
