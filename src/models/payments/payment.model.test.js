const { test } = require("node:test");
const assert = require("node:assert/strict");
const createPayments = require("./payment.model");
const createBookings = require("../bookings/booking.model");
const invoices = require("../invoices/invoice.model");
const sepay = { apiKey: "test-secret-".repeat(4), bankId: "MSB", accountNo: "1234567890", accountName: "TEST HOTEL" };
const staff = { id: "STAFF", role: "RECEPTIONIST" };
const customer = { id: "CUSTOMER", role: "CUSTOMER" };
const auth = "Apikey " + sepay.apiKey;

function fixture({ activeStay = false, deposit = 300000 } = {}) {
  const entities = ["accounts", "customers", "bookings", "stays", "rooms", "types", "history", "settings", "services", "usage", "holidays", "payments", "invoices", "lines", "tasks", "audit", "cards", "points", "paymentIntents", "sepayReceipts"];
  const state = Object.fromEntries(entities.map((key) => [key, []]));
  state.customers.push({ id: "C1", accountId: customer.id, name: "Guest", identityNo: "123456789012", phone: "0900000000", isActive: true });
  state.settings.push({ id: 1, hotelName: "Test Hotel", address: "Test", hotline: "0900000000" });
  state.rooms.push({ id: "R1", name: "101", typeId: "T1", status: activeStay ? "OCCUPIED" : "CLEAN" });
  state.bookings.push({ id: "B1", customerId: "C1", roomId: "R1", roomCharge: 1000000, deposit: activeStay ? deposit : 0,
    status: activeStay ? "CHECKED_IN" : "PENDING", holdUntil: new Date(Date.now() + 30 * 60000).toISOString() });
  if (activeStay) {
    state.stays.push({ id: "S1", bookingId: "B1", checkOutAt: null, roomCharge: 1000000, surcharge: 50000 });
    state.history.push({ id: 1, stayId: "S1", roomId: "R1", fromAt: new Date().toISOString(), toAt: null });
    state.services.push({ id: "V1", name: "Service" });
    state.usage.push({ id: 1, stayId: "S1", serviceId: "V1", quantity: 1, unitPrice: 150000, isVoided: false });
    if (deposit > 0) state.payments.push({ id: "OLD_DEPOSIT", bookingId: "B1", invoiceId: null, kind: "DEPOSIT", amount: deposit });
  }
  let current = state, tail = Promise.resolve(), failReceipt = false;
  const client = (data) => ({
    async list(key) { return structuredClone(data[key]); },
    async find(key, id) { return structuredClone(data[key].find((row) => String(row.id) === String(id)) || null); },
    async insert(key, row) {
      if (key === "sepayReceipts" && failReceipt) throw new Error("simulated storage failure");
      const created = structuredClone(row);
      created.id ??= data[key].length + 1;
      assert.ok(!data[key].some((item) => String(item.id) === String(created.id)), "unique primary key");
      data[key].push(created);
      return structuredClone(created);
    },
    async update(key, id, changes) { Object.assign(data[key].find((row) => String(row.id) === String(id)), structuredClone(changes)); },
    async finalizeInvoice(id) {
      const invoice = data.invoices.find((row) => row.id === id);
      assert.equal(data.payments.filter((p) => p.invoiceId === id).reduce((sum, p) => sum + p.amount, 0), invoice.amountDue);
      invoice.status = "PAID";
      data.points.push({ id, points: Math.floor((invoice.roomCharge + invoice.serviceCharge + invoice.surcharge) / 10000) });
    },
  });
  const repo = {
    list: (key) => client(current).list(key),
    find: (key, id) => client(current).find(key, id),
    transaction(work) {
      const run = tail.then(async () => {
        const draft = structuredClone(current);
        const result = await work(client(draft));
        current = draft;
        return result;
      });
      tail = run.catch(() => {});
      return run;
    },
    snapshot: () => structuredClone(current),
    failReceipt: (value) => { failReceipt = value; },
  };
  return { repo, model: createPayments(repo, sepay) };
}
const depositRequest = { kind: "DEPOSIT", bookingId: "B1", amount: 300000 };
const event = (intent, changes = {}) => ({ id: 101, accountNumber: sepay.accountNo, transferType: "in", transferAmount: intent.amount, content: intent.id, ...changes });

test("deposit intent is owner-scoped, persisted and reused without accepting client payment status", async () => {
  const { repo, model } = fixture();
  await assert.rejects(model.create({ id: "OTHER", role: "CUSTOMER" }, depositRequest), { status: 403 });
  await assert.rejects(model.create(customer, { ...depositRequest, amount: 1000001 }), { status: 400 });
  const intent = await model.create(customer, { ...depositRequest, status: "APPLIED", receiptConfirmed: true });
  assert.equal(intent.status, "PENDING");
  assert.equal((await model.create(customer, depositRequest)).id, intent.id);
  assert.equal(repo.snapshot().payments.length, 0);
  await assert.rejects(model.status({ id: "OTHER", role: "CUSTOMER" }, intent.id), { status: 403 });
  await assert.rejects(model.create(customer, { kind: "SETTLEMENT", stayId: "S1" }), { status: 403 });
});

