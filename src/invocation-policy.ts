import type { ToolManifestV1 } from "./manifest.js";

export interface ToolInvocationContext {
  readonly grantedScopes: readonly string[];
  readonly approvalGranted: boolean;
  readonly trustedContextPresent: boolean;
}

export type ToolInvocationDecision =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: "missing_trusted_context" | "missing_scope" | "approval_required" | "manifest_invalid" };

/**
 * Minimal fail-closed preflight only. The caller must authenticate the context and enforce
 * resource-level policy independently; strings in this object are not proof of identity.
 */
export function preflightToolInvocation(
  manifest: ToolManifestV1,
  context: ToolInvocationContext,
  manifestValid: boolean
): ToolInvocationDecision {
  if (!manifestValid) return { allowed: false, reason: "manifest_invalid" };
  if (context.trustedContextPresent !== true) return { allowed: false, reason: "missing_trusted_context" };
  if (manifest.permissionScopes.some(scope => !context.grantedScopes.includes(scope))) {
    return { allowed: false, reason: "missing_scope" };
  }
  if (manifest.requiresApproval && context.approvalGranted !== true) {
    return { allowed: false, reason: "approval_required" };
  }
  return { allowed: true };
}
