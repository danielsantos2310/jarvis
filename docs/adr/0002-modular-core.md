# ADR-0002: Modular TypeScript core and isolated workers

- Status: Proposed
- Proposed date: 2026-09-16
- Decision owner: Daniel; implementer supplies evidence
- Acceptance: Pending
- Requirements: F-09, S-02, S-05, N-01

## Context and options

One developer needs a maintainable first system with room to grow. Alternatives are distributed microservices, all logic in a web framework, or a modular local core with selective process isolation. The earlier discussion suggested a TypeScript dashboard/core; no existing implementation constrains the choice.

## Proposed decision

Use TypeScript/Node for the domain core and React/Next.js for the local dashboard. Keep a separate core API/policy authority. Use explicit module contracts internally and separate processes for AI workers and credential-bearing integration execution. Python/Rust may be used behind adapters when the selected engine or OS integration requires them.

## Consequences and validation

Shared language reduces duplicated domain definitions. Multiple processes still need lifecycle and authenticated IPC. In-process modules are not security sandboxes. Next.js may be heavier than a Vite SPA; revisit if its self-hosting complexity brings no practical benefit. Validate T-09, T-17–T-19, T-30 and worker/executor isolation before adding integrations.

Sources: [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting), [Node supported releases](https://nodejs.org/en/about/previous-releases). Detail: [system](../architecture/system.md).
