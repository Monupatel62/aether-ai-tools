import test from "node:test";
import assert from "node:assert/strict";
import { createToolRegistry, ToolExecutionError } from "../src/index.js";

const principal = { id: "user-1", tenantId: "tenant-a" };
const definition = { id: "notes.read", risk: "low", validateInput: (v) => v && typeof v.noteId === "string", validateOutput: (v) => v && typeof v.note === "string", execute: async (v) => ({ note: `note:${v.noteId}` }) };
function setup(overrides = {}) {
  const calls = [];
  const registry = createToolRegistry({ authorize: async (ctx) => { calls.push(ctx); return true; }, verifyApproval: async () => false, timeoutMs: 100, ...overrides });
  registry.register(definition);
  return { registry, calls };
}

test("validates, authorizes, and executes a registered tool", async () => {
  const { registry, calls } = setup();
  const result = await registry.execute({ principal, toolId: "notes.read", input: { noteId: "n-1" } });
  assert.deepEqual(result.output, { note: "note:n-1" });
  assert.equal(calls[0].action, "tool:execute");
});

test("fails closed for missing principal, unknown tool, and invalid input", async () => {
  const { registry } = setup();
  await assert.rejects(registry.execute({ toolId: "notes.read", input: { noteId: "n" } }), (e) => e.code === "unauthenticated");
  await assert.rejects(registry.execute({ principal, toolId: "unknown", input: {} }), (e) => e.code === "tool_not_found");
  await assert.rejects(registry.execute({ principal, toolId: "notes.read", input: {} }), (e) => e.code === "invalid_input");
});

test("denies when policy authorization fails", async () => {
  const { registry } = setup({ authorize: async () => false });
  await assert.rejects(registry.execute({ principal, toolId: "notes.read", input: { noteId: "n" } }), (e) => e.code === "forbidden");
});

test("requires approval for high-risk tools", async () => {
  const { registry } = setup({ verifyApproval: async ({ approval }) => approval === "approved" });
  registry.register({ ...definition, id: "system.change", risk: "high" });
  await assert.rejects(registry.execute({ principal, toolId: "system.change", input: { noteId: "n" } }), (e) => e.code === "approval_required");
  const result = await registry.execute({ principal, toolId: "system.change", input: { noteId: "n" }, approval: "approved" });
  assert.equal(result.output.note, "note:n");
});

test("enforces input/output size and execution timeout", async () => {
  const { registry } = setup({ maxInputBytes: 20, maxOutputBytes: 20 });
  await assert.rejects(registry.execute({ principal, toolId: "notes.read", input: { noteId: "n".repeat(100) } }), (e) => e.code === "input_too_large");
  const large = createToolRegistry({ authorize: async () => true, verifyApproval: async () => false, maxOutputBytes: 10 });
  large.register({ ...definition, id: "large", execute: async () => ({ note: "x".repeat(100) }) });
  await assert.rejects(large.execute({ principal, toolId: "large", input: { noteId: "n" } }), (e) => e.code === "output_too_large");
  const slow = createToolRegistry({ authorize: async () => true, verifyApproval: async () => false, timeoutMs: 10 });
  slow.register({ ...definition, id: "slow", execute: () => new Promise(() => {}) });
  await assert.rejects(slow.execute({ principal, toolId: "slow", input: { noteId: "n" } }), (e) => e.code === "timeout");
});

test("does not expose raw tool errors", async () => {
  const { registry } = setup();
  registry.register({ ...definition, id: "broken", execute: async () => { throw new Error("secret data"); } });
  await assert.rejects(registry.execute({ principal, toolId: "broken", input: { noteId: "n" } }), (e) => e.code === "execution_failed" && !e.message.includes("secret"));
});


test("rejects pre-aborted signals and promptly stops waiting on caller cancellation", async () => {
  const { registry } = setup();
  registry.register({ ...definition, id: "never", execute: () => new Promise(() => {}) });
  const already = new AbortController();
  already.abort();
  await assert.rejects(registry.execute({ principal, toolId: "never", input: { noteId: "n" }, signal: already.signal }), (e) => e.code === "aborted");

  const controller = new AbortController();
  const pending = registry.execute({ principal, toolId: "never", input: { noteId: "n" }, signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, (e) => e.code === "aborted");
});
