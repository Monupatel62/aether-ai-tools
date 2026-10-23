# aether-ai-tools

> **Status: Initial tool-manifest validator and fail-closed preflight are in review.** No tool executor, sandbox, network boundary, or production deployment is implemented.

## Purpose

Small, permissioned tools available to agents, with explicit schemas, scopes, limits, and audit events.

## Responsibility boundary

Tool registry and execution boundary; dangerous actions require policy and, where appropriate, human approval.

## Dependencies

aether-ai-security and aether-ai-observability; MCP-backed tools register through the public tool contract.

## Project rules

- No implementation starts until the documentation and cross-repository contracts are reviewed.
- Do not commit secrets, API keys, user data, or production credentials.
- Public interfaces, security decisions, and non-obvious implementation choices must be documented.

## Initial implementation

The draft package validates tool manifest metadata, scope declarations, time/output limits, approval requirements for high/critical risk, and idempotency declarations for side-effecting tools. Its preflight checks manifest validity, trusted-context presence, granted scopes, and approval status. It is not an authorization engine: callers must establish trusted identity and enforce resource-level policy. No tool execution or sandbox is implemented.

## Documentation

- [Project specification](docs/PROJECT_SPEC.md)
- [Architecture and connections](docs/ARCHITECTURE.md)
- [Dependencies and contracts](docs/DEPENDENCIES_AND_CONTRACTS.md)
- [Implementation plan and acceptance criteria](docs/IMPLEMENTATION_PLAN.md)
- [Research and license notes](docs/RESEARCH_AND_LICENSES.md)
- [Repository-specific technical design and test plan](docs/TECHNICAL_DESIGN.md)
- [Repository-specific security review checklist](docs/SECURITY_REVIEW.md)
- [Engineering and commenting standard](docs/ENGINEERING_STANDARD.md)
- [Work log and decisions](docs/WORKLOG.md)
- [Master 33-repository catalog](https://github.com/Monupatel62/aether-ai-platform/blob/main/docs/REPOSITORY_CATALOG.md)
- [Continuity handoff for new chats](https://github.com/Monupatel62/aether-ai-platform/blob/main/docs/WORK_HANDOFF.md)

## Before coding

Read the project specification, architecture, contracts, implementation plan, and work log. Update the docs in the same change whenever behavior, an API contract, a dependency, or a security boundary changes.
