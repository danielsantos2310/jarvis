# Security

JARVIS has an initial loopback-only local PC alpha. Automated tests cover selected authentication, authorization and privacy boundaries; this is not an independent security audit or a completed personal/home pilot. No release is suitable for safety-critical systems.

Read the [security model](docs/governance/security.md), [AI permissions](docs/governance/ai-permissions.md) and [privacy model](docs/governance/privacy.md) before proposing integrations or action capabilities.

For a suspected vulnerability, avoid public issues containing exploit details, personal data or credentials. Use GitHub's private vulnerability reporting if the repository owner has enabled it; otherwise request a private reporting channel from the owner through an existing contact. No dedicated security mailbox or response SLA is claimed.

Reports should include affected version/commit, boundary violated, sanitized reproduction steps, expected versus actual outcome and possible impact. Do not include live access tokens or household recordings. For an active deployment, pause automation and isolate the affected endpoint before investigating.
