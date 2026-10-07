---
version: alpha
name: JARVIS Command Center
description: A private home assistant with an original cyan instrument interface and approachable everyday controls.
colors:
  primary: '#67e8ff'
  background: '#030a10'
  surface: '#0a1822'
  text: '#e9f7fc'
  muted: '#a2bac8'
  border: '#254552'
  warning: '#ffd18a'
typography:
  display:
    fontFamily: 'Bahnschrift, Arial Narrow, Segoe UI, sans-serif'
  body:
    fontFamily: 'Segoe UI, Arial, sans-serif'
  mono:
    fontFamily: 'Consolas, monospace'
rounded:
  DEFAULT: '6px'
  panel: '4px'
spacing:
  section-gap: '20px'
  page-max: '1600px'
components:
  button:
    height: '44px'
  card:
    rounded: '4px'
  dialog:
    rounded: '8px'
---

# JARVIS design system

## Overview

An Iron Man inspired personal command center, using original concentric instrument rings rather than licensed logos or copied artwork. Daniel uses this product to manage tasks, reminders and timers on a local Windows PC, and review a public sample on an iPhone. The reactor graphic is the signature. Familiar form controls, readable language and clear microphone consent take priority everywhere else.

Product register, English interface, browser timezone. No market or Japanese locale requirement is inferred. Business authority: `docs/milestones/001-local-alpha.md`, `src/shared/contracts.ts`, and the local voice and microphone guides in `docs/development`. Public preview uses sample data; the graphic never represents measured telemetry or identity.

Runtime ownership is Model B: `src/web/hud.css` owns the accepted theme; this document mirrors it. `styles.css` retains structural foundations. No competing theme or remote decorative assets. External service content is allowed only after an explicit user request.

## Colors

Near-black background with blue-black panels. Cyan identifies actionable controls, focus and the core artwork; amber marks preview context and warnings. Text uses bright ice white and muted blue-grey. Only dark theme is supported. Forced-colors restores system-operable outlines and scrollbars. Status always includes text.

| Document role | Runtime token | Consumers |
| --- | --- | --- |
| primary | --mint | actions, focus, core, waveform |
| background | --bg | body, entry |
| surface | --card | base panels |
| text | --text | content, controls |
| muted | --muted | supporting text |
| border | --line | panels, separators |
| warning | --orange | warning dot, preview |
| display/body/mono | --font-display / --font-body / --font-mono | headings / content / technical labels |
| default radius | --radius | controls |

## Typography

System display fonts give headings an instrument-panel feel without font downloads. Segoe UI/Arial carries prose and controls. Consolas carries time and short technical labels. Restrict uppercase and tracking to small labels; keep instructions in sentence case. Mobile command input is 16px to avoid focus zoom. Body hierarchy favors 14–15px text over the prior miniature HUD labels.

## Layout

Full-screen spatial workspace with fourteen independently draggable circular tools around a central reactor. No sidebar, dropdown navigation or permanent icon names. Desktop uses an ellipse; narrow screens use two perimeter columns. Tool names appear on hover/focus and remain available to assistive technology. Panels open over the stage, expand, scroll internally and close with focus returned to the opener. At 680px and below panels use near-full width. Positions and hidden tools last only for this session; restore resets the layout. Standard controls retain readable labels inside panels.

## Elevation & Depth

One restrained halo around the core and thin cyan corner marks distinguish the hero. Utility cards have quiet borders and tonal backgrounds. At the owner's request, AmbientBackdrop adds clearly visible concentric cyan waves orbiting the reactor and brighter cyan/blue/teal cloud motion inspired by a generating-image shimmer. Local CSS owns the effect via --ambient-cyan, --ambient-blue and --ambient-teal; no downloaded images or telemetry. The owner rejected the faint first version and requested removal of its play/pause button. Motion runs automatically with no background controls; reduced-motion preference and hidden-tab pause remain. No glowing body text or fake charts. Dialog backdrop separates high consequence controls from the workspace.

## Shapes

4px panel corners, 6px input/control corners, 8px dialog corners. The circular core and logo are expressive exceptions. Rings stay decorative and inaccessible to screen readers. Controls retain full rectangular hit areas; no polygon clipping on content.

## Components

