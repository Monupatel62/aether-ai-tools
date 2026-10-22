# Security Review Checklist — aether-ai-tools

**Status:** design-stage checklist; not evidence of implemented controls. This file must be updated alongside code and tests.

## Trust boundary

Tool execution boundary

## Main threat scenarios

A tool can read sensitive files, call internal networks, change repositories, or send data externally. Model intent is not trusted authority.

## Required controls

Every tool declares schema, scopes, side effects, risk, timeout, output cap, and approval requirement. Reauthorize immediately before execution. Apply filesystem/network sandboxing, SSRF/path-traversal controls, output redaction, audit events, and idempotency where possible.

## Verification checklist

- [ ] Threat scenarios mapped to tests and acceptance criteria.
- [ ] Unauthorized and cross-tenant operations fail closed.
- [ ] Malformed/oversized input and output are rejected or bounded.
- [ ] Timeouts, retries, cancellation, and duplicate side effects are tested.
- [ ] Secrets and sensitive content are absent from default logs/traces.
- [ ] Dependency versions, license terms, and known vulnerabilities are reviewed.
- [ ] High-impact actions have explicit approval/policy requirements.
- [ ] Operational response and rollback are documented before production use.

## Project-wide reference

Read the [Aether AI security threat model](https://github.com/Monupatel62/aether-ai-platform/blob/main/docs/SECURITY_THREAT_MODEL.md) and [architecture audit](https://github.com/Monupatel62/aether-ai-platform/blob/main/docs/ARCHITECTURE_AUDIT.md). Use the current [OWASP GenAI Top 10 project](https://owasp.github.io/www-project-top-10-for-large-language-model-applications/) and verify the 2026 edition against the canonical publication. Do not treat prompts, tool descriptions, or UI confirmations as authorization controls.

## Change log

- 2026-10-22: Initial design-stage threat checklist added. No application code or security controls are claimed to be implemented.
