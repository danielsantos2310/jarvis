# Primary source register

Research date: **2026-09-16**. These sources support technical capabilities and security principles. Product goals, architecture choices, numerical targets and retention defaults are JARVIS proposals; the references do not constitute benchmark evidence or certification. Recheck version-specific behavior during implementation.

| ID | Primary reference | Application and limitation |
| --- | --- | --- |
| SRC-01 | [OWASP AI Agent Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html) | Narrow tool privileges, independent authorization and agent threat modeling; does not prove a particular implementation safe |
| SRC-02 | [OWASP LLM Prompt Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html) | Untrusted content and layered controls; prompts alone are not a security boundary |
| SRC-03 | [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) | Password hashing selection, including Argon2id; library and operating parameters still require implementation review |
| SRC-04 | [Home Assistant installation](https://www.home-assistant.io/installation/) | HA OS versus Container; Container lacks the OS app-management experience |
| SRC-05 | [Home Assistant fully local voice assistant](https://www.home-assistant.io/voice_control/voice_remote_local_assistant/) | Local speech recognition/synthesis pipeline options; not a JARVIS latency guarantee |
| SRC-06 | [Home Assistant Wyoming integration](https://www.home-assistant.io/integrations/wyoming/) | Voice-service interoperability; deployment must supply appropriate network security |
| SRC-07 | [Home Assistant authentication API](https://developers.home-assistant.io/docs/auth_api/) | Supported authentication/token mechanisms; do not assume arbitrary entity-specific token permissions |
| SRC-08 | [Home Assistant WebSocket API](https://developers.home-assistant.io/docs/api/websocket/) | Authenticated events and service API integration; JARVIS adds its own action restrictions |
| SRC-09 | [ESPHome LD2410](https://esphome.io/components/sensor/ld2410/) | Sensor variants and UART integration; occupancy is not identity |
| SRC-10 | [ESPHome BLE presence](https://esphome.io/components/binary_sensor/ble_presence/) | Device-presence mechanisms; actual phone behavior and room ambiguity require testing |
| SRC-11 | [ESPHome native API](https://esphome.io/components/api/) | Native API encryption and device connection settings; configure keys explicitly |
| SRC-12 | [OASIS MQTT 5.0 specification](https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html) | Message delivery/retention/expiry semantics; transport QoS is not exactly-once physical action |
| SRC-13 | [Mosquitto authentication methods](https://mosquitto.org/documentation/authentication-methods/) | Client authentication and topic access controls; secure configuration is still required |
| SRC-14 | [SQLite appropriate uses](https://www.sqlite.org/whentouse.html) | Embedded deployment and single-writer limitation; workload must be measured |
| SRC-15 | [SQLite online backup API](https://www.sqlite.org/backup.html) | Consistent database snapshot mechanism; does not replace encryption or restore validation |
| SRC-16 | [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting) | Local Node/container deployment; no mandatory hosted frontend service |
| SRC-17 | [Node.js release policy](https://nodejs.org/en/about/previous-releases) | Supported runtime-line selection; exact version pinned later |
| SRC-18 | [Fastify validation and serialization](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/) | Schema-driven API boundaries; schemas must be trusted application artifacts |
| SRC-19 | [JSON Schema overview](https://json-schema.org/overview/what-is-jsonschema) | Structured payload validation; authorization remains a separate control |
| SRC-20 | [whisper.cpp upstream](https://github.com/ggml-org/whisper.cpp) | Candidate local speech runtime; hardware/language performance requires benchmarks |
| SRC-21 | [Piper upstream](https://github.com/OHF-Voice/piper1-gpl) | Current local TTS project and runtime license; each selected voice needs its own review |
| SRC-22 | [llama.cpp upstream](https://github.com/ggml-org/llama.cpp) | Candidate local LLM runtime; does not select a model or authorize tools |
| SRC-23 | [W3C Media Capture and Streams](https://www.w3.org/TR/mediacapture-streams/) | Browser capture permissions and secure-context requirements; browser/OS behavior still tested |
| SRC-24 | [Tauri capabilities](https://v2.tauri.app/security/capabilities/) | Capability-limited desktop IPC if a native shell is introduced |
| SRC-25 | [Docker Compose documentation](https://docs.docker.com/compose/) | Multi-service local deployment; not host hardening or secret-at-rest protection |
| SRC-26 | [Tailscale access-control documentation](https://tailscale.com/kb/1018/acls) | Optional private-network access controls; application auth and provider-dependency review still required |

## Evidence conventions

Link a source beside claims whose correctness depends on an external technology. When an official document changes, update the relevant design assumption and ADR if needed. Do not cite this register as evidence that runtime tests passed. No source author is represented as endorsing JARVIS.

Repository/user facts are grounded in the existing repository and this project's stated requirements. Previous architectural suggestions are treated as proposals, not accepted decisions. Hardware budgets, purchase prices, personal schedules and household details are intentionally not invented.
