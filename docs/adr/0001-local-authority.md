# ADR-0001: Local authority with optional external services

- Status: Proposed
- Proposed date: 2026-09-16
- Decision owner: Daniel
- Acceptance: Pending
- Requirements: F-01, P-01, P-04

## Context and options

The user requires local-first operation. Options are a cloud-primary backend, a permanently offline appliance, or a local authority with explicit external adapters. Cloud-primary adds a dependency for core use; permanently offline excludes selected online sources even when the user wants them.

## Proposed decision

Local core owns identity, data, policy, tasks and device action decisions. Provisioned core workflows work offline. Strict-local mode blocks all assistant WAN traffic. Selected integrations and cloud inference can be separately enabled with purpose-specific consent; cloud is never an automatic fallback.

## Consequences and validation

The user operates backups and a local host. Local model quality depends on hardware. External content stays labeled with source/age. T-01 and T-27 prove network behavior under the declared workload. Revisit if a proposed capability cannot operate with these boundaries; do not silently weaken local authority.

Related: [privacy modes](../governance/privacy.md), [deployment](../architecture/deployment.md).
