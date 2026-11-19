const { test } = require("node:test");
const assert = require("node:assert/strict");
const gateway = require("./sepay.gateway");
const config = { apiKey: "test-only-".repeat(5), bankId: "MSB", accountNo: "1234567890", accountName: "TEST HOTEL" };
const code = "HT" + "A".repeat(24);
const payload = { id: 123, transferType: "in", transferAmount: 150000, accountNumber: config.accountNo, content: "Thanh toan " + code };

test("SePay authenticates the webhook and binds it to the receiving account", () => {
  assert.equal(gateway.receive(config, "Apikey " + config.apiKey, payload).code, code);
  assert.throws(() => gateway.receive(config, "Apikey invalid", payload), { status: 401 });
  assert.throws(() => gateway.receive(config, undefined, payload), { status: 401 });
  for (const changes of [
    { accountNumber: "0000000000" }, { transferType: "out" }, { id: 0 },
    { transferAmount: 1.5 }, { transferAmount: -1 }, { transferAmount: "150000" },
    { content: code + " " + code },
  ]) assert.throws(() => gateway.receive(config, "Apikey " + config.apiKey, { ...payload, ...changes }), { status: 400 });
  assert.equal(gateway.receive(config, "Apikey " + config.apiKey, { ...payload, content: "DH12345678" }).code, null);
});

test("QR encodes the exact server amount and unique reference without a secret", () => {
  const url = new URL(gateway.qr(config, { id: code, amount: 150000 }));
  assert.equal(url.searchParams.get("amount"), "150000");
  assert.equal(url.searchParams.get("des"), code);
  assert.equal(url.href.includes(config.apiKey), false);
  assert.throws(() => gateway.qr({ ...config, accountNo: "" }, { id: code, amount: 1 }), { status: 503 });
});
