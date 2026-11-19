const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const createProxy = require("./sepay-webhook-proxy");

test("tunnel exposes only POST webhook and forwards authentication without cookies", async (t) => {
  const received = [];
  const upstream = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    received.push({ path: req.url, headers: req.headers, body: Buffer.concat(chunks).toString() });
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Authentication required" }));
  });
  await new Promise((resolve) => upstream.listen(0, "127.0.0.1", resolve));
  const proxy = createProxy(upstream.address().port).listen(0, "127.0.0.1");
  await new Promise((resolve) => proxy.once("listening", resolve));
  t.after(async () => {
    await Promise.all([proxy, upstream].map((server) => new Promise((resolve) => server.close(resolve))));
  });
  const base = "http://127.0.0.1:" + proxy.address().port;
  for (const path of ["/", "/login", "/app", "/api/login", "/api/webhooks/sepay"])
    assert.equal((await fetch(base + path)).status, 404);
  for (const path of ["/api/login", "/api/webhooks/sepay?path=/app", "/api/webhooks/sepay/../login"])
    assert.equal((await fetch(base + path, { method: "POST" })).status, 404);
  assert.equal(received.length, 0);
  const response = await fetch(base + "/api/webhooks/sepay", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: "Apikey test-only", Cookie: "hotel.sid=private" }, body: '{"id":123}',
  });
  assert.equal(response.status, 401);
  assert.equal(received.length, 1);
  assert.equal(received[0].path, "/api/webhooks/sepay");
  assert.equal(received[0].body, '{"id":123}');
  assert.equal(received[0].headers.authorization, "Apikey test-only");
  assert.equal(received[0].headers.cookie, undefined);
  assert.equal((await fetch(base + "/api/webhooks/sepay", { method: "POST", body: "not-json" })).status, 415);
  assert.equal((await fetch(base + "/api/webhooks/sepay", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "x".repeat(1024 * 1024 + 1),
  })).status, 413);
  assert.equal(received.length, 1);
  await new Promise((resolve) => upstream.close(resolve));
  assert.equal((await fetch(base + "/api/webhooks/sepay", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
  })).status, 502);
});