test("concurrent duplicate webhook confirms exactly one deposit and records one provider receipt", async () => {
  const { repo, model } = fixture();
  const intent = await model.create(customer, depositRequest);
  const results = await Promise.all([model.receive(event(intent), auth), model.receive(event(intent), auth)]);
  assert.equal(results.filter((r) => r.duplicate).length, 1);
  const data = repo.snapshot();
  assert.equal(data.payments.length, 1);
  assert.equal(data.bookings[0].deposit, 300000);
  assert.equal(data.bookings[0].status, "CONFIRMED");
  assert.equal(data.sepayReceipts.length, 1);
  assert.equal((await model.status(customer, intent.id)).status, "APPLIED");
  await assert.rejects(model.receive(event(intent, { transferAmount: 1 }), auth), { status: 409 });
  assert.equal((await model.receive(event(intent, { id: 102 }), auth)).outcome, "REVIEW");
  assert.equal(repo.snapshot().payments.length, 1);
});

test("underpayment and overpayment are durably retained without credit or automatic retry collection", async () => {
  for (const amount of [299999, 300001]) {
    const { repo, model } = fixture();
    const intent = await model.create(customer, depositRequest);
    assert.equal((await model.receive(event(intent, { transferAmount: amount }), auth)).outcome, "REVIEW");
    assert.equal(repo.snapshot().payments.length, 0);
    assert.equal(repo.snapshot().bookings[0].deposit, 0);
    assert.equal(repo.snapshot().sepayReceipts[0].amount, amount);
    assert.equal((await model.status(customer, intent.id)).status, "REVIEW");
    await assert.rejects(model.create(customer, depositRequest), { status: 409 });
  }
});

test("expired, cancelled and unmatched incoming transfers cannot revive a booking", async () => {
  for (const change of ["expired", "cancelled", "unknown"]) {
    const { repo, model } = fixture();
    const intent = await model.create(customer, depositRequest);
    if (change === "expired") await repo.transaction((tx) => tx.update("paymentIntents", intent.id, { expiresAt: "2000-01-01T00:00:00.000Z" }));
    if (change === "cancelled") await createBookings(repo).cancel(customer, { id: "B1" });
    const incoming = event(intent, change === "unknown" ? { content: "Unmatched transfer" } : {});
    assert.equal((await model.receive(incoming, auth)).outcome, "REVIEW");
    assert.equal(repo.snapshot().payments.length, 0);
    assert.equal(repo.snapshot().bookings[0].deposit, 0);
  }
});

test("manual receipt versus SePay receipt cannot both fund the booking", async () => {
  const { repo, model } = fixture();
  const intent = await model.create(customer, depositRequest);
  await createBookings(repo).deposit(staff, { id: "B1", amount: 300000, method: "CASH", receiptConfirmed: true });
  assert.equal((await model.receive(event(intent), auth)).outcome, "REVIEW");
  assert.equal(repo.snapshot().payments.length, 1);
});

test("resuming after the receiving account changes cancels the old QR", async () => {
  const { repo, model } = fixture();
  const intent = await model.create(customer, depositRequest);
  const changed = createPayments(repo, { ...sepay, accountNo: "9876543210" });
  const obsolete = await changed.status(customer, intent.id);
  assert.equal(obsolete.status, "CANCELLED");
  assert.equal(obsolete.qrUrl, null);
  const replacement = await changed.create(customer, depositRequest);
  assert.notEqual(replacement.id, intent.id);
  assert.equal(replacement.accountNo, "9876543210");
  assert.equal(new URL(replacement.qrUrl).searchParams.get("acc"), "9876543210");
});

test("checkout transfers only the remainder and finalizes invoices, points and tasks once", async () => {
  const { repo, model } = fixture({ activeStay: true });
  const bill = await invoices(repo).preview(staff, "S1");
  assert.equal(bill.due, 900000);
  const intent = await model.create(staff, { kind: "SETTLEMENT", stayId: "S1", expectedDue: bill.due, fingerprint: bill.fingerprint });
  assert.equal(intent.amount, 900000);
  await Promise.all([model.receive(event(intent), auth), model.receive(event(intent), auth)]);
  const data = repo.snapshot();
  assert.equal(data.invoices.length, 1);
  assert.equal(data.invoices[0].deposit, 300000);
  assert.equal(data.invoices[0].amountDue, 900000);
  assert.equal(data.payments.length, 2);
  assert.equal(data.payments.reduce((sum, p) => sum + p.amount, 0), 1200000);
  assert.equal(data.points.length, 1);
  assert.equal(data.points[0].points, 120);
  assert.equal(data.tasks.length, 1);
  assert.equal(data.rooms[0].status, "DIRTY");
  assert.equal((await model.status(staff, intent.id)).invoiceId, data.invoices[0].id);
});

