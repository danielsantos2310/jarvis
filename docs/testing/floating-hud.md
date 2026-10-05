# Floating HUD verification — 2026-10-05

The owner requested freely movable icon navigation and live voice motion. The former sidebar is replaced by fourteen segmented SVG tools, an output-reactive reactor and expandable nonmodal panels. Persistent labels are removed from navigation; names remain available to screen readers and on focus/hover.

Reference review: the supplied Iron Man desktop and Weather design, plus retrieved Neon JARVIS Dashboard Interface, Email Widget Interface, Neon Calendar HUD Interface and Neon Notes and Tasks HUD boards. Interactive vectors reinterpret these references; screenshots are not used as fake functional controls.

Executed checks:

- Production and public-demo builds include TypeScript validation.
- Local workspace browser workflow covers enrollment, required validation, task/reminder/timer operations, recurrence/DST, permission controls, stale snapshots, mobile layout and locking.
- Speech browser fixture verifies bounded capture, transcript review and actual synthetic PCM driving waveform playback, followed by cleanup on lock.
- Microphone fixture covers explicit start, denied permission, cancellation, timeout and lock.
- Public preview checks pointer/keyboard movement, hiding/restoration, command-based email restoration, sample/full email content, panel expansion, waveform amplitude changes and stopping, safe literal task text, timer operations and 320/390/768/1024px layouts. It asserts no post-load network requests and no browser storage.
- Touch-enabled Chromium verifies a human-speed drag into the dismiss target, restoration by tap and Escape cancellation. The fixture uses timed moves: an instantaneous long swipe triggered browser tap suppression.
- Screenshots reviewed at desktop and mobile sizes, including the email panel and animated-wave state.
- Premium strict audit: zero findings. DESIGN.md lint: zero errors, four orphan-token warnings for runtime CSS roles documented in the token map.

Positions reset on reload. Calendar displays local scheduled items, not a connected external account. Weather, music, home and camera remain unconnected. Presence is synthetic. Email connection is a proposed next increment, documented separately.

The public center offers a silent animation preview; actual output-driven visualization belongs to the configured local speech pipeline. Automated Chromium fixtures do not certify physical iPhone Safari, Windows microphones, real Whisper/Piper installation, speaker quality, presence hardware or identity recognition. Milestone 1 owner acceptance remains open.
