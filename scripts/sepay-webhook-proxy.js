const express = require("express");

function createProxy(targetPort) {
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => req.method === "POST" && req.originalUrl === "/api/webhooks/sepay"
    ? next() : res.status(404).json({ error: "Only the SePay webhook is exposed." }));
  app.post("/api/webhooks/sepay", express.raw({ type: "application/json", limit: "1mb" }), async (req, res) => {
    if (!Buffer.isBuffer(req.body))
      return res.status(415).json({ error: "Webhook requires application/json." });
    try {
      const upstream = await fetch(`http://127.0.0.1:${targetPort}/api/webhooks/sepay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: req.get("Authorization") || "",
        },
        body: req.body,
        signal: AbortSignal.timeout(20000),
      });
      res.status(upstream.status).type("application/json").set("Cache-Control", "no-store").send(await upstream.text());
    } catch {
      res.status(502).json({ error: "Local hotel server is unavailable." });
    }
  });
  app.use((err, req, res, next) => res.status(err.status === 413 ? 413 : 400).json({ error: "Invalid webhook request." }));
  return app;
}

module.exports = createProxy;
