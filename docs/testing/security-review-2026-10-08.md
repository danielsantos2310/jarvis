# Publication security review — 8 October 2026

Scope: current source and built local/public applications. This is a focused engineering review, not a penetration test or a complete Git history secret audit.

| Request | Evidence and outcome |
| --- | --- |
| HTTPS/redirection | Live `http://danielsantos2310.github.io/jarvis/` returned 301 to the exact HTTPS URL. GitHub terminates TLS. Local assistant intentionally remains loopback-only HTTP at 127.0.0.1, rejects other Host/Origin values and does not trust forwarded headers. Do not expose it on a LAN or reverse proxy without a separate TLS/cookie/origin design. |
| Credentials | Google client secret is read only by the server from JARVIS_GOOGLE_CLIENT_SECRET. Gmail tokens remain in server memory, expire and are revoked from local access on logout. No Vite environment variables are now automatically exposed (`envPrefix: []`). Private files are ignored; the release scan checks tracked/unignored source and both builds without printing credential values. HttpOnly session cookies and session-bound CSRF tokens are necessary browser security mechanisms, not provider keys. |
| Validation | Server JSON schemas reject additional fields, bad types, unsupported operations and oversized bodies; domain checks remain authoritative. Prepared SQL and React text rendering preserve untrusted content as data. YouTube URLs use HTTPS host/ID allowlists; coordinates and weather fields are validated. Do not strip arbitrary characters from passwords or treat HTML sanitization as a substitute for contextual escaping. |
| Abuse | Global local request cap 240/min, login/enrollment 5/min, control 10/min, schedule preview 30/min and voice 6/min. Password hashing, voice and Gmail work have concurrency bounds. Public preview has no submission backend or real Gmail endpoint; CAPTCHA would not protect any server there. Public traffic mitigation is hosting-provider controlled. |
| Headers | Local server already emits CSP, no-store, nosniff, no-referrer, DENY and Permissions-Policy. Added same-origin Cross-Origin-Resource-Policy and disabled DNS prefetch. Both builds now have no-referrer metadata. Static preview has restrictive meta CSP: self scripts/styles, explicit weather/YouTube allowlists, no forms/objects/base URLs. |
| Dependencies | Updated source-map-js 1.2.1 to patched 1.2.2 for GHSA-68fv-2mgg-jv7q. Fresh npm audit after update: zero reported vulnerabilities (160 dependency entries). This result is time-specific. |
| Publication surface | Public artifacts are allowlisted (HTML, CSS, JavaScript, voice worklet, .nojekyll), with no maps, database, environment or key files. Local API docs and administrative operations require authentication; synthetic presence remains explicitly synthetic. No new endpoint added. |

## Hosting limitation

GitHub Pages controls response headers. Repository HTML cannot enforce header-only protections such as frame-ancestors, X-Frame-Options or Permissions-Policy. The public preview therefore does **not** have the same anti-framing and feature-policy protections as the local server. A host/CDN allowing custom response headers is required to close that gap. Do not claim a meta tag implements these headers. No host migration was performed.

## Repeat before publication

Run `npm run build:demo`, `npm run build`, `npm test`, `npm audit`, and `npm run security:review`, then the preview and local voice browser suites. Review changes and run the scan on the exact publishable artifacts. The scanner detects selected recognizable secret formats; it cannot prove absence of all credentials. Never include secrets in public-prefixed environment variables, commit messages or logs. Rotate any real secret if it is ever published; deleting the current file does not remove history.

Sources: [GitHub HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https), [MDN frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors), [dependency advisory](https://github.com/advisories/GHSA-68fv-2mgg-jv7q).
