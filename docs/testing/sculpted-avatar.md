# Reference-matched holographic avatar — 7 October 2026

The owner rejected the coarse vector mask and supplied image(10).png as the exact visual reference. Background, floating icons, permissions and service behavior are unchanged.

CoreDisplay now uses a detailed transparent cyan holographic portrait with independently animated SVG rings, ticks, red arc accents, processing sweep and existing voice waveform. State captions remain visually hidden. Asset geometry is reserved before loading. Existing hidden-tab and reduced-motion rules apply to the new layers.

Asset: `src/web/assets/neural-avatar.webp` (319,896 bytes). Created with built-in image generation using the supplied reference, then encoded as WebP without resizing. Prompt: isolate the central front-facing cyan holographic head, ears, neck and shoulders; retain sculpted anatomy, fine triangular mesh, luminous vertices, eyes and forehead node; transparent background, no rings, dashboard, text or state names. The generated original is retained in the session output.

The portrait is rendered artwork with live surrounding effects; it is not a rigged 3D face or lip-synced animation. Browser speech waves remain illustrative; the local audio path uses its analyser.

Verification:
- `npm run build:demo` — passed.
- `npm run build` — passed.
- `JARVIS_TEST_CHROME=/tmp/jarvis-chromium npx playwright test -c playwright.demo.config.ts tests/browser-voice.preview.ts` — 3 passed: device voice lifecycle, animated/reduced-motion background and mobile tools, email read-aloud lifecycle.
- Desktop 1440×1000 and mobile 390×844 screenshots inspected against the supplied reference.
- Strict premium audit — zero findings (`sculpted-avatar-audit.json`).

The device-voice test now waits for the portrait to decode before recording speech traffic, so the same-origin decorative image load is not misclassified as an outbound voice request. The no-network assertion during speech remains unchanged.

- Local speech pipeline browser test — 1 passed (capture, processing state, PCM waveform, lock cancellation).
- Design document lint — zero errors, four existing orphan-token warnings.
