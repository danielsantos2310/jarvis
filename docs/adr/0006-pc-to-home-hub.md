# ADR-0006: Grow from one PC to a single local home hub

- Status: Proposed
- Proposed date: 2026-09-16
- Decision owner: Daniel
- Acceptance: Pending
- Requirements: F-01, F-12, S-06, S-07, N-09, N-11

## Context and options

The project starts on existing hardware and should expand across rooms. Options are an early server purchase, independent assistants per room, or a single authority that can move from PC to hub. Independent writable memories/policies introduce synchronization and privacy complexity.

## Proposed decision

Start on the PC. After benchmarks and a one-room pilot, migrate the authority to a Linux hub if always-on use is justified. Pair thin room endpoints with individual identities. Use Home Assistant for device integration, ESPHome where suitable and MQTT only when needed. Keep audio on dedicated streams. Use Docker Compose for the hub; retain explicit host audio/device access boundaries.

## Consequences and validation

The hub is a single point of failure, and early PC sleep limits availability. Manual controls remain independent. No high-availability cluster or public hosting is required. Test one-room hardware, paired/revoked endpoints, two-room arbitration, single-authority cutover and restore: T-06, T-12, T-22–T-24, T-32 and T-34.

Sources: [Home Assistant installation](https://www.home-assistant.io/installation/), [Docker Compose](https://docs.docker.com/compose/). Details: [hardware](../architecture/hardware.md), [deployment](../architecture/deployment.md).
