# Microphone lab and proposed activation flow

Date: 2026-09-30. This is early voice preparation explicitly requested by the owner, not completed M2 or M1 acceptance.

## Implemented: local input test

Run the local app, unlock it, and choose **Start microphone test** in **Microphone lab**. Allow the browser permission if you want to test your default microphone. The level meter processes audio only in browser memory. It does not record, upload, transcribe, recognize a speaker or speak a response. No cloud API is used. The public sample preview does not include this feature.

Use Stop to release capture. The test ends after 30 seconds and also stops on hidden tab, page exit or panel unmount (including Lock, pause, permission revocation and loss of core connectivity once detected). Cancel also handles permission requests that resolve late: late streams are stopped. An offline core may take up to the existing polling/request timeout to be detected; the local Stop button is immediate.

The local server now permits same-origin microphone requests (`microphone=(self)`); camera and geolocation remain denied. This browser policy allows a request, not automatic permission. No microphone access occurs on page load, authentication or presence changes. The rest of the app's network and authentication boundaries are unchanged.

Validation: the production build, 49 core tests, existing authenticated browser workflow and dedicated microphone browser test passed. The microphone test substitutes a synthetic Web Audio stream and verifies no automatic capture, denial, late permission cancellation, timed stop and lock cleanup. It is not a real Windows microphone or clap-recognition test. Run it with `npx playwright test -c playwright.voice.config.ts` after building and installing Playwright Chromium (or setting `JARVIS_TEST_CHROME`).

## Proposed sensor and clap behavior — not implemented

For the previously discussed LD2410C + ESP32 design: the LD2410C detects movement/micro-movement using 24 GHz radar. ESP32 Wi-Fi transports sensor readings. This is distinct from sensing with Wi-Fi channel measurements. The sensor can report presence while someone sits relatively still, but placement, sensitivity and environment need calibration. It does not establish identity.

Presence should make the assistant available, not grant private access or automatically record everyone nearby. After explicit per-session arming, a deliberate trigger could open a bounded listening window. A proposed double-clap detector would process sound continuously while armed, can false-trigger on other sounds, and cannot identify the user. Muted mode must release microphone capture and disable clap detection. Real sensor messages need device authentication, stale-event expiry and disconnect-to-unknown behavior before integration.

Identity remains the authenticated user session. Voice identification, if added later with consent and deletion controls, must not serve alone as security authorization. A generic greeting can precede authentication; personal reminders must not be spoken to an unknown occupant. Presence cannot prove that someone has woken up.

Next voice work: select and benchmark local speech-to-text/text-to-speech engines, then connect transcripts through the existing permission-checked action gateway. No current capability is labelled Processing/Speaking until those engines exist.

References: [Hi-Link LD2410B/C presence and micro-movement](https://www.hlktech.net/index.php?cateid=8&id=65), [MDN microphone capture](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), [MDN audio analyser](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/createAnalyser).
