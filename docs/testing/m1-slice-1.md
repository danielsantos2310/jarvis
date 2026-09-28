# M1 slice 1 — verification report

Date: 2026-09-28. Scope: local, single-owner PC evaluation alpha. Dataset: synthetic tasks and credentials only. Full Milestone 1 and a personal/home pilot are **not accepted** by this report.

## Environment

- Execution host: Linux x64; Node 24.19.0, npm 11.9.0.
- Package graph: exact `package-lock.json`; see [direct dependency inventory](../development/dependencies.md).
- Browser: Chromium 153.0.8010.0 on Linux, Playwright 1.63.0. Standard Playwright browser download returned an invalid archive in this environment, so a separately provisioned Chromium executable was used through `JARVIS_TEST_CHROME`. No dependency on that temporary browser package was added to the app. Desktop and 390 px screenshots were visually reviewed. Browser web security/CSP remained enabled; this container required browser sandbox flags.
- Production entry point: `/api/session` responded 200; SIGTERM exited with code 0 and removed the runtime lock.
- Windows work-PC specifications and an actual Windows run remain unverified.
- No local LLM, STT/TTS, microphone, real sensor, Home Assistant, cloud service or hardware executor was installed.

## Executed evidence

| Check | Result | What it establishes |
| --- | --- | --- |
| TypeScript check | Passed | Core, shared contracts, frontend and tests type-check |
| Core tests | 12/12 test groups passed | Authentication, ownership, validation, local policy, replay, storage and recovery scenarios listed below |
| Production frontend build | Passed | Vite emits locally served assets without a CDN/font dependency |
| npm advisory audit | 0 known vulnerabilities reported | Snapshot of registry advisory data after upgrading `@fastify/static` to 10.1.5; not proof of absence of vulnerabilities |
| Browser workflow | Passed, one end-to-end scenario (23.3 s) | Enrollment, task/timer/inbox, reload, inert markup, stop/resume, grant revoke/restore, 390 px layout and logout; no external page requests or page errors observed |
| Documentation links and patch whitespace | Passed: 113 local links, no broken targets | Current repository documentation and patch formatting |

## Core test coverage

`tests/core.test.ts` exercises:

1. Anonymous/expired sessions; exact Host and Origin; absent Origin; CSRF; cookie properties.
2. First-run terminal-code requirement, explicit local-record consent and one-time enrollment.
3. Setup expiry and login rate limiting, with bounded serialized password hashing.
4. Durable writes, deduplication, changed-request conflicts, cross-owner and cross-household exclusion.
5. Unsupported shell/URL/cloud/grant/messaging commands and stable relative-timer replay across time.
6. Unknown fields/actor claims/actions, malformed/oversized bodies, invalid timezone/date and missing timer deadline.
7. Stop/resume, password confirmation, grant revocation and server-side exclusion of private fields.
8. Reopened-database missed reminders, exact UTC instant around a DST transition, once-only inbox delivery, dismissal/deletion and tombstones.
9. Logout/recovery/restart session revocation; public payload and audit content minimization.
10. Synthetic sensor expiry, rejection of claimed identity and browser capture/cache headers.
11. Fault-injected audit failure rolls back local effects and scheduler notice claims.
12. Refusal of a newer database schema and inert command-title handling.

The reopen test is restart/persistence evidence, **not** an encrypted backup/restore drill. The DST test covers a specified one-shot UTC instant; it does not validate recurring wall-clock rules.

## Requirement mapping and limits

| Catalogue IDs | Slice evidence | Remaining work |
| --- | --- | --- |
| T-01 | Local code/assets and browser request observation | OS-enforced core WAN denial and capture on the target PC |
| T-02, T-09 | Explicit missing model/voice states, synthetic labels, independent widget boundaries | Inject rendering/provider failures and test full widget lifecycle |
| T-13 | One-shot persistence, late inbox, no double delivery, stored UTC/zone | Recurrence, nonexistent/repeated local-time selection and full missed policies |
| T-14 | Stop denies new creation and scheduler delivery; reauthentication to resume | Future worker/physical executor cancellation |
| T-16–T-19 | Public/redacted payload, session/CSRF/origin tests, identity/schema/injection denial | Multi-member household implementation, full path/SSRF fuzzing as integrations are added |
| T-21 | Redacted audit; no secrets in client data model; runtime state ignored by Git | Independent artifact/security review |
| T-24, T-35 | Transaction rollback on injected storage/audit failure; bounded resources | Actual full disk, process kill matrix, load exhaustion and all quota boundaries |
| T-26, T-32 | Live delete + tombstone and credential recovery only | Encrypted backup, independent journal, isolated restore and RPO/RTO measurement |
| T-29 | No third-party executable widget interface | Formal plugin denial tests if an installation API is added |
| T-30 | Not claimed | One-second polling intentionally does not meet the 500 ms event-to-render target; measure on reference PC and implement live updates |
| T-33 | Semantic forms/buttons, dialog focus, reduced-motion styles; responsive browser workflow | Full keyboard-only/screen-reader/contrast audit on Windows |
| T-36 | Exact dependencies, schema gate and compatibility notes | Windows run and migration/rollback matrix |
| T-37 | Input/rate/session/item/receipt/audit caps; serial auth work | Sustained hostile workload and external-provider cases |

No claim is made that all catalogue IDs above are fully passed. Later voice/presence/proactivity/physical-action tests are outside this slice.

## Reproduction

```text
npm ci
npm run check
npx playwright install chromium
npm run test:e2e
npm audit
```

Browser tests use a temporary synthetic database and known test-only credentials. The production entry point always generates a random setup code. Screenshots/traces remain ignored; do not upload them if you later run tests with real data.

## Review and rollback

Review the first-run experience and three workflows on the Windows PC before closing this slice. Stop the core before switching versions. The baseline schema is 1; do not use an older incompatible binary against future schema changes. Reverting this first implementation restores the documentation-only repository but does not erase `.jarvis`; removing local data is a separate, explicit operator decision. Owner acceptance, independent security review and full M1 completion remain pending.
