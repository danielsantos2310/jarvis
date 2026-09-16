# Proposed software stack

Version 0.1 · Candidate baseline, not an installed dependency list.

## Selection table

| Layer | Proposed choice | Why / alternatives | Decision gate |
| --- | --- | --- | --- |
| Main language | TypeScript | Shared domain types across core and dashboard; Python reserved for a provider that requires it | M0 review |
| Runtime/package manager | Supported Node.js LTS and pnpm | Pin compatible supported versions at M1; avoid floating latest | M1 setup |
| Dashboard | React + Next.js | Keeps earlier dashboard direction; can self-host locally; a React/Vite SPA is a simpler alternative if SSR adds no value | ADR-0002 |
| Core API | Fastify, TypeScript | Separate authority from UI framework; JSON Schema validation; alternatives must preserve boundary | M1 contract spike |
| Schema/API | JSON Schema + OpenAPI | Runtime validation plus generated/shared types; no duplicate hand-maintained policy schemas | M1 |
| Database | SQLite on local disk | Low operations cost for one core writer; PostgreSQL if measured write contention justifies it | ADR-0003 |
| DB access | Typed SQL repository layer and explicit migrations | Driver/query builder selected after Node/OS compatibility check; preserve transactions and parameterized queries | M1 |
| Scheduling | Core scheduler + durable local records | No Redis or distributed queue needed initially | M1 |
| Local STT | whisper.cpp candidate | Local inference; compare language accuracy/latency on actual PC | M2 |
| Local TTS | Piper candidate | Local voices; each voice artifact has separate license/quality considerations | M2 license gate |
| Local LLM | llama.cpp candidate | Provider-independent local runtime; selected model/quantization remain open | M2 optional free-form path |
| Wake detection | Optional local detector; implementation open | Do not assume an English detector supports Portuguese or a custom phrase | M2 experiment |
| Voice interoperability | Wyoming adapter where useful | Existing local voice ecosystem; authenticated transport boundary needed | M2/M6 |
| Home automation | Home Assistant | Device abstraction rather than custom drivers per brand | M3 reads; M5 writes |
| Room firmware | ESPHome | Supported device components; pin board and firmware versions | M3 |
| Device broker | Eclipse Mosquitto | MQTT boundary only when devices need it; auth + ACL + TLS | M3 optional |
| Desktop packaging | Tauri + Rust, later | OS integration only if browser is insufficient; capability-limited IPC | Separate ADR |
| Deployment | Linux + Docker Compose for hub | One-home operations; no Kubernetes requirement | M6 |
| Testing | Vitest, Playwright, contract and hardware suites | Candidate tooling selected/pinned with implementation | M1 |
| Telemetry | Local structured redacted logs and metrics | No external analytics by default; optional OpenTelemetry later | M1 |
| Remote access | Private VPN, Tailscale candidate | No public ports; service coordination and account dependencies disclosed | Post-local pilot |

## Deliberate simplifications

Earlier discussion included PostgreSQL/Supabase, Tauri and a dedicated server. This baseline defers them to avoid infrastructure before a useful local slice. SQLite supports a single writer at a time; a single-core writer design fits the initial workload, subject to measurement. Do not place the database on a shared network drive. [SQLite usage guidance](https://www.sqlite.org/whentouse.html).

Next.js can run on local Node/container infrastructure; Vercel is not required. Avoid remote fonts, CDN scripts and cloud-dependent image services in strict-local mode. Next server handlers do not become a second permission authority. [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting).

Tauri is optional. If adopted, narrow native capabilities to specific windows and commands; do not grant unrestricted filesystem or shell access to a webview. A desktop shell does not make remote content trustworthy. [Tauri capabilities](https://v2.tauri.app/security/capabilities/).

## Models and licensing

Runtime license, model-weight license and voice license are distinct. Record origin, exact version, checksum, license, redistribution conditions, intended language, quantization and minimum benchmark hardware for every artifact. Piper's current OHF project is GPL-licensed; that does not answer the license question for every voice or distribution scenario. Distribution is blocked until obligations are reviewed; process separation alone is not a blanket legal conclusion. [Piper upstream](https://github.com/OHF-Voice/piper1-gpl).

Do not label any selected model as reliable for tool execution just because it produces structured JSON. All output is schema-validated and policy-checked. An STT or LLM that misses latency targets can be changed behind its adapter without changing authorization semantics.

## Version policy

At M1 record OS, runtime, package manager and direct dependencies in lockfiles and a compatibility matrix. Pin container images by immutable digest for pilot releases and record model hashes. Review security advisories before upgrades, test migrations and retain rollback artifacts. The specification deliberately does not promise a future “latest” version. Use the official [Node release schedule](https://nodejs.org/en/about/previous-releases) to choose a supported line.

No package manifests, install scripts, Docker files, firmware, schemas or application code are created during M0.
