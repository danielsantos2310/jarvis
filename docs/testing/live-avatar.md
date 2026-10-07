# Live avatar — 7 October 2026

The approved cyan portrait and neural background are preserved. LivePortrait adds a small WebGL deformation layer over the still image: subtle breathing, eyelid blinks, head/eye attention and mouth opening. The selected tool's viewport coordinates are supplied through AvatarAttention; pointer, touch, keyboard selection and moving the selected icon all use the same source. Closing a tool returns the gaze to center.

Local speech uses RMS energy from the existing output analyser. Silent samples close the mouth. Device speech and the explicitly silent preview use illustrative mouth movement only while their speaking state is active. This is 2.5D deformation of artwork, not a fully rigged 3D face or phoneme/viseme-aligned lip sync. There is no camera or eye tracking, added microphone capture, API or remote animation service.

Rendering is capped at 30fps, 900 pixels and 1.5 DPR. Reduced motion produces a neutral still frame; hidden tabs cancel animation. GPU resources and event listeners are released on unmount. Missing WebGL or lost context restores the original portrait. The shader uses landmarks measured against the actual 1254×1254 asset.

Validation commands:
- `npm run build:demo`
- `npm run build`
- `JARVIS_TEST_CHROME=/tmp/chromium npx playwright test -c playwright.demo.config.ts tests/avatar-motion.preview.ts tests/browser-voice.preview.ts`
- `JARVIS_TEST_CHROME=/tmp/chromium JARVIS_TEST_WEBGL=1 npx playwright test -c playwright.speech.config.ts`
- Premium strict audit and official DESIGN.md lint.

The motion suite exercises real software WebGL, blink pixels, widget attention, return to center, mouth start/stop, reduced-motion and hidden-tab pixel stability, graphics-context-loss fallback and narrow touch selection. The existing general suite continues exercising the no-GPU fallback. The local pipeline verifies actual PCM drives mouth motion and lock closes audio resources. Browser voice/email tests use synthetic local voice fixtures; they do not read a real Gmail account or require installed Piper/Whisper models.

Desktop, mobile, speaking and blink screenshots are inspected. No claim of physical Windows/touchscreen or Safari hardware validation is made.

Results: both builds passed; the two live WebGL/touch scenarios, three existing browser voice/background/email scenarios and one actual-PCM local speech scenario passed (six total). Strict UI audit has zero findings; design lint has zero errors and four pre-existing orphan-token warnings. Media-query tests wait for the changed preference to be applied before comparing pixels; blink capture samples every animation frame so a 190ms blink cannot fall between slow assertion polls.
