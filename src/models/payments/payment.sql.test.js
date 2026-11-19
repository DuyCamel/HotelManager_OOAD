const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");

test("SQL SePay deposit and checkout honor real constraints and roll back all fixtures", {
  skip: process.env.SEPAY_SQL_TEST !== "1",
}, async () => {
  const repo = require("../_shared/sql.model");
  const db = require("../../config/db");
  const createPayments = require("./payment.model");
  const invoices = require("../invoices/invoice.model");
  const config = { apiKey: "SQL-test-only-".repeat(4), bankId: "MSB", accountNo: "1234567890", accountName: "TEST ONLY" };
  const suffix = randomBytes(5).toString("hex");
  const bookingId = "SPB" + suffix, roomId = "SPR" + suffix, stayId = "SPS" + suffix;
  const rollback = new Error("ROLLBACK_SEPAY_TEST_FIXTURES");
  try {
    await repo.init();
    await assert.rejects(repo.transaction(async (tx) => {
      const staff = (await tx.list("accounts")).find((a) => a.role === "ADMIN" && a.isActive);
      const customer = (await tx.list("customers")).find((c) => c.isActive);
      const type = (await tx.list("types"))[0];
      const service = (await tx.list("services")).find((s) => s.isActive);
      assert.ok(staff && customer && type && service, "SQL development seed required");
      const now = new Date().toISOString();
      // A pending booking must still be within its no-show deadline when creating the deposit QR.
      const arrival = new Date(Date.now() + 86400000).toISOString();
      const departure = new Date(Date.now() + 2 * 86400000).toISOString();
      const start = new Date(Date.now() - 86400000).toISOString();
      const end = arrival;
      await tx.insert("rooms", { id: roomId, name: "SePay test " + suffix, typeId: type.id, status: "CLEAN" });
      await tx.insert("bookings", { id: bookingId, customerId: customer.id, roomId,
        startAt: arrival, endAt: departure, guests: 1, status: "PENDING", channel: "ONLINE",
        roomCharge: 1000000, deposit: 0, holdUntil: new Date(Date.now() + 1800000).toISOString(), createdAt: now, createdBy: staff.id });
      // Use the real transaction client throughout, with the outer transaction always rolled back.
      const paymentRepo = { ...tx, transaction: (work) => work(tx) };
      const payments = createPayments(paymentRepo, config);
      const deposit = await payments.create(staff, { kind: "DEPOSIT", bookingId, amount: 300000 });
      const incoming = (intent, id) => ({ id, accountNumber: config.accountNo,
        content: intent.id, transferType: "in", transferAmount: intent.amount });
      const depositEvent = incoming(deposit, Date.now());
      const auth = "Apikey " + config.apiKey;
      assert.equal((await payments.receive(depositEvent, auth)).outcome, "APPLIED");
      assert.equal((await payments.receive(depositEvent, auth)).duplicate, true);
      assert.equal((await tx.find("bookings", bookingId)).deposit, 300000);
      // Move the fixture to an in-progress stay before exercising settlement.
      await tx.update("bookings", bookingId, { startAt: start, endAt: end, status: "CHECKED_IN" });
      await tx.update("rooms", roomId, { status: "OCCUPIED" });
      await tx.insert("stays", { id: stayId, bookingId, identityNo: customer.identityNo || "123456789012",
        checkInAt: start, checkOutAt: null, roomCharge: 1000000, surcharge: 50000, createdBy: staff.id });
      await tx.insert("history", { stayId, roomId, fromAt: start, toAt: null, extraCharge: 0 });
      await tx.insert("usage", { id: "SPU" + suffix, stayId, serviceId: service.id, quantity: 1, unitPrice: 150000,
        usedAt: now, isVoided: false, invoiceId: null, recordedBy: staff.id });
      const bill = await invoices.preview(tx, stayId);
      assert.equal(bill.due, 900000);
      const intent = await payments.create(staff, { kind: "SETTLEMENT", stayId, expectedDue: bill.due, fingerprint: bill.fingerprint });
      const settlement = incoming(intent, depositEvent.id + 1);
      await payments.receive(settlement, auth);
      await payments.receive(settlement, auth);
      const invoice = (await tx.list("invoices")).find((i) => i.stayId === stayId);
      assert.equal(invoice.status, "PAID");
      assert.equal(invoice.deposit, 300000);
      assert.equal(invoice.amountDue, 900000);
      const ledger = (await tx.list("payments")).filter((p) => p.bookingId === bookingId || p.invoiceId === invoice.id);
      assert.equal(ledger.length, 2);
      assert.equal(ledger.reduce((sum, p) => sum + p.amount, 0), 1200000);
      assert.equal((await tx.list("tasks")).filter((t) => t.stayId === stayId).length, 1);
      const card = (await tx.list("cards")).find((c) => c.customerId === customer.id && c.isActive);
      if (card) {
        const points = (await tx.list("points")).filter((p) => p.id === invoice.id);
        assert.equal(points.length, 1);
        assert.equal(Number(points[0].points), 120);
      }
      throw rollback;
    }), (error) => error === rollback);
    assert.equal(await repo.find("bookings", bookingId), null);
    assert.equal(await repo.find("rooms", roomId), null);
  } finally {
    await db.close();
  }
});
