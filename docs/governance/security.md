# Security model and initial threat register

Version 0.1 · Applies from the first runnable milestone.

## Assets and trust boundaries

Protect personal information, credentials, device control, user attention, permission records, update integrity and availability. Treat external content, model output, network clients and IoT observations as untrusted. The trusted computing base contains the host OS, core policy/data services, reviewed executor and approved dependencies. A local installation is not automatically trustworthy just because traffic stays inside the house.

| Boundary | Main control |
| --- | --- |
| Browser → core | Application authentication, narrow origin/Host validation, CSRF defense, WebSocket origin/session checks, resource authorization |
| Core → AI workers | Minimal scoped payload; no integration tokens; restricted filesystem/network; typed output validation |
| Core → executor | Authenticated short-lived action envelope, digest, policy version, target allowlist and idempotency record |
| IoT → ingestion | Per-device identity, encrypted transport, source/room binding, bounded payload and freshness |
| Core → provider | Dedicated egress gateway, approved destinations and consent; secret injection only at transport boundary |
| Admin → host | OS access control, encryption, security updates, recovery key handling and minimal service privilege |

## Threats, mitigations and evidence

| ID | Threat / consequence | Required mitigation | Test |
| --- | --- | --- | --- |
| TH-01 | Email/web/document prompt injection causes data theft or action | Treat content as data; scoped retrieval; no direct tool authority; egress allowlist | T-18, T-27 |
| TH-02 | Malicious browser page calls localhost service | Exact Origin/Host checks; anti-CSRF; authenticated state changes; reject DNS rebinding patterns | T-17, T-23 |
| TH-03 | Sensor/phone spoofing reveals personal information | Presence not authentication; guest-safe response; private channel required | T-05, T-28 |
| TH-04 | Stolen integration token controls home | Credential isolation; non-admin identity where supported; narrow executor allowlist; rotation | T-21, T-24 |
| TH-05 | Approval replay or target changes after review | One-use digest-bound approval, expiry and pre-dispatch version check | T-20 |
| TH-06 | Compromised widget accesses other user's state | Backend scope checks, no secrets in clients, trusted built-ins only | T-16, T-29 |
| TH-07 | Cross-room or cross-user memory disclosure | Owner/household filtering before retrieval, audience filtering before output | T-07, T-17, T-28 |
| TH-08 | Lost laptop or copied backup exposes data | Full-disk encryption, separately encrypted backups, protected keys and recovery procedure | T-32 |
| TH-09 | Malicious dependency or model artifact | Locked versions, provenance/checksum, license inventory, staged updates and dependency review | T-36 |
| TH-10 | Event flood or inference loop exhausts host/budget | Per-client rate/size limits, bounded queues, deadlines, circuit breakers and zero default cloud spend | T-35, T-37 |
| TH-11 | Stale MQTT message triggers an old action | Non-retained commands, expiry, deduplication, source sequence checks and state reconciliation | T-11, T-31 |
| TH-12 | Guest hears private TTS or microphone records unintentionally | Audience gate, clear activation/mute, session timeout, no default recording | T-04, T-25, T-28 |
| TH-13 | Restore resurrects grants or deleted private data | Reapply tombstones, invalidate approvals/sessions, require reconnection of sensitive integrations | T-26, T-32 |

Prompt injection cannot be solved by a stronger system prompt alone. Layered controls reduce what a compromised model response can cause. [OWASP Prompt Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html).

## Authentication and secret handling

M1 must select and test an established authentication library rather than invent cryptography. Baseline: local user accounts with Argon2id password hashes, rate limiting and secure server sessions; add passkeys if recovery and local-origin support are validated. Sensitive reauthentication and offline recovery must work without a cloud identity provider. See the primary [OWASP password storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

Loopback development still uses authentication and origin checks. Production LAN clients require HTTPS with certificates the clients trust. Use HttpOnly/SameSite session cookies and Secure on HTTPS; any loopback development exception is bound to loopback and cannot be promoted to LAN. Logout, account disable and grant revocation close active subscriptions. Pairing uses a physically/local-admin initiated short-lived code and verified device identity; radio proximity is not enrollment authorization.

Use OS-backed credential storage for desktop services; on the hub use restricted secret mounts or a suitable local secret store whose encryption key is outside the data volume. Compose secret mounts restrict delivery but do not themselves guarantee encryption at rest. Never place provider keys in frontend variables, Git, model prompts, raw audit payloads or reusable device images. Rotate/revoke leaked credentials and record affected integrations without copying the secret into a ticket.

## Network and host controls

Bind first development services to loopback. For LAN operation, expose only the authenticated gateway; keep database and model services on local/internal networks. ESPHome native API uses its supported encryption mechanism; MQTT clients use TLS plus client authentication and topic ACLs. These are distinct transports, not interchangeable claims of TLS. Sensor devices publish only their own observation topics and cannot subscribe to personal events.

Separate IoT from personal clients where the router supports it; otherwise a documented host firewall still limits access. Do not open inbound internet ports or enable automatic port forwarding. A private VPN may provide remote connectivity later; it does not replace application authentication or eliminate provider coordination dependencies.

Home Assistant credentials may have broader authority than an individual entity allowlist. Do not assume per-entity token scopes exist. The executor enforces the JARVIS allowlist, the token stays out of core/model/UI, and its residual compromise impact must be documented before enabling actions. Never expose a general Home Assistant service-call tool to the model.

## Failure and incident response

If authentication, policy, clock validity or required audit persistence fails, block new writes and sensitive reads. Show a recoverable local error. Separate “mute microphone,” “pause proactive notifications” and “stop all automated actions”; provide a single emergency stop that enables all three. Physical device controls remain independent.

On suspected compromise: stop automation and egress; isolate affected endpoint; preserve redacted audit metadata; revoke sessions/device identities/provider tokens; inspect dependency and configuration changes; restore from a verified backup in isolation; re-pair affected devices and reapprove grants. Do not silently reset or delete user data as a troubleshooting shortcut.

Residual risks include root compromise, malicious household administrators, physical tampering, undetected microphone hardware failure, acoustic ambiguity and overly broad third-party API credentials. These limits must remain visible in reviews. A security control is “implemented” only after its linked evidence exists.
