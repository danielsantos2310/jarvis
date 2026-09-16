# ADR-0005: Non-biometric presence and bounded voice sessions

- Status: Proposed
- Proposed date: 2026-09-16
- Decision owner: Daniel; affected people control their consent
- Acceptance: Pending
- Requirements: F-03–F-06, P-02, P-05

## Context and options

The desired experience is natural conversation and awareness of nearby people. Options include always-on transcription/cameras, local occupancy plus device hints, or manual-only context. Presence sensors and phone proximity cannot establish authenticated identity or a private audience.

## Proposed decision

Use calibrated non-camera occupancy sensors with optional consented device hints. Store uncertainty explicitly. Begin voice with push-to-talk; offer optional local wake detection and bounded follow-up after deliberate activation. Presence never silently activates capture. No face/voice biometrics or continuous ambient transcription in the baseline.

## Consequences and validation

This delivers wake-word-free follow-up, not a promise of reliable fully ambient initiation. Ambiguity routes personal content to a private authenticated device. Room calibration, language tests, indicator/mute checks and guest scenarios are mandatory: T-03–T-06, T-12, T-25 and T-28. Ambient initiation would require a separate privacy/accuracy research decision.

Sources: [ESPHome LD2410](https://esphome.io/components/sensor/ld2410/), [local voice](https://www.home-assistant.io/voice_control/voice_remote_local_assistant/). Details: [presence](../architecture/presence.md), [voice](../architecture/voice.md).