FloatingWorkspace owns the spatial shell, icon movement/hiding/restoration and panel focus; main owns action lifecycle and status; CoreDisplay owns decorative SVG; ReminderForm owns schedule entry; VoiceWaveform owns output visualization; SpeechPanel owns local capture/review/playback; MicrophoneTest owns browser-only metering. Reuse these owners.

Buttons use native semantics with hover, active, focus-visible, disabled and existing busy states; touch controls target at least 44px. Floating icon buttons open bounded nonmodal panels after a 360 ms double-tap window. Double-click/double-tap hides; dragging never hides and there is no drop target. Arrow keys offer non-drag movement; Delete hides; Restore returns all tools. Escape cancels a move or closes the panel. The microphone shortcut navigates only: it never requests permission. Existing permission/auth/server validation and lifecycle contracts remain authoritative.

Select and date ownership is deliberately native in ReminderForm and Controls; browser-owned popup geometry and local date presentation are accepted. The shared Form component owns inline constraint errors, first-invalid-field focus, aria-invalid and error association. The API retains authoritative domain validation. PasswordInput masks by default and provides an accessible reveal toggle. This visual change does not alter recurrence/DST, deletion, permissions or transcript review semantics. Existing browser suites verify them. No new CRUD/table workflow or toast system is introduced.

Scrollbars are global in hud.css: --scroll-thumb, --scroll-track, --scroll-hover; standards properties plus WebKit fallback, with forced-colors reset. Tool panels and native dialogs own bounded internal scrolling. Feedback remains inline using existing live regions, banners and responses.

Icons are local SVG symbols inside segmented instrument rings. The user explicitly requested icon-only navigation. The `--widget-opacity` token is .5 at rest, with opacity 1 on hover, focus, selection or drag; forced-colors uses opacity 1. Panel backgrounds are 50% opaque with blur, while text stays opaque. VoiceWaveform drives radial spokes, ring amplitude and waves from actual output PCM; the center also offers a clearly identified silent preview. Standby has slow counter-rotating reactor rings and a breathing center; reduced-motion suppresses continuous animation. Orbital SVG waves share the reactor geometry so mobile and desktop stay aligned. Hidden tabs suspend decorative motion. Closing the microphone panel releases capture/playback resources. Unconnected services remain explicitly unconnected; fictional email content is labelled.

EmailPanel owns local Gmail connection/read/disconnect state and clears private UI on unmount. ServicePanels owns opt-in YouTube loading and approximate-location weather with cancellation. Neither requests a provider on initial workspace load. Real Gmail is local-only, read-only and session-only; public Email is a labelled sample. See `docs/development/service-connections.md` for service boundaries and configuration.

BrowserVoice is the temporary device-TTS owner when Piper is not configured. It lists only voices reported as local by the browser, has explicit play/stop controls, and cancels on panel close, tab hide, pause, lock and unmount. Voice/speed selectors are native. Device speech animation is explicitly illustrative (start/stop events), not measured audio. The configured Piper path remains the owner of actual PCM-driven waves. Neither output route starts microphone capture.

## Do's and Don'ts

- Do put the next useful action next to its explanation.
- Do distinguish local voice, browser microphone meter and simulated sensors in text.
- Do preserve keyboard semantics, visible focus and readable controls at narrow widths.
- Don't label the owner as recognized, show fabricated telemetry or imply a model is connected.
- Don't add Stark branding, external fonts, audio uploads, autoplay or automatic microphone permission.

## Verification and existing debt

Browser coverage: `tests/demo.preview.ts`, `tests/*.e2e.ts`, `tests/pipeline.speech.ts`, microphone suite. Exact executed commands/results are recorded in `docs/testing/floating-hud.md`.

The earlier UI mixed small cyan overrides with mint base styles. This change deliberately replaces the HUD theme as one canonical file; structural CSS remains for untouched flows. Native validation bubbles were replaced through the shared Form owner while preserving required, length and domain constraints.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Select/Listbox | Native select in ReminderForm and Controls | DESIGN.md and existing action contracts | native | Existing browser schedule and control flows |
| Date | Native datetime-local in ReminderForm | Schedule contract and DESIGN.md | native | Recurrence/DST browser workflow |
| Form | src/web/Form.tsx | Native constraints plus server schemas | login, control, task, command | Browser error, focus, and successful submit |
| Scrollbar | src/web/hud.css | Runtime CSS tokens mirrored here | global; forced-colors system | Browser computed style |

