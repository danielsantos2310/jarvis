# Control-room visual refresh — 2026-09-30

Daniel requested a style inspired by a supplied blue-on-black science-fiction desktop reference. The dashboard now uses cyan accents, a dark grid, technical panel edges, monospaced labels and a circular SVG core display. No logos, photos, operating-system widgets or fake hardware readings from the reference are copied.

The circular artwork is decorative and hidden from assistive technology. It has no animation, telemetry, external assets or network calls. The interface retains actual task/timer counts, explicit sample-data status, local authentication, permission controls and honest unavailable-service labels. The mobile layout stacks the core display above the command input; task controls have larger targets. Reduced-motion behavior and visible keyboard focus remain available.

## Evidence

- TypeScript and local/demo builds passed.
- Authenticated local browser workflow passed, including recurrence, permissions, keyboard controls, immediate locking, stale-response handling and failed logout.
- Sample preview browser workflow passed with no unexpected network requests, browser storage or uncaught page errors.
- Desktop 1440px and phone 390px screenshots were inspected; additional 320px, 768px and 1024px overflow/control checks are included.
- Backend/schema unchanged. This visual pass is not full accessibility certification or M1 completion. Windows/off-disk recovery, disk failure, latency/resource measurements and owner acceptance remain open.

The source is reviewed independently from the static `gh-pages` deployment. The public preview still contains only sample data and resets on reload.
