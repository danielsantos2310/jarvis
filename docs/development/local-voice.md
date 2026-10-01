# Local voice test: Whisper + Piper

This is an optional, explicit-click English speech path for the local Windows/PC app. It is not a conversational AI model, speaker identification, clap detector, automatic presence trigger or Echo integration. Milestone acceptance and physical-PC performance tests remain open.

## What is implemented

1. Check the two speech workers using Wyoming `describe` requests.
2. Start capture only after a click and browser permission. Finish manually or at the 30-second cap. Stop discards capture.
3. Send mono 16-bit, 16 kHz PCM to the authenticated local core. The core forwards it to the loopback Whisper worker.
4. Review/edit the transcript in **Ask JARVIS** before pressing **Send command**. Transcription never executes commands itself. Try `add task Test voice` or `timer 5 minutes`.
5. Click **Read latest reply aloud**, or **Test spoken voice** for a fixed greeting. Piper produces PCM; the core wraps it as WAV. Browser playback feeds the real signal to the cyan waveform.

The microphone is off during transcription and playback. Text commands remain available if either engine fails. There is no browser speech recognition, browser TTS or cloud fallback. Status means the worker answered a protocol probe, not that a real speech accuracy test passed.

## Windows setup (VS Code terminal / PowerShell)

Use your local checkout containing this change. Docker Desktop must already be installed, running and configured for Linux containers. This guide does not install or modify Docker or your Windows account. On the work PC, use a location where you are authorised to run it.

From the JARVIS repository root:

```powershell
docker compose -f deploy/voice.compose.yaml up -d
```

First startup downloads the service images and voice/model files, so allow time and internet access. The models persist in Docker volumes. No API key or paid speech subscription is used. The development compose file uses the upstream `latest` images; record the resolved image digests and selected model hashes for a reproducible acceptance test. Do not enable debug/audio logging in the workers.

Check both containers:

```powershell
docker compose -f deploy/voice.compose.yaml ps
```

Stop the existing JARVIS process with Ctrl+C, then:

```powershell
npm run build
npm run voice:check
npm run start:voice
```

`voice:check` only probes readiness; it does not install software, access your microphone or alter your workspace. Missing Docker is informational if you already run native workers. Exit codes: 0 = ready to attempt the browser test, 1 = a prerequisite failed, 2 = command error. For machine-readable output use `npm run voice:check -- --json`.

Open the exact `http://127.0.0.1:3000` address (or configured JARVIS port), unlock and find **Talk to JARVIS**. Click **Check voice engines**, then **Test spoken voice**. Next, use **Start voice capture**, speak a short command, and click **Finish and transcribe**. Review the words and send them. Click **Read latest reply aloud** to hear the result.

If an engine is unavailable, wait for first-run model loading and check container status. Do not expose worker ports to the LAN. If the browser denies the mic, change the permission for this local site. Voice is absent from the public GitHub Pages sample. Without `--voice`, the original input-level microphone lab remains available.

To stop workers while preserving downloaded models:

```powershell
docker compose -f deploy/voice.compose.yaml stop
```

Stop and restart JARVIS without `--voice` to disable speech. Optional `JARVIS_STT_PORT` / `JARVIS_TTS_PORT` environment variables change worker ports; addresses remain fixed at `127.0.0.1`. Home Assistant is not required for this direct connection. Echo Dot, iPhone and Watch integration comes later.

## Boundaries and remaining validation

- JARVIS stores no raw audio or transcription history in the database or audit log. Audio buffers are transient; recognised text becomes an editable command draft. A command deliberately sent can create persistent task content under the existing storage policy. JavaScript memory reclamation is not a secure-erasure guarantee.
- Worker software has its own logging, model-download and caching behaviour. This adapter only connects to loopback and has no cloud fallback; this is not an OS network sandbox. Validate worker behaviour and offline operation on the actual PC before private use.
- Core enforces session/CSRF/Host/Origin/grant/pause checks, caps capture at 30 seconds / 960 kB decoded, bounds replies to 30 seconds and limits each worker exchange to 60 seconds. One voice job at a time; six requests per minute per write route.
- Stop aborts the HTTP request and closes the worker socket. A worker may finish already-started computation; its output is discarded. Lock/hide/page exit/unmount stop browser audio and release tracks. Server checks access every 250 ms during a job and again before returning its result. Other-tab changes stop client playback once the normal snapshot poll detects them (network failure detection can take the existing 10-second timeout).
- Half-duplex, explicit finish: silence endpointing, wake words and follow-up are not implemented. The last partial worklet block (at most 16 ms at 16 kHz) is omitted when finishing capture; pause briefly after speaking before pressing Finish.
- Tests use synthetic audio and mock workers, including a real TCP framing fixture. They do not validate Whisper accuracy, Piper voice quality, Docker installation, Windows drivers, physical microphones or performance on the Alienware Alpha.
- On the target PC: test mic permission denied, Stop, tab hide, Lock during capture/output, engine failure, guest/background noise, 30-second cap, English accuracy, latency/CPU/RAM and operation after disconnecting the internet. Record engine versions, model hashes and voice-model licence before acceptance.

## Sources / runtime and model licensing

- [Wyoming protocol and security model](https://github.com/OHF-Voice/wyoming): TCP framing and PCM events; no built-in authentication or encryption. Worker ports are loopback-only for this reason.
- [Wyoming Faster Whisper](https://github.com/OHF-Voice/wyoming-faster-whisper): upstream install and Docker instructions; `tiny-int8`, English, port 10300.
- [Wyoming Piper](https://github.com/OHF-Voice/wyoming-piper): upstream install and Docker instructions; `en_US-lessac-medium`, port 10200.
- [Home Assistant local voice](https://www.home-assistant.io/voice_control/voice_remote_local_assistant/): local STT/TTS architecture.

The adapter bundles no engine/model files. Wyoming wrapper repositories publish MIT licences; underlying runtimes and individual voice models have separate terms. Check the exact downloaded packages and voice model card; do not infer a model licence from the wrapper licence.