## Reference direction — October 2026

Owner-supplied Iron Man desktop and the retrieved JARVIS widget boards informed segmented rings, perimeter tools and cyan panel corners. Reviewed boards: Neon JARVIS Dashboard Interface, JARVIS Email Widget Interface, JARVIS Neon Calendar HUD Interface and JARVIS Neon Notes and Tasks HUD, plus the supplied Weather board. These are visual references, not embedded screenshots: SVG controls remain interactive, scalable and accessible. State colors must represent real state; do not invent connected accounts or telemetry.

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Spatial tools | src/web/FloatingWorkspace.tsx | This document and user reference | desktop ellipse, mobile perimeter | Pointer/keyboard drag, hide, restore, panels, viewport bounds |
| Voice motion | src/web/VoiceWaveform.tsx | Actual analyser data or explicit preview | standby, real output, silent preview, reduced motion | Synthetic PCM playback and preview tests |

BrowserVoice also owns read-aloud controls embedded in EmailPanel. Only explicitly selected preview or loaded full-message text is spoken, using browser-reported local voices in bounded 220-character chunks (20,000 total). Changing message/view, closing Email, hiding, lock, pause or unmount cancels playback. Email content is data, never a command. The central waveform indicates illustrative device speech.

## Approved neural visual direction — 7 October 2026

The owner rejected the coarse vector face. The exact reference image(10).png now guides the avatar: a sculpted cyan holographic human face, dense fine triangular mesh, luminous eyes and forehead node, layered technical rings with small red accents. The approved living neural background remains unchanged. State names in references are guidance only, never visible UI labels.

AmbientBackdrop owns a bounded 190-node canvas field, capped at 25fps and 1.5 device pixel ratio. It stops animation in hidden tabs and renders a static frame for reduced motion. CoreDisplay owns a transparent generated portrait asset, independently animated SVG rings, ticks, hexagons and scan sweep. LivePortrait deforms that same artwork using a bounded WebGL shader: head/eye attention toward the selected widget, periodic blinks, subtle breathing and audio-level-driven lips. AvatarAttention carries the current tool position from FloatingWorkspace; closing returns to center and moving the selected tool updates the target. This is 2.5D artwork animation, not full 3D rotation or phoneme-accurate lip sync. Voice motion uses the existing analyser-driven waveform; device speech remains explicitly illustrative. Runtime tokens --neural-ink/cyan/blue/red own the palette.

VoiceWaveform owns state priority: speech (or explicit silent preview), active microphone, actual pending work, then idle. MicrophoneTest reports real input level; SpeechPanel passes a real input/output analyser and transcription/synthesis phase. BrowserVoice passes actual speech events. Processing visuals indicate pending work, not an installed AI mind. No automatic microphone or fabricated recognition.

IDLE, LISTENING, THINKING and SPEAKING are guide labels only: the avatar has no visible state captions. Accessible status remains visually hidden; microphone permission, capture and errors remain readable inside the tool panels. All four effects obey reduced motion and tab visibility. Floating icons, 50% opacity and touch gestures retain their established owners.

LivePortrait renders at no more than 30fps, caps its backing surface at 900 pixels and 1.5 DPR, stops in hidden tabs, and draws a neutral still frame for reduced motion. It cleans up graphics resources on unmount. If WebGL is missing or its context is lost, the original image remains visible. It does not use the camera, open a microphone or make additional network requests.

### Dotted-light identity — approved refinement

The owner rejected simulated mouth opening. This supersedes the earlier audio-driven lip deformation: the lips now remain geometrically unchanged, with fine cyan contour dots and soft glow responding to speech. No dark cavity is painted and no lip pixels are displaced. Attack/release smoothing (85/220ms) prevents abrupt flashing and lets lights fade during pauses. Device speech remains illustrative; local output uses the existing audio analyser. The `data-mouth` diagnostic now measures light intensity, not mouth opening.

The portrait uses fine dotted shading and faint mesh detail, with brighter eyes to preserve identity. Actual pending work illuminates a sparse internal network across the forehead and upper head, with travelling pulses and a 250ms transition. Speaking/listening take priority; processing lights fade when pending work ends. These effects communicate activity, not biological cognition or a connected AI model. Background, widget behavior, subtle gaze and blinking are unchanged. Reduced motion keeps a neutral still portrait and existing accessible status announcements.
