# Dependencies and contracts — aether-ai-tools

**Status:** proposed contract; no API implementation exists yet.

## Contract area

Tool manifest, invocation envelope, scopes, risk classification and audit event.

## Direct dependencies

- `aether-ai-security`: policy decisions and tool risk controls.
- `aether-ai-observability`: redacted tool lifecycle telemetry.

## Explicit non-dependency: MCP

`aether-ai-tools` MUST NOT import `aether-ai-mcp` or depend on its adapter implementation. The MCP adapter depends on this repository's versioned public tool manifest and invocation contracts. A composition root registers MCP-backed tools with the tool registry, preventing a package cycle and keeping policy enforcement inside the tool boundary.

## Required rules

Every tool declares input/output schema, permissions, side effects, timeout, maximum output, approval requirement, audit metadata, and whether retries are safe. MCP, plugin, and integration calls must enter through the same policy-enforced invocation path; adapters must not bypass tool authorization.

## Contract governance

- The [master catalog](https://github.com/Monupatel62/aether-ai-platform/blob/main/docs/REPOSITORY_CATALOG.md) and [dependency matrix](https://github.com/Monupatel62/aether-ai-platform/blob/main/docs/DEPENDENCY_MATRIX.md) define the canonical dependency direction.
- Public schemas must be versioned and compatibility-tested.
- Invocation envelopes must preserve correlation and principal/tenant context where applicable.
- No service may read another service's private tables or import downstream application internals.
- Breaking changes require a consumer inventory, migration notes, staged rollout/rollback plan, and updates to affected repository specs.
- Never expose provider credentials or raw sensitive upstream errors to browsers or ordinary logs.

## Review checklist

- [ ] Inputs, outputs, errors, payload limits, timeout and rate-limit behavior defined.
- [ ] Authentication, authorization, tenant boundary and approval policy defined.
- [ ] Retries, cancellation, duplicate requests, and side effects defined.
- [ ] Correlation IDs and redaction rules defined.
- [ ] Unit and contract tests planned.
- [ ] Direct and transitive dependency licenses checked before reuse.
