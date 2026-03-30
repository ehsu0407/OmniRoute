import test from "node:test";
import assert from "node:assert/strict";

const { CodexExecutor } = await import("../../open-sse/executors/codex.ts");

test("Codex native responses passthrough normalizes string input and strips max_output_tokens", () => {
  const executor = new CodexExecutor();
  const body = {
    model: "gpt-5.3-codex",
    input: "hello",
    max_output_tokens: 16,
    _nativeCodexPassthrough: true,
  };

  const result = executor.transformRequest("gpt-5.3-codex", body, true, {
    requestEndpointPath: "/v1/responses",
  });

  assert.equal(result.store, false);
  assert.equal(result.stream, true);
  assert.equal("max_output_tokens" in result, false);
  assert.deepEqual(result.input, [
    {
      type: "message",
      role: "user",
      content: [{ type: "input_text", text: "hello" }],
    },
  ]);
});

test("Codex native responses passthrough wraps object input in a list", () => {
  const executor = new CodexExecutor();
  const body = {
    model: "gpt-5.3-codex",
    input: { role: "user", content: [{ type: "input_text", text: "hello" }] },
    _nativeCodexPassthrough: true,
  };

  const result = executor.transformRequest("gpt-5.3-codex", body, true, {
    requestEndpointPath: "/v1/responses",
  });

  assert.deepEqual(result.input, [
    {
      type: "message",
      role: "user",
      content: [{ type: "input_text", text: "hello" }],
    },
  ]);
});
