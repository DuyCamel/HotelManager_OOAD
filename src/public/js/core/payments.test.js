const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const { test } = require("node:test");

const source = readFileSync(join(__dirname, "payments.js"), "utf8")
  .replace(/^export (?=(?:async )?function )/gm, "");

class Element {
  constructor() {
    this.listeners = new Map();
    this.children = new Map();
    this.hidden = false;
  }
  setAttribute() {}
  addEventListener(type, callback) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(callback);
    this.listeners.set(type, listeners);
  }
  emit(type) {
    for (const callback of this.listeners.get(type) || []) callback();
  }
  querySelector(selector) {
    if (!this.children.has(selector)) this.children.set(selector, new Element());
    return this.children.get(selector);
  }
  showModal() {}
  close() { this.emit("close"); }
  remove() {}
}

const intent = {
  id: "HT123", amount: 123456, status: "PENDING", bankId: "MSB",
  accountNo: "123456", accountName: "TEST HOTEL", expiresAt: "2026-11-12T00:00:00Z",
  qrUrl: "https://vietqr.app/img?amount=123456&des=HT123",
};

const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

function setup(nextStatus = "PENDING") {
  const timers = new Map();
  const calls = [];
  let nextTimer = 0;
  let dialog;
  let clock = 0;
  const window = {
    Hotel: { escape: (value) => String(value ?? "") },
    addEventListener(type, callback) { this[type] = callback; },
    removeEventListener(type) { delete this[type]; },
  };
  // Isolate browser globals and fake time so these tests never modify Node globals.
  const sandbox = {
    module: { exports: {} },
    URL,
    Date: class extends Date { static now() { return clock; } },
    document: {
      createElement: () => new Element(),
      body: { append: (value) => { dialog = value; } },
    },
    window,
    setTimeout: (callback) => {
      timers.set(++nextTimer, callback);
      return nextTimer;
    },
    clearTimeout: (id) => timers.delete(id),
  };
  vm.runInNewContext(
    `${source}\nmodule.exports = { trustedQrUrl, depositAmount, openPayment };`,
    sandbox,
    { filename: "payments.js" },
  );
  const ctx = {
    money: String,
    refresh: async () => { calls.push(["refresh"]); },
    api: async (url, body) => {
      calls.push([url, body]);
      return body ? intent : { ...intent, status: nextStatus, invoiceId: "INV1" };
    },
  };
  return {
    ...sandbox.module.exports,
    ctx, calls, timers, window,
    get dialog() { return dialog; },
    setClock: (value) => { clock = value; },
  };
}

test("QR accepts only the exact trusted HTTPS image endpoint", () => {
  const { trustedQrUrl } = setup();
  assert.equal(trustedQrUrl(intent.qrUrl), intent.qrUrl);
  for (const url of [
    "http://vietqr.app/img", "https://vietqr.app.evil/img", "https://evil/img",
    "https://vietqr.app/other", "https://user@vietqr.app/img", "/static.png",
    "javascript:alert(1)",
  ]) assert.equal(trustedQrUrl(url), null, url);
});

test("deposits preserve any positive integer up to the room charge", () => {
  const { depositAmount } = setup();
  for (const amount of [1, 123, 100000])
    assert.equal(depositAmount(String(amount), 100000), amount);
  for (const amount of [0, -1, 1.5, "", "bad", 100001, Infinity])
    assert.throws(() => depositAmount(amount, 100000));
});

test("an applied deposit runs the immediate check-in callback exactly once after payment and refresh", async () => {
  const harness = setup("APPLIED");
  const callback = async () => { harness.calls.push(["check-in"]); return "Phiếu B1 đã nhận phòng."; };
  await harness.openPayment(harness.ctx, { kind: "DEPOSIT", bookingId: "B1", amount: 123456 }, callback);
  await flush();
  assert.deepEqual(harness.calls, [
    ["/api/action/payments.create", { kind: "DEPOSIT", bookingId: "B1", amount: 123456 }],
    ["/api/payments/HT123", undefined],
    ["refresh"],
    ["check-in"],
  ]);
  const status = harness.dialog.querySelector("[data-payment-body]").querySelector("[data-payment-status]");
  assert.match(status.textContent, /đã nhận phòng/);
  assert.equal(harness.timers.size, 0);
  harness.dialog.close();
});

