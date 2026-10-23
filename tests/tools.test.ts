import { describe, expect, it } from "vitest";
import { preflightToolInvocation, validateToolManifest } from "../src/index.js";
import type { ToolManifestV1 } from "../src/index.js";

const manifest: ToolManifestV1 = {
  schemaVersion: "1",
  name: "calendar.read",
  version: "1.0.0",
  description: "Read calendar entries",
  riskClass: "low",
  inputSchema: { type: "object" },
  outputSchema: { type: "object" },
  permissionScopes: ["calendar.read"],
  sideEffects: false,
  idempotent: true,
  requiresApproval: false,
  timeoutMs: 5000,
  maxOutputBytes: 100_000
};

describe("tool manifest validation", () => {
  it("accepts a bounded low-risk manifest", () => {
    expect(validateToolManifest(manifest)).toEqual([]);
  });

  it("requires approval for high/critical tools and idempotency for side effects", () => {
    const invalid = { ...manifest, riskClass: "critical", requiresApproval: false, sideEffects: true, idempotent: false } as ToolManifestV1;
    const codes = validateToolManifest(invalid).map(issue => issue.code);
    expect(codes).toContain("high_risk_requires_approval");
    expect(codes).toContain("side_effect_requires_idempotency");
  });

  it("rejects duplicate or malformed permission scopes", () => {
    const invalid = { ...manifest, permissionScopes: ["calendar.read", "calendar.read", "Bad Scope"] };
    const codes = validateToolManifest(invalid).map(issue => issue.code);
    expect(codes).toContain("duplicate_scope");
    expect(codes).toContain("invalid_scope");
  });
});

describe("fail-closed tool invocation preflight", () => {
  it("requires trusted context, required scopes, and approval", () => {
    const protectedManifest = { ...manifest, riskClass: "high", requiresApproval: true } as ToolManifestV1;
    expect(preflightToolInvocation(protectedManifest, { grantedScopes: ["calendar.read"], approvalGranted: true, trustedContextPresent: false }))
      .toEqual({ allowed: false, reason: "missing_trusted_context" });
    expect(preflightToolInvocation(protectedManifest, { grantedScopes: [], approvalGranted: true, trustedContextPresent: true }))
      .toEqual({ allowed: false, reason: "missing_scope" });
    expect(preflightToolInvocation(protectedManifest, { grantedScopes: ["calendar.read"], approvalGranted: false, trustedContextPresent: true }))
      .toEqual({ allowed: false, reason: "approval_required" });
    expect(preflightToolInvocation(protectedManifest, { grantedScopes: ["calendar.read"], approvalGranted: true, trustedContextPresent: true }))
      .toEqual({ allowed: true });
  });

  it("never permits an invalid manifest", () => {
    const invalid = { ...manifest, timeoutMs: -1 } as ToolManifestV1;
    expect(preflightToolInvocation(invalid, { grantedScopes: ["calendar.read"], approvalGranted: true, trustedContextPresent: true }))
      .toEqual({ allowed: false, reason: "manifest_invalid" });
  });
});
