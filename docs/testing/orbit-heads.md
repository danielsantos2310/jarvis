# Orbiting light heads — 9 October 2026

Added 12 small cyan heads, faint halos and short trailing strokes. Stable pseudorandom starting offsets and varied individual paces/directions avoid an evenly spaced mechanical appearance. Each head and tail samples its actual morphing SVG path, keeping it attached to a wave and outside the empty center.

Idle speed is .018 laps/second before individual pace; speaking eases toward .09–.12 laps/second using the shared audio envelope. Speed smooths over 450ms, with travel retained across state changes. No independent timers or audio capture. Processing color stays blue, close to the original cyan/electric-blue palette.

Checks: both builds/typecheck passed; two desktop/mobile core browser tests and the local PCM voice browser test passed. Tests assert 12 heads, changing positions, faster speech travel, reduced-motion stillness and hidden-tab freeze. Desktop speaking screenshot inspected. Static premium audit has zero findings; publication scan passed. Existing background, widgets, permissions and security boundaries are unchanged.
