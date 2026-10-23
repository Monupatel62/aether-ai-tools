import { randomUUID } from "node:crypto";

const TOOL_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const RISKS = new Set(["low", "medium", "high"]);

export class ToolExecutionError extends Error {
  constructor(code, message = "Tool execution failed") { super(message); this.name = "ToolExecutionError"; this.code = code; }
}
function isRecord(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function validId(value, field) {
  if (typeof value !== "string" || !TOOL_ID.test(value) || value.trim() !== value) throw new TypeError(`Invalid ${field}`);
  return value;
}
function encodedSize(value) {
  try { return Buffer.byteLength(JSON.stringify(value)); }
  catch { throw new ToolExecutionError("invalid_input", "Tool input must be JSON-serializable"); }
}

export function createToolRegistry({ authorize, verifyApproval, timeoutMs = 15_000, maxInputBytes = 65_536, maxOutputBytes = 262_144 }) {
  if (typeof authorize !== "function") throw new TypeError("Authorization callback is required");
  if (typeof verifyApproval !== "function") throw new TypeError("Approval verifier callback is required");
  for (const [name, value] of Object.entries({ timeoutMs, maxInputBytes, maxOutputBytes })) {
    if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`${name} must be a positive integer`);
  }
  if (timeoutMs > 120_000 || maxInputBytes > 1_048_576 || maxOutputBytes > 4_194_304) throw new TypeError("Configured limits exceed the supported maximum");

  const tools = new Map();
  return Object.freeze({
    register(definition) {
      if (!isRecord(definition)) throw new TypeError("Tool definition must be an object");
      const id = validId(definition.id, "tool.id");
      if (tools.has(id)) throw new Error("Tool already registered");
      if (!RISKS.has(definition.risk)) throw new TypeError("Tool risk must be low, medium, or high");
      if (typeof definition.validateInput !== "function" || typeof definition.validateOutput !== "function" || typeof definition.execute !== "function") {
        throw new TypeError("Tool must provide input/output validators and an executor");
      }
      tools.set(id, Object.freeze({
        id, risk: definition.risk,
        validateInput: definition.validateInput,
        validateOutput: definition.validateOutput,
        execute: definition.execute,
      }));
      return this;
    },
    list() {
      return Object.freeze([...tools.values()].map(({ id, risk }) => Object.freeze({ id, risk })));
    },
    async execute({ principal, toolId, input, approval, signal } = {}) {
      if (!isRecord(principal) || typeof principal.id !== "string" || !principal.id || typeof principal.tenantId !== "string" || !principal.tenantId) {
        throw new ToolExecutionError("unauthenticated", "A trusted principal is required");
      }
      const id = validId(toolId, "toolId");
      const tool = tools.get(id);
      if (!tool) throw new ToolExecutionError("tool_not_found", "Tool is not registered");
      if (encodedSize(input) > maxInputBytes) throw new ToolExecutionError("input_too_large", "Tool input exceeds the configured limit");
      let valid = false;
      try { valid = tool.validateInput(input) === true; } catch { valid = false; }
      if (!valid) throw new ToolExecutionError("invalid_input", "Tool input is invalid");

      let allowed = false;
      try { allowed = (await authorize({ principal, toolId: id, action: "tool:execute", risk: tool.risk })) === true; }
      catch { throw new ToolExecutionError("authorization_unavailable", "Tool authorization could not be verified"); }
      if (!allowed) throw new ToolExecutionError("forbidden", "Tool execution is not authorized");

      if (tool.risk === "high") {
        let approved = false;
        try { approved = (await verifyApproval({ principal, toolId: id, input, approval })) === true; }
        catch { approved = false; }
        if (!approved) throw new ToolExecutionError("approval_required", "A valid approval is required");
      }

      if (signal?.aborted) throw new ToolExecutionError("aborted", "Tool execution was cancelled");
      const controller = new AbortController();
      const onAbort = () => controller.abort(signal?.reason);
      signal?.addEventListener("abort", onAbort, { once: true });
      const requestId = randomUUID();
      let timeout;
      let timedOut = false;
      try {
        const timeoutPromise = new Promise((_, reject) => {
          controller.signal.addEventListener("abort", () => {
            reject(new ToolExecutionError(timedOut ? "timeout" : "aborted", timedOut ? "Tool execution timed out" : "Tool execution was cancelled"));
          }, { once: true });
          timeout = setTimeout(() => {
            timedOut = true;
            controller.abort();
          }, timeoutMs);
        });
        const operation = Promise.resolve().then(() => tool.execute(input, { principal, signal: controller.signal, requestId }));
        const output = await Promise.race([operation, timeoutPromise]);
        if (encodedSize(output) > maxOutputBytes) throw new ToolExecutionError("output_too_large", "Tool output exceeds the configured limit");
        let outputValid = false;
        try { outputValid = tool.validateOutput(output) === true; } catch { outputValid = false; }
        if (!outputValid) throw new ToolExecutionError("invalid_output", "Tool returned an invalid output");
        return Object.freeze({ requestId, toolId: id, output });
      } catch (error) {
        if (error instanceof ToolExecutionError) throw error;
        throw new ToolExecutionError("execution_failed", "Tool execution failed");
      } finally {
        clearTimeout(timeout);
        signal?.removeEventListener("abort", onAbort);
      }
    },
  });
}
