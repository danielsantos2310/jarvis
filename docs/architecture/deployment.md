# Deployment, operations and recovery strategy

Version 0.1 · Design only; no deployment performed.

## Deployment profiles

| Profile | Services and exposure | Dependency / limitation |
| --- | --- | --- |
| PC development | Local UI/core/database on loopback; synthetic data | Existing OS must be confirmed; PC sleep stops service |
| PC personal pilot | Authenticated local service, local speech workers and consented sources | Host microphone permissions; encryption and backup required |
| One-room LAN pilot | Authenticated HTTPS gateway, paired sensor/audio endpoint | Trusted certificates, firewall and guest privacy tests |
| Home hub | Linux host; Compose-managed core/UI/workers/executor; local durable volumes | Always-on operation, backup/restore and update ownership |
| Optional remote client | Private VPN to gateway | Separate app authentication; no public assistant endpoint |

The web application is served from the local core host or gateway; no public hosting service is required. Download packages/models during deliberate provisioning. Record hashes, cache installation assets as appropriate, then test strict-local operation with assistant WAN access denied.

## Home Assistant placement

If Home Assistant already exists, integrate through its supported APIs without replacing the installation. Otherwise choose Home Assistant OS in a VM/appliance for managed apps, or Home Assistant Container for a self-managed Linux deployment. HA Container does not include the HA OS app manager; separate speech/broker services must be operated explicitly. [Home Assistant installation types](https://www.home-assistant.io/installation/).

Proposed integrated hub profile uses HA Container plus separate services; HA OS VM is a supported alternative if simpler device/app management is preferred. Confirm networking, USB/radio access and resource allocation in M3/M6. Do not assume host networking, device passthrough or Bluetooth works identically on Windows, macOS and Linux.

## Network plan

| Path | Proposed transport | Exposure rule |
| --- | --- | --- |
| Personal client → gateway | HTTPS/WSS on 443 | Authenticated local LAN or private VPN only |
| Gateway → core/UI | Internal loopback/container network | Not directly exposed to LAN |
| Core → local AI worker | Local IPC or restricted internal service | No general LAN access; no WAN by default |
| Core/executor → Home Assistant | HTTPS/WSS or secured local private transport | Specific destination and service identity only |
| ESPHome sensor → HA/adapter | ESPHome native API encryption, normally TCP 6053 | Only selected ingestion host connects; unique key per node |
| MQTT devices → Mosquitto, if used | TLS on 8883 plus auth/ACL | No anonymous client, no plaintext 1883 LAN listener |
| Room audio → voice gateway | Authenticated encrypted stream | Separate bounded channel; no broadcast audio |
| Optional provider gateway → internet | HTTPS to allowlisted destinations | Consent and budget required; disabled in strict-local mode |

Port assignments are planning defaults, subject to compatibility validation. Discovery traffic such as mDNS is restricted to the provisioning need; do not bridge networks broadly for convenience. Certificates must be trusted by enrolled clients. Certificate expiry or revocation fails closed with recovery instructions.

## Service operations

Use least-privilege service accounts, read-only container roots where practical, explicit writable volumes, health checks, restart backoff, resource ceilings and fixed image digests. Avoid privileged containers and Docker-socket mounts. Microphone/speaker host access belongs in a minimal explicit agent or vetted device service, not the main core process. Compose coordinates services; it does not replace host hardening. [Docker Compose](https://docs.docker.com/compose/).

Expose local health: uptime, queue depth, model/provider state, disk free space, source freshness, backup age, clock health and certificate expiry. Use redacted logs with bounded retention. No remote analytics by default. A degraded speech service leaves text and manual controls available.

## Update and rollback

1. Review release notes, supported versions, dependencies and model/voice licenses.
2. Create and verify a consistent encrypted backup; record current app/schema/model versions.
3. Stage changes with synthetic or scrubbed fixtures, including migration and permission regression tests.
4. Stop new writes/automation for a bounded maintenance window and drain or cancel pending actions.
5. Apply versioned migrations and deploy pinned artifacts; run health, auth, scope and offline checks.
6. Resume only if checks pass. Otherwise roll back the application with a compatible schema, or restore the pre-migration snapshot in isolation.

Do not run an older binary against an incompatible migrated database. Avoid unattended permission/model behavior upgrades. Schema downgrades are not assumed reversible. Firmware updates require one-device canary testing before all rooms.

## Backup and disaster recovery

Target one encrypted daily backup plus weekly retention, with maximum 28-day snapshot age. RPO target ≤24 hours and tested RTO ≤2 hours. Keep the backup key and recovery instructions separately accessible; backups on the same disk alone do not protect against disk failure. Include core data, configuration, model/version inventory and deletion tombstones; exclude transient audio, expired sessions and default conversation buffers. Back up HA configuration under its own validated procedure.

Recovery drill: restore to an isolated host, validate checksums and schema, apply the current deletion journal maintained independently of snapshots, invalidate sessions and pending approvals, revalidate sensitive grants/integrations, verify private-data scopes, then enable devices gradually. If the current journal is missing, keep personal data unavailable pending reconciliation. Never replay queued actuator commands during recovery. Record start/end time and missing dependencies in the drill report.

## PC-to-hub migration

Export a consistent encrypted snapshot and version inventory from the PC; pause writes; restore and validate on the hub; transfer the single authority; re-pair clients to the authenticated hub endpoint; leave the PC in client-only mode. Prevent both installations from acting as leaders. If cutover fails, stop the hub before restoring PC authority. Keep the old encrypted snapshot until the successful recovery window ends.

## Availability limits

The hub is initially a single point of failure. There is no high-availability cluster in this plan. Manual device controls and existing HA safety behavior remain independent. Network partitions make satellites unavailable for assistant decisions; they retain only mute/status behavior and expire old commands. A UPS is optional and must be tested for safe shutdown, not advertised as continuous service.
