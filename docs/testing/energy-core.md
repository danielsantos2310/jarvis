# Energy core — 7 October 2026

The owner selected an energy core after rejecting the human avatar. CoreDisplay now renders a pure SVG instrument chamber with a luminous center, three containment arcs, sparse particles and layered rings. The portrait renderer and obsolete avatar tests were removed; the old image is no longer bundled. Background and widget interactions remain unchanged.

VoiceWaveform supplies one shared audio envelope to the core and existing waveform. Local audio and microphone input are measured; device speech and explicit silent preview remain illustrative. Actual processing state accelerates selected rings, listening introduces ripples, and speaking pulses the center. An outer selection arc replaces facial gaze. There are no visible state labels.

Validation:
- `npm run build:demo` and `npm run build`: passed.
- `JARVIS_TEST_CHROME=/tmp/chromium npx playwright test -c playwright.demo.config.ts tests/energy-core.preview.ts tests/browser-voice.preview.ts`: five passed.
- `JARVIS_TEST_CHROME=/tmp/chromium npx playwright test -c playwright.speech.config.ts`: one passed; held processing request changes rotor speed, normal speed returns, and actual PCM drives the core envelope.
- Desktop 1440×1000, mobile 390×844, and speaking screenshots inspected. Core remains centered with usable perimeter widgets.
- Browser tests explicitly disable WebGL. Reduced motion, hidden-tab pause, touch selection, device/email speech lifecycle and no network speech traffic are covered.

No hardware Windows touchscreen or Safari testing is claimed. No voice/model/service integration was changed.
