# GitHub Pages interactive preview

This is a static, sample-data preview of the M1 dashboard. It runs in browser memory. Tasks, short reminders, timers, permission/pause controls and synthetic presence can be tried without a local installation. Reload or Reset demo restores the sample workspace. Calendar recurrence, authentication, backups, voice, AI models and real devices require the local application or future work; they are not provided by this preview.

Use sample information only. There is no browser storage, analytics or backend connection. The preview CSP disallows network connections (`connect-src 'none'`). GitHub serves the static files and receives normal page requests. The local build still uses the authenticated loopback backend.

## Build and verify

Use the Node 24 version documented in the root README:

```sh
npm ci
npm run build:demo
npx playwright test -c playwright.demo.config.ts
```

The browser test needs Playwright Chromium installed, or `JARVIS_TEST_CHROME` pointing to a compatible executable. It serves the output under `/jarvis/` to check project-path assets. `dist-demo/` contains only HTML, CSS, JavaScript and `.nojekyll`. Upload those contents to the root of the `gh-pages` branch. Never upload a workspace, database, recovery directory or credentials. Rebuild and replace the deployment tree on each preview release so obsolete hashed assets are removed.

## Enable hosting

The deployment branch is prepared separately from the draft source PR. In repository Settings → Pages, choose **Deploy from a branch**, then **gh-pages** and **/(root)**, and save. Wait for the Pages deployment to finish. The intended project URL is:

https://danielsantos2310.github.io/jarvis/

That address is not proof of an active deployment. Verify the Pages status and load the site before calling it live. On 2026-09-29, the owner made the repository public temporarily and Pages was enabled from `gh-pages` / root. The live dashboard was verified for task creation/completion, timer delivery, synthetic presence and reset. Return to private is planned after the owner finishes testing; the account settings confirmed that private-repository Pages requires an upgrade. Private-repository Pages availability depends on the owner's GitHub plan; the preview may be publicly accessible even though its source repository is private.

## Scope and validation

The preview is a visual and interaction checkpoint, not M1 acceptance or a remotely hosted JARVIS backend. Automated browser coverage checks sample creation/deletion, inert text rendering, timer delivery, pause/resume, permission revocation/restoration, synthetic presence, reset behavior, mobile overflow, no backend/external requests, no browser storage, and no uncaught page errors. The existing authenticated local workspace browser test remains a separate regression check.
