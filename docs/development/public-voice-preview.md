# Public microphone, clap and reply preview

Open the HTTPS public preview directly, open the Microphone tool, select a local device voice and click **Test device voice** first.

- **Start microphone test:** local level meter for 30 seconds, no recording or upload.
- **Enable clap greeting:** enable microphone permission, wait quietly for at least half a second, then clap once. A short loud transient stops microphone capture and requests a greeting. Other sharp noises can trigger it. Rearm manually for each test; no continuous background listening.
- **Typed question:** ask the time/date, say hello or ask for help, then Get preview reply. Replies are scripted, not a model.
- **Ask by voice:** separately check provider-processing consent, then click. Browser speech recognition captures one phrase for at most 15 seconds and requests a scripted spoken reply. If unsupported, denied or unavailable, use typing. It never executes actions.
- **Stop preview conversation:** stop recognition, the microphone and device speech. Closing the tool, hiding the tab, pausing/revoking demo access or locking also stops the corresponding resources.

## Boundaries

Browser recognition support varies and may use the browser provider's remote service. This is separate from the local clap meter. Audio sent to that provider is subject to its service/privacy rules; JARVIS cannot revoke already transmitted data. No provider key, new backend, automatic retry or automatic recognition after a clap is included. The local application keeps its existing Whisper/Piper path.

Transcript/question text is memory-only, capped at 300 characters and clears on panel close/tab hide or after five minutes. Replies never access real accounts, execute commands, authenticate a person, or imply an AI mind is installed. Local device speech availability depends on the browser's installed voices; only voices reported as local are offered.

Clap activation cannot wake a closed tab, suspended browser or locked phone. Keep the microphone panel and tab open. Browser autoplay rules can block a greeting initiated after a clap; the greeting remains on screen and **Read preview reply** provides a direct button fallback. Test on the intended iPhone/Windows device before relying on behavior.

Sources: [MDN SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition), [MDN speech synthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/speak), [MDN user activation](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/User_activation).
