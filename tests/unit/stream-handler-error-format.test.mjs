import test from "node:test";
import assert from "node:assert/strict";

import { createDisconnectAwareStream, createStreamController } from "../../open-sse/utils/streamHandler.ts";
import { FORMATS } from "../../open-sse/translator/formats.ts";

function createFailingTransform(error) {
  return {
    readable: new ReadableStream({
      pull() {
        throw error;
      },
    }),
    writable: {
      getWriter() {
        return {
          abort() {},
        };
      },
    },
  };
}

async function readAll(stream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(decoder.decode(value));
  }

  return chunks;
}

test("mid-stream error stays in Responses format", async () => {
  const error = Object.assign(new Error("terminated"), { statusCode: 500 });
  const streamController = createStreamController({ sourceFormat: FORMATS.OPENAI_RESPONSES });

  const stream = createDisconnectAwareStream(createFailingTransform(error), streamController);
  const chunks = await readAll(stream);

  assert.equal(chunks.length, 2);
  assert.match(chunks[0], /^event: error\ndata: /);

  const payload = JSON.parse(chunks[0].split("data: ")[1]);
  assert.deepEqual(payload, {
    type: "error",
    error: {
      code: "500",
      message: "terminated",
    },
  });
  assert.equal(chunks[1], "data: [DONE]\n\n");
});

test("mid-stream error stays in chat chunk format for OpenAI", async () => {
  const error = Object.assign(new Error("terminated"), { statusCode: 500 });
  const streamController = createStreamController({ sourceFormat: FORMATS.OPENAI });

  const stream = createDisconnectAwareStream(createFailingTransform(error), streamController);
  const chunks = await readAll(stream);

  assert.equal(chunks.length, 2);
  const payload = JSON.parse(chunks[0].replace(/^data: /, ""));
  assert.equal(payload.object, "chat.completion.chunk");
  assert.equal(payload.choices[0].finish_reason, "error");
  assert.equal(payload.error.type, "upstream_error");
  assert.equal(payload.error.code, 500);
  assert.equal(payload.error.message, "terminated");
  assert.equal(chunks[1], "data: [DONE]\n\n");
});