test("settlement posts exact preview values and APPLIED refreshes without checkout", async () => {
  const harness = setup("APPLIED");
  const request = {
    kind: "SETTLEMENT", stayId: "S1", expectedDue: 123456, fingerprint: "exact",
  };
  await harness.openPayment(harness.ctx, request);
  await flush();
  assert.deepEqual(harness.calls, [
    ["/api/action/payments.create", request],
    ["/api/payments/HT123", undefined],
    ["refresh"],
  ]);
  const body = harness.dialog.querySelector("[data-payment-body]");
  const invoice = body.querySelector("[data-payment-invoice]");
  assert.equal(invoice.href, "/api/invoice/INV1");
  assert.equal(invoice.hidden, false);
  assert.equal(harness.timers.size, 0);
  harness.dialog.close();
});

test("pending polling stops at 60 seconds and manual checking restarts it", async () => {
  const harness = setup();
  let checkIns = 0;
  await harness.openPayment(harness.ctx, { kind: "DEPOSIT", bookingId: "B1", amount: 123456 }, async () => { checkIns++; });
  await flush();
  assert.equal(checkIns, 0);
  assert.equal(harness.timers.size, 1);
  harness.setClock(61000);
  const callback = [...harness.timers.values()][0];
  harness.timers.clear();
  await callback();
  const body = harness.dialog.querySelector("[data-payment-body]");
  assert.match(body.querySelector("[data-payment-status]").textContent, /Không chuyển lần hai/);
  assert.equal(harness.timers.size, 0);
  body.querySelector("[data-payment-check]").emit("click");
  await flush();
  assert.equal(harness.timers.size, 1);
  harness.window.pagehide();
  assert.equal(harness.timers.size, 0);
  assert.equal(harness.calls.filter(([url]) => url === "refresh").length, 0);
});

test("REVIEW, EXPIRED and CANCELLED never refresh or confirm money", async () => {
  for (const state of ["REVIEW", "EXPIRED", "CANCELLED"]) {
    const harness = setup(state);
    let checkIns = 0;
    await harness.openPayment(harness.ctx, { kind: "DEPOSIT", bookingId: "B1", amount: 123456 }, async () => { checkIns++; });
    await flush();
    assert.equal(checkIns, 0);
    assert.equal(harness.calls.length, 2);
    assert.equal(harness.timers.size, 0);
    const body = harness.dialog.querySelector("[data-payment-body]");
    assert.match(body.querySelector("[data-payment-status]").textContent, /lễ tân/);
    harness.dialog.close();
  }
});

test("503 explains cash fallback and dialog close clears polling", async () => {
  const unavailable = setup();
  unavailable.ctx.api = async () => {
    throw Object.assign(new Error("Missing test configuration"), { status: 503 });
  };
  await assert.rejects(unavailable.openPayment(unavailable.ctx, {}), /tiền mặt/);
  assert.equal(unavailable.timers.size, 0);
  const pending = setup();
  await pending.openPayment(pending.ctx, {});
  await flush();
  pending.dialog.close();
  assert.equal(pending.timers.size, 0);
});

test("same-tab resume fetches the existing intent without creating another QR or amount", async () => {
  const harness = setup();
  const stored = new Map([["hotel.sepay.DEPOSIT.B1", "HT123"]]);
  harness.window.sessionStorage = {
    getItem: (key) => stored.get(key),
    setItem: (key, value) => stored.set(key, value),
    removeItem: (key) => stored.delete(key),
  };
  await harness.openPayment(harness.ctx, { kind: "DEPOSIT", bookingId: "B1" });
  await flush();
  assert.equal(harness.calls[0][0], "/api/payments/HT123");
  assert.ok(harness.calls.every(([url]) => url !== "/api/action/payments.create"));
  harness.dialog.close();
});

test("an entered 500000 deposit cannot silently display a cached 300000 QR", async () => {
  const harness = setup();
  harness.window.sessionStorage = {
    getItem: () => "HT300000",
    setItem() {},
  };
  const request = { kind: "DEPOSIT", bookingId: "B1", amount: 500000 };
  harness.ctx.api = async (url, body) => {
    harness.calls.push([url, body]);
    if (body)
      throw Object.assign(new Error("Existing deposit QR has a different amount"), { status: 409 });
    return { ...intent, id: "HT300000", amount: 300000 };
  };
  await assert.rejects(harness.openPayment(harness.ctx, request), /different amount/);
  assert.deepEqual(harness.calls, [["/api/action/payments.create", request]]);
  assert.equal(harness.dialog.querySelector("[data-payment-body]").innerHTML, undefined);
  assert.equal(harness.timers.size, 0);
});
