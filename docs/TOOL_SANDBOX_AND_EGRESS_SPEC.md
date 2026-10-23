# Tool Execution Isolation and Egress Control Specification

**Status:** Proposed security requirements; no runtime sandbox or network enforcement is claimed to exist.
**Scope:** Tool execution initiated through Aether AI tool contracts.
**Decision boundary:** This document defines minimum controls and testable outcomes. It does not select a sandbox runtime, cloud, container engine, or network architecture.

## 1. Security invariants

1. Model output, tool descriptions, user content, and remote tool results are untrusted input; none grants authority.
2. Every invocation is authorized for the current principal, tenant/workspace, resource, tool, and requested side effects immediately before execution.
3. A tool receives only the minimum filesystem, network, credential, and execution privileges required for that invocation.
4. Network egress is denied by default. An allowlist entry must be explicit, scoped, reviewable, and auditable.
5. Tool execution must not inherit ambient host credentials, cloud metadata credentials, container-engine sockets, or unrestricted host mounts.
6. Timeout, output limit, cancellation, and resource limit enforcement must be performed outside the untrusted tool process.
7. If policy, authorization, sandbox creation, or egress enforcement cannot be confirmed, execution fails closed.

## 2. Required isolation profile

Before implementation approval, choose and document a supported isolation mechanism and threat model. Evaluate at least:
- Separate ephemeral execution environment per invocation or per explicitly justified trust group.
- Non-root identity, dropped Linux capabilities, seccomp/AppArmor or equivalent, and no privileged mode.
- Read-only root filesystem; narrowly scoped, ephemeral writable scratch space; no host filesystem mounts by default.
- CPU, memory, process-count, file-size, disk, and wall-clock limits.
- No container-runtime socket or host namespace access.
- Clean teardown after completion, timeout, cancellation, or failure.
- Image/artifact provenance, vulnerability scanning, and controlled patch/rebuild policy.

gVisor, microVMs, and restricted container namespaces are candidates for evaluation, not preselected requirements. The selected mechanism must be justified against the tool's threat class and deployment environment.

## 3. Network and SSRF policy

- Deny all outbound traffic by default, including direct IP access, arbitrary DNS, and redirects.
- Allow only explicitly configured destinations and ports; bind policy to the invocation/tool identity.
- Block loopback, link-local, private, multicast, reserved, and cloud metadata ranges unless a narrowly reviewed use case explicitly requires them.
- Resolve DNS and validate every resolved address at connection time; defend against DNS rebinding and IPv4/IPv6 alternate encodings.
- Revalidate redirect targets and every new connection; never allow a public URL to redirect into a prohibited range.
- Prohibit access to control-plane endpoints, secret stores, internal admin services, and the host network from ordinary tool sandboxes.
- Record policy decisions without logging credentials, authorization headers, or sensitive payloads.

A domain allowlist alone is insufficient if DNS resolution, IP ranges, redirects, or alternate protocols can bypass it.

## 4. Invocation lifecycle and authority

1. Validate the invocation envelope and tool argument schema; reject unknown or oversized fields.
2. Resolve identity and tenant context from trusted server-side state, not client-supplied tenant selectors.
3. Check current resource permission and tool-specific scopes.
4. Evaluate risk, side effects, and approval requirements.
5. Create an isolated execution environment and apply egress policy before providing input.
6. Pass short-lived, narrowly scoped credentials only when required; never inject general service credentials.
7. Enforce deadlines and output bounds; treat output as untrusted and redact secrets before logging or returning it.
8. Re-authorize before any follow-on side effect and make retries/idempotency explicit.
9. Terminate the environment and revoke temporary credentials on every exit path.

## 5. Acceptance test matrix

| ID | Scenario | Required result |
|---|---|---|
| TOOL-ISO-001 | Tool attempts to read an undeclared host path | Denied; no host data returned |
| TOOL-ISO-002 | Tool attempts to access container runtime socket or host namespace | Resource unavailable; invocation cannot escalate |
| TOOL-EGR-001 | Tool connects to an unapproved external host | Connection blocked and policy event recorded |
| TOOL-EGR-002 | Tool targets loopback, RFC1918, link-local, or cloud metadata IP | Blocked before response data is exposed |
| TOOL-EGR-003 | Approved public URL redirects to private/link-local address | Redirect blocked after target revalidation |
| TOOL-EGR-004 | DNS answer changes from public address to prohibited address | Connection blocked; no bypass |
| TOOL-AUTH-001 | Membership is revoked after queueing but before execution | Current authorization check denies execution |
| TOOL-AUTH-002 | Client forges tenant/workspace ID in tool arguments | Forged value grants no access |
| TOOL-LIM-001 | Tool exceeds wall-clock or memory budget | External supervisor terminates execution |
| TOOL-LIM-002 | Tool emits output beyond configured cap | Output is bounded; execution follows documented termination policy |
| TOOL-SEC-001 | Tool attempts to read environment variables containing unrelated secrets | No unrelated secrets are present in the execution environment |
| TOOL-SEC-002 | Sandbox setup or egress enforcement is unavailable | Invocation fails closed; no unsandboxed fallback |
| TOOL-LIFE-001 | Invocation times out or is cancelled | Environment and temporary credentials are cleaned up |
| TOOL-LOG-001 | Tool outputs credential-like strings or sensitive content | Default logs/traces redact sensitive values |

Each test must record the fixture, environment/runtime version, expected policy result, observed result, and evidence artifact. These are proposed tests and have not been executed.

## 6. Required operational evidence before release

- Threat model and sandbox-runtime decision approved.
- Egress policy implementation and deployment configuration reviewed.
- Negative tests run in the target environment, including IPv4, IPv6, DNS rebinding, redirects, and metadata access.
- Isolation escape and privilege-escalation testing reviewed by security.
- Metrics for denied egress, sandbox setup failures, timeouts, forced terminations, and policy bypass attempts.
- Incident response, emergency disable, artifact patching, and rollback procedures documented.
- No claim of production enforcement until deployment configuration and test evidence are attached to the release review.

## 7. Related contracts and decisions

Coordinate with the platform security threat model, MCP remote-server policy, authorization-context trust profile, tool invocation schema, and queue execution contract. Do not infer canonical tenant-membership ownership from this document; ADR-0021 remains unresolved.
