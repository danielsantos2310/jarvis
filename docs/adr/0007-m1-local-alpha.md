# ADR-0007: Bounded implementation of the first PC alpha

Follow-up: [ADR-0008](0008-local-recurring-reminders.md) adds the calendar recurrence previously deferred here. This record preserves the first-slice decision.

- Status: Implemented for evaluation; owner acceptance pending
- Date: 2026-09-28
- Decision owner: Daniel; implementation choices supplied for review
- Related: ADR-0001–0004 and ADR-0006 (remain Proposed)
- Requirements: F-01, F-09, F-13, F-14, F-16; S-01–S-03; N-01, N-08, N-10

## Context

The documentation baseline is merged and Daniel requested the next project step. We need a runnable, bounded one-PC experience before selecting speech models or installing a home hub. The Windows work PC is known from earlier user instructions, but its exact hardware has not been inspected. First workflows must function without model inference, peripherals or cloud accounts.

## Selected implementation

Use TypeScript/Fastify as the single local authority, React/Vite for a static dashboard, Node's built-in SQLite driver, npm and an exact dependency lockfile. Serve the built dashboard from the same Fastify origin. Node 24.19.0 is the tested runtime; accept compatible Node 24 patch updates after regression/advisory review. npm 11.9.0 is the tested package manager. Direct versions and transitive resolution live in `package.json` and `package-lock.json`.

The earlier Next.js proposal remains relevant to a future requirement for SSR, but this private dashboard has no server-rendering or SEO requirement. Vite removes a second server lifecycle. npm comes with the selected Node installation and simplifies beginner Windows setup; adopting pnpm later is not an architectural dependency. Native TypeScript type stripping runs core files; `tsc` separately checks them, and Vite compiles TSX. No production dev server is exposed.

Use `@fastify/session` for cookie/session lifecycle and a bounded in-memory server store. A per-process signing key deliberately invalidates sessions on restart. Hash passwords with Node `crypto.scrypt` (N=2^17, r=8, p=1, 32-byte salt, 64-byte output) and constant-time comparison. Serialize password derivations. Require terminal proof during first enrollment, explicit local-record consent, and direct password confirmation for permission changes/resumption. A local operator can recover the password only with access to the stopped installation's data directory; recovery increments auth epoch and pauses actions.

This is single-owner authentication, not household IAM. The frontend's one-second authorized snapshots are an interim implementation; the 500 ms event-to-render target is not claimed. One-shot reminders store a UTC instant and IANA timezone; recurring local wall-clock rules remain a later M1 slice. All due deliveries use a silent private inbox, so no playback/OS notification guarantee is made.

## Consequences and alternatives

- SQLite's built-in Node interface avoids a separate native addon/compiler installation, but its API maturity and synchronous work still require version and workload review. Keep data calls small and capped.
- A process-local session store keeps cookie contents free of private records and gives clear restart revocation; users must sign in again after restart or 30 minutes.
- HTTP is permitted only on fixed loopback, with Host/Origin/CSRF checks. LAN use requires a new authenticated HTTPS deployment profile; changing a bind address alone is not an upgrade path.
- First-run terminal code stops uninvited browser enrollment; it does not protect a host account already compromised by another process.
- Directory permissions and disk encryption belong to host security. This implementation does not claim encrypted storage or completed personal-pilot recovery.
- Synthetic presence exercises state/freshness only. It cannot grant identity, consent or speech authority.
- Password UX, real Windows operation, recurrence, backups and the full performance/security release gate remain review items.

## Validation and sources

See [slice evidence](../testing/m1-slice-1.md) and [implementation scope](../milestones/001-local-alpha.md).

Primary references consulted 2026-09-28:

- [Fastify session plugin](https://github.com/fastify/session): options, stores, regeneration and destruction.
- [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html): scrypt parameters.
- [Node SQLite API](https://nodejs.org/docs/latest-v24.x/api/sqlite.html): synchronous driver, transactions and backup API.
- [Node TypeScript support](https://nodejs.org/docs/latest-v24.x/api/typescript.html): runtime type stripping and limitations.
- [Vite guide](https://vite.dev/guide/): building the local frontend.
- [SQLite appropriate uses](https://www.sqlite.org/whentouse.html): one local authority.

These support implementation mechanisms; they do not establish that JARVIS has passed independent security review.

## Alpha 3 follow-up

[ADR-0009](0009-encrypted-recovery.md) adds manual encrypted recovery and independent deletion replay. Earlier no-backup statements describe the initial slice; live SQLite still relies on host encryption and personal-pilot acceptance remains open.