test("zero balance and stale preview cannot create a checkout QR", async () => {
  const { repo, model } = fixture({ activeStay: true, deposit: 1000000 });
  await repo.transaction(async (tx) => {
    await tx.update("stays", "S1", { surcharge: 0 });
    await tx.update("usage", 1, { unitPrice: 0 });
  });
  const bill = await invoices(repo).preview(staff, "S1");
  await assert.rejects(model.create(staff, { kind: "SETTLEMENT", stayId: "S1", expectedDue: bill.due, fingerprint: bill.fingerprint }), { status: 400 });
  assert.equal(repo.snapshot().paymentIntents.length, 0);
  const second = fixture({ activeStay: true });
  await assert.rejects(second.model.create(staff, { kind: "SETTLEMENT", stayId: "S1", expectedDue: 1, fingerprint: "stale" }), { status: 409 });
});

test("equal-value line changes after issuing QR require reconciliation instead of checkout", async () => {
  const { repo, model } = fixture({ activeStay: true });
  const bill = await invoices(repo).preview(staff, "S1");
  const intent = await model.create(staff, { kind: "SETTLEMENT", stayId: "S1", expectedDue: bill.due, fingerprint: bill.fingerprint });
  await repo.transaction((tx) => tx.update("usage", 1, { quantity: 2, unitPrice: 75000 }));
  assert.equal((await model.receive(event(intent), auth)).outcome, "REVIEW");
  assert.equal(repo.snapshot().invoices.length, 0);
  assert.equal(repo.snapshot().stays[0].checkOutAt, null);
  assert.equal(repo.snapshot().sepayReceipts.length, 1);
});

test("receipt persistence failure rolls back the entire checkout; retry applies once", async () => {
  const { repo, model } = fixture({ activeStay: true });
  const bill = await invoices(repo).preview(staff, "S1");
  const intent = await model.create(staff, { kind: "SETTLEMENT", stayId: "S1", expectedDue: bill.due, fingerprint: bill.fingerprint });
  const before = repo.snapshot();
  repo.failReceipt(true);
  await assert.rejects(model.receive(event(intent), auth), /simulated storage failure/);
  assert.deepEqual(repo.snapshot(), before);
  repo.failReceipt(false);
  assert.equal((await model.receive(event(intent), auth)).outcome, "APPLIED");
});

test("HTTP webhook requires provider authentication without CSRF; browser payment routes retain session and CSRF", async (t) => {
  const { repo, model } = fixture();
  const passwords = require("../../core/auth/passwords");
  const passwordHash = await passwords.hash("test-password");
  await repo.transaction((tx) => tx.insert("accounts", {
    ...customer, email: "guest@example.test", isActive: true, authVersion: 0, passwordHash,
  }));
  const models = require("../index")(repo);
  models.payments = model;
  const app = require("../../app")(repo, models);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = "http://127.0.0.1:" + server.address().port;
  const post = (path, body, headers = {}) => fetch(base + path, {
    method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body),
  });
  const unsolicited = event({ id: "HT" + "B".repeat(24), amount: 12345 });
  assert.equal((await post("/api/webhooks/sepay", unsolicited)).status, 401);
  const accepted = await post("/api/webhooks/sepay", unsolicited, { Authorization: auth });
  assert.equal(accepted.status, 200);
  assert.equal((await accepted.json()).success, true);
  assert.equal(repo.snapshot().sepayReceipts.length, 1);
  assert.equal((await post("/api/action/payments.create", depositRequest)).status, 403);
  const page = await fetch(base + "/login");
  const token = (await page.text()).match(/name="csrf-token" content="([^"]+)"/)[1];
  const cookie = page.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  assert.equal((await post("/api/action/payments.create", depositRequest,
    { Cookie: cookie, "X-CSRF-Token": token })).status, 401);
  const login = await post("/api/login", { email: "guest@example.test", password: "test-password" },
    { Cookie: cookie, "X-CSRF-Token": token });
  assert.equal(login.status, 200);
  const authenticatedCookie = login.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  const form = await fetch(base + "/register", { headers: { Cookie: authenticatedCookie } });
  const newToken = (await form.text()).match(/name="csrf-token" content="([^"]+)"/)[1];
  const created = await post("/api/action/payments.create", depositRequest,
    { Cookie: authenticatedCookie, "X-CSRF-Token": newToken });
  assert.equal(created.status, 200);
  const intent = await created.json();
  assert.equal(intent.amount, 300000);
  assert.equal((await fetch(base + "/api/payments/" + intent.id)).status, 401);
  const paid = await post("/api/webhooks/sepay", event(intent, { id: 102 }), { Authorization: auth });
  assert.equal((await paid.json()).outcome, "APPLIED");
  const status = await fetch(base + "/api/payments/" + intent.id, { headers: { Cookie: authenticatedCookie } });
  assert.equal((await status.json()).status, "APPLIED");
  models.payments = createPayments(repo, { ...sepay, accountNo: "" });
  const unavailable = await post("/api/action/payments.create", depositRequest,
    { Cookie: authenticatedCookie, "X-CSRF-Token": newToken });
  assert.equal(unavailable.status, 503);
  assert.match((await unavailable.json()).error, /Chưa cấu hình/);
});
