# Contributing to JARVIS

The project is in Milestone 0. The current task is documentation only; application work starts after explicit authorization and the M0 readiness gate.

Use focused branches and pull requests. Link requirements, tests and ADRs. Preserve accepted decisions or supersede them explicitly. Keep the README and [master specification](docs/MASTER_PROJECT_SPECIFICATION_v0.1.md) consistent with changes.

Do not commit credentials, real household recordings, personal calendars, sensor movement logs, model weights or database backups. Use synthetic fixtures. A private repository is not a credential store.

M0 changes are Markdown only. Later code changes must have meaningful validation for the changed behavior, including adverse paths where permissions or private data are involved. Do not add elaborate tests that simply mirror low-risk implementation details.

Use the [issue template](.github/ISSUE_TEMPLATE/milestone-task.md), [PR template](.github/pull_request_template.md) and [ADR template](docs/adr/0000-template.md). Owner acceptance and release approval are recorded by the actual reviewer, never inferred from an AI-produced draft.

No redistribution license has been selected. Do not add a license, publish the repository or distribute third-party models without the owner's decision and the relevant license review.
