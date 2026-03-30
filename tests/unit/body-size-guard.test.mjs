import test from "node:test";
import assert from "node:assert/strict";

const {
  MAX_BODY_BYTES,
  getBodySizeLimit,
  checkBodySize,
} = await import("../../src/shared/middleware/bodySizeGuard.ts");

test("default routes use the global body limit", () => {
  assert.equal(getBodySizeLimit("/api/v1/models"), MAX_BODY_BYTES);
  assert.equal(getBodySizeLimit("/api/v1/chat/completions"), MAX_BODY_BYTES);
  assert.equal(getBodySizeLimit("/api/v1/responses"), MAX_BODY_BYTES);
});

test("special upload routes keep their larger route-specific limits", () => {
  assert.equal(getBodySizeLimit("/api/db-backups/import"), 100 * 1024 * 1024);
  assert.equal(getBodySizeLimit("/api/v1/audio/transcriptions"), 100 * 1024 * 1024);
});

test("request just above the old 10 MB limit is accepted under the new global limit", () => {
  const request = new Request("https://example.com/v1/responses", {
    method: "POST",
    headers: {
      "content-length": String((10 * 1024 * 1024) + 1),
    },
  });

  const rejection = checkBodySize(request, getBodySizeLimit("/api/v1/responses"));
  assert.equal(rejection, null);
});

test("oversized request above the global limit still returns 413", async () => {
  const request = new Request("https://example.com/api/v1/models", {
    method: "POST",
    headers: {
      "content-length": String(MAX_BODY_BYTES + 1),
    },
  });

  const rejection = checkBodySize(request, getBodySizeLimit("/api/v1/models"));
  assert.ok(rejection instanceof Response);
  assert.equal(rejection.status, 413);

  const body = await rejection.json();
  assert.equal(body.error.code, "PAYLOAD_TOO_LARGE");
});
