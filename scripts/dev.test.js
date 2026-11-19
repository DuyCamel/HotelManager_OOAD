const { test } = require("node:test");
const assert = require("node:assert/strict");
const { listenerArgs } = require("./dev");

test("dev forwards SePay CLI events to the configured local app port", () => {
  assert.deepEqual(listenerArgs(3000), [
    "webhook", "listen", "--forward", "localhost:3000/api/webhooks/sepay",
  ]);
  assert.deepEqual(listenerArgs(3456), [
    "webhook", "listen", "--forward", "localhost:3456/api/webhooks/sepay",
  ]);
});
