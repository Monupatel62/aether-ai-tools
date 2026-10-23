# aether-ai-tools

**Status:** Initial guarded tool registry/execution core implemented on a feature branch. Production readiness is not claimed.

## Implemented

- [Tool execution source](src/index.js): registration, explicit authorization before execution, high-risk approval callback, input/output size limits, timeout/abort support, output validation, and safe generic errors.
- [Unit tests](test/tools.test.js): denied requests, malformed input, approval gates, oversized input/output, timeout, and raw-error suppression.
- Dependency-free Node.js package with Node 20/22 CI.

## Security limitations

- Authorization and approval are injected trusted callbacks; this package does not implement an approval UI, signed approval grants, or policy storage.
- Tool-specific input/output validators must enforce complete schemas. A generic validator cannot make arbitrary tool arguments safe.
- Executors must re-check authorization at sensitive side-effect boundaries and must honor the provided abort signal. A timeout cannot undo a side effect already performed.
- No MCP/plugin transport or external tool adapter is included yet.

## Documentation

- [Repository specification](docs/REPOSITORY_SPECIFICATION.md)
- [Project specification](docs/PROJECT_SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Dependencies and contracts](docs/DEPENDENCIES_AND_CONTRACTS.md)
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [Security review](docs/SECURITY_REVIEW.md)
- [Master catalog](https://github.com/Monupatel62/aether-ai-platform/blob/main/docs/REPOSITORY_CATALOG.md)
