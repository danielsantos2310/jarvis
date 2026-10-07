# Dotted-light avatar — 7 October 2026

Approved response to the owner's rejection of stretched speaking lips. LivePortrait no longer displaces lip pixels or draws a mouth cavity. It preserves the approved face and adds a fine dotted shade, closed-lip contour lights, and a sparse forehead/upper-head network for actual pending work. No asset was replaced and AmbientBackdrop/FloatingWorkspace are unchanged.

Speech light intensity uses the existing output analyser, or illustrative device-voice/explicit-preview timing. 85ms attack and 220ms release soften transitions. Pending-work lights fade over 250ms, and speaking/listening take precedence. The old `data-mouth` diagnostic is retained as light intensity for tests. No AI, sensor, camera or microphone capability was added.

Verification:
- Production and demo builds passed.
- Two real software-WebGL avatar/touch scenarios and three browser voice/background/email scenarios passed.
- Local speech pipeline passed with new assertions: processing lights rise during a held engine-status request, speech lights remain off, and processing lights fade to zero when the request resolves. Actual PCM continues to drive speech intensity.
- Desktop, touch, speaking and processing screenshots inspected. The mouth remains closed without stretching; neural lights are confined to the upper head.
- Reduced motion, hidden-tab freeze and graphics-context-loss still-image fallback remain covered.

The original still portrait remains the no-WebGL fallback. Device speech light pulses are illustrative, not phoneme-aligned. Physical Windows/touchscreen and Safari hardware testing was not performed.
