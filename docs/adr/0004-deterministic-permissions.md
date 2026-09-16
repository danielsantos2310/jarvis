# ADR-0004: Permission enforcement outside model reasoning

- Status: Proposed
- Proposed date: 2026-09-16
- Decision owner: Daniel
- Acceptance: Pending
- Requirements: S-01–S-05, F-11, F-14, P-04

## Context and options

An assistant that reads untrusted text and operates tools can be manipulated. Options are prompt-only rules, a permission-aware model that directly executes, or independent deterministic authorization. Prompt/model controls alone do not establish an enforceable security boundary.

## Proposed decision

Model output is a proposal. Every tool request passes schema validation, trusted actor resolution, scoped grants, audience/consent checks and bounded execution. Sensitive approvals bind the exact action digest and current policy. Executor credentials are inaccessible to models and widgets. P4 capabilities are unavailable; initial external P3 writes are deferred.

## Consequences and validation

More explicit schemas, grants and user controls are required. The model cannot invent new tools at runtime. Tests assert effects and disclosure, including injection, revoked grants, changed approvals, replay and crash ambiguity. T-18–T-21, T-27 and T-31 are required. Any expansion of action risk requires a new ADR.

Source: [OWASP AI Agent Security](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html). Detail: [permission contract](../governance/ai-permissions.md).
