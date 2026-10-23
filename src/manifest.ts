export type ToolRiskClass = "low" | "medium" | "high" | "critical";

export interface ToolManifestV1 {
  readonly schemaVersion: "1";
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly riskClass: ToolRiskClass;
  readonly inputSchema: Readonly<Record<string, unknown>>;
  readonly outputSchema: Readonly<Record<string, unknown>>;
  readonly permissionScopes: readonly string[];
  readonly sideEffects: boolean;
  readonly idempotent: boolean;
  readonly requiresApproval: boolean;
  readonly timeoutMs: number;
  readonly maxOutputBytes: number;
}

export type ToolManifestIssueCode =
  | "unsupported_schema"
  | "invalid_name"
  | "invalid_version"
  | "invalid_description"
  | "invalid_risk_class"
  | "invalid_schema"
  | "invalid_scope"
  | "duplicate_scope"
  | "invalid_timeout"
  | "invalid_output_limit"
  | "side_effect_requires_idempotency"
  | "high_risk_requires_approval";

export interface ToolManifestIssue {
  readonly code: ToolManifestIssueCode;
  readonly path: string;
}

/** Validates manifest metadata only; it does not execute tools or provide authorization. */
export function validateToolManifest(manifest: ToolManifestV1): readonly ToolManifestIssue[] {
  const issues: ToolManifestIssue[] = [];
  if (manifest.schemaVersion !== "1") issues.push({ code: "unsupported_schema", path: "/schemaVersion" });
  if (!/^[a-z][a-z0-9._-]{0,95}$/.test(manifest.name)) issues.push({ code: "invalid_name", path: "/name" });
  if (!/^[0-9]+\.[0-9]+\.[0-9]+(?:-[a-zA-Z0-9.-]+)?$/.test(manifest.version)) issues.push({ code: "invalid_version", path: "/version" });
  if (typeof manifest.description !== "string" || manifest.description.trim().length < 1 || manifest.description.length > 500) {
    issues.push({ code: "invalid_description", path: "/description" });
  }
  if (!["low", "medium", "high", "critical"].includes(manifest.riskClass)) {
    issues.push({ code: "invalid_risk_class", path: "/riskClass" });
  }
  if (manifest.inputSchema === null || typeof manifest.inputSchema !== "object" || Array.isArray(manifest.inputSchema) ||
      manifest.outputSchema === null || typeof manifest.outputSchema !== "object" || Array.isArray(manifest.outputSchema)) {
    issues.push({ code: "invalid_schema", path: "/inputSchema" });
  }
  const seen = new Set<string>();
  manifest.permissionScopes.forEach((scope, index) => {
    if (!/^[a-z][a-z0-9._:-]{0,95}$/.test(scope)) issues.push({ code: "invalid_scope", path: `/permissionScopes/${index}` });
    if (seen.has(scope)) issues.push({ code: "duplicate_scope", path: `/permissionScopes/${index}` });
    seen.add(scope);
  });
  if (!Number.isInteger(manifest.timeoutMs) || manifest.timeoutMs < 1 || manifest.timeoutMs > 10 * 60 * 1000) {
    issues.push({ code: "invalid_timeout", path: "/timeoutMs" });
  }
  if (!Number.isInteger(manifest.maxOutputBytes) || manifest.maxOutputBytes < 1 || manifest.maxOutputBytes > 10 * 1024 * 1024) {
    issues.push({ code: "invalid_output_limit", path: "/maxOutputBytes" });
  }
  if (manifest.sideEffects && !manifest.idempotent) {
    issues.push({ code: "side_effect_requires_idempotency", path: "/idempotent" });
  }
  if ((manifest.riskClass === "high" || manifest.riskClass === "critical") && !manifest.requiresApproval) {
    issues.push({ code: "high_risk_requires_approval", path: "/requiresApproval" });
  }
  return issues;
}
