# Test a Windows/device voice now

No API key or paid speech service is required for this test. It uses the browser's SpeechSynthesis interface and lists only voices whose `localService` flag is true. It does not install a voice or guarantee that every Windows/Narrator voice is exposed to the browser.

1. Open the public preview or your local JARVIS without the Piper `--voice` option.
2. Open the microphone icon. Under **Test a device voice**, select a voice and speed.
3. Select **Test device voice** for a greeting. **Read latest reply on device** reads your most recent command reply (up to 500 characters).
4. Use **Stop device voice** to cancel. Closing the panel, hiding the tab, pausing or locking also cancels. A start watchdog and a 45-second playback cap handle stuck engines.

If no voices appear: install a text-to-speech language/voice in Windows Settings → Time & language → Speech (labels vary by Windows version), restart Edge/Chrome, and select **Refresh device voices**. The UI links to Microsoft's installation guidance. Voices may arrive asynchronously; the list updates when the browser announces them. This test does not fall back to cloud voices.

This is speech output only. It does not transcribe you, recognize your identity, add an AI mind or use the official movie voice. Device speech provides lifecycle events but no PCM samples to our visualizer; its moving waves are labelled illustrative. Configured local Piper retains actual audio-reactive waves.

## Gmail after your Google setup

The connection code is already implemented locally. After configuring the server environment and restarting, unlock JARVIS → Email → **Check Gmail setup** → **Connect Gmail — read-only**. Complete Google consent, then select **Verify connected Gmail account** to confirm the authorized address. **Load latest 10 emails** is a separate explicit action. Public GitHub Pages remains a fictional email example and cannot verify your local credentials.

## Sources

- [Browser voice list](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/getVoices)
- [Local vs remote voice flag](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService)
- [Microsoft voice installation guidance](https://support.microsoft.com/en-gb/education/learning-accelerators/download-languages-and-voices-for-immersive-reader-read-mode-and-read-aloud)
- [Gmail service configuration](service-connections.md)

## Read Gmail aloud

In the local app, open Email, connect/verify Gmail, load the latest messages and select one. Select Preview or load Full message, choose a local voice under Read email aloud, then select Read displayed email aloud. It reads the displayed text in short sections, up to 20,000 characters including the heading. Stop cancels; changing the message/view, closing Email, hiding the tab, pause, lock or lost workspace access also stops. No AI summary is generated. The public preview offers the same reader with a clearly fictional message for audio testing.

The reactor now has decorative orbiting waves and rotating rings in standby. These do not indicate a connected microphone or identity. Device speech adds illustrative output waves; Piper uses actual audio data.
