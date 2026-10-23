# Architecture: aether-ai-tools

**Status:** proposed design, not implemented.

## Role in the system

The tool registry is the policy-enforced execution boundary between agent intent and external side effects. The tool contract declares capabilities and requirements; it never treats model output or a remote tool description as authority.

## Dependencies

Direct dependencies are `aether-ai-security` for policy/security contracts and `aether-ai-observability` for bounded, redacted audit/telemetry interfaces. The core Tools contract is protocol-neutral and must not depend on or import `aether-ai-mcp`.

MCP adapters consume the public tool manifest/invocation contract and are registered by a composition root after allowlist and policy checks. Tools owns authorization, risk checks, and the execution policy boundary; MCP owns protocol transport and adaptation. This direction prevents a Tools ↔ MCP dependency cycle.

## Tool manifest and invocation rules

Each registered tool must declare a stable name/version, input/output schema, permission scopes, risk class, side-effect classification, execution timeout, output byte cap, resource/network/filesystem requirements, approval policy, idempotency/retry semantics, and audit attributes. Tool-specific schemas and limits must constrain nested arguments and results; a generic object shape alone is insufficient.

A manifest declares requirements; it does not grant those permissions. At execution time, validate the invocation, resolve principal and tenant scope from trusted server-side context, reauthorize the current operation and target resource, enforce approval binding where required, and only then dispatch.

## Data and control flow

1. An authenticated caller or authorized agent requests a tool invocation using the versioned public envelope.
2. The registry validates version, tool ID, argument schema, payload bounds, declared scopes, and side-effect policy; unknown or unsupported capabilities fail closed.
3. The security contract evaluates current principal, tenant/workspace, resource, requested action, and policy version. Tenant or role values in client/model/remote-tool data are not trusted grants.
4. For network/file/process tools, an external supervisor or equivalent approved isolation boundary enforces least privilege, egress allowlists, time/resource bounds and cleanup. A tool must never silently fall back to unsandboxed execution.
5. If a high-impact action requires approval, approval is bound to the canonical invocation/action details and current policy. Changed arguments or expired/revoked authorization require re-evaluation.
6. Dispatch occurs with only narrowly scoped credentials needed for this invocation. No ambient host credentials, general service tokens, container-runtime sockets or broad host mounts are exposed to an untrusted tool.
7. Validate, bound and redact the tool result before it enters the agent/model context. Emit correlated audit metadata without raw secrets or unrestricted payload dumps.
8. Retries and repeated invocations follow the declared side-effect/idempotency contract. An uncertain external effect is not blindly replayed.

## Boundary rules

- No circular imports or runtime dependency on downstream consumers.
- Cross-repository communication uses versioned HTTP/OpenAPI, typed package contracts or documented event envelopes; never read another service's private tables or import private source.
- Tool arguments and results, model output, uploaded files, external connector output and MCP metadata are untrusted.
- Reauthorize immediately before sensitive execution and again before subsequent side effects if relevant state may have changed.
- Network egress is deny-by-default. Validate resolved IPv4/IPv6 addresses and each redirect/connection; block loopback, link-local, private and metadata ranges unless a specific exception is reviewed.
- Failure to establish authorization, sandboxing, output bounds or egress restrictions must fail closed.
- ADR-0021 remains unresolved; this contract does not create a separate tenant-membership or role-grant authority.
- These are design requirements, not a claim that runtime controls already exist.

## Proposed deployment shape

Build a small, testable library/module around the public manifest and invocation contracts before deciding if it needs a separate runtime service. Select the sandbox, container/network boundary and deployment topology through documented ADRs with measured evidence; no sandbox technology is selected here.

## Failure behavior

Define and test malformed/oversized arguments, unknown tool versions, missing capabilities, stale/revoked authorization, approval mismatch, sandbox setup failure, network/SSRF denial, DNS rebinding, unsafe redirect, path traversal, timeout/cancellation, output overflow, secret redaction, duplicate invocation, uncertain side effects, and audit delivery failure.

## Diagrams

The master end-to-end component graph lives in [the repository catalog](https://github.com/Monupatel62/aether-ai-platform/blob/main/docs/REPOSITORY_CATALOG.md). Keep it synchronized when a dependency or ownership decision changes.
