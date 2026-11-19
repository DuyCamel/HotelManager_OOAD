const test = require("node:test");
const assert = require("node:assert/strict");

const rules = require("./_shared/stayRules");
const createBookings = require("./bookings/booking.model");
const createStays = require("./stays/stay.model");
const createInvoices = require("./invoices/invoice.model");
const createHousekeeping = require("./housekeeping/housekeeping.model");

const entities = [
  "rooms", "types", "services", "holidays", "settings", "customers",
  "bookings", "stays", "history", "usage", "cards", "points", "invoices",
  "lines", "payments", "tasks", "audit", "accounts", "damages", "backups",
  "paymentIntents", "sepayReceipts",
];

const clone = (value) => structuredClone(value);
const setting = {
  id: 1,
  hotelName: "Lifecycle Test Hotel",
  address: "1 Test Street",
  hotline: "0900000000",
  checkInTime: "14:00:00",
  checkOutTime: "12:00:00",
};
const receptionist = { id: "TK_RECEPTION", role: "RECEPTIONIST", isActive: true };
const housekeeper = { id: "TK_HOUSEKEEP", role: "HOUSEKEEPER", isActive: true };

function makeRepo(initial) {
  let state = clone(initial);
  const client = (data) => ({
    async list(entity) { return clone(data[entity]); },
    async find(entity, id) {
      return clone(data[entity].find((row) => String(row.id) === String(id)) || null);
    },
    async insert(entity, row) {
      const value = clone(row);
      if (value.id === undefined) value.id = String(data[entity].length + 1);
      data[entity].push(value);
      return clone(value);
    },
    async update(entity, id, changes) {
      const row = data[entity].find((item) => String(item.id) === String(id));
      assert.ok(row, `${entity} ${id} must exist`);
      Object.assign(row, clone(changes));
    },
    async finalizeInvoice(id) {
      const invoice = data.invoices.find((item) => String(item.id) === String(id));
      assert.ok(invoice, `invoice ${id} must exist`);
      invoice.status = "PAID";
    },
  });
  return {
    async list(entity) { return client(state).list(entity); },
    async find(entity, id) { return client(state).find(entity, id); },
    async transaction(work) {
      const draft = clone(state);
      const result = await work(client(draft));
      state = draft;
      return result;
    },
    snapshot() { return clone(state); },
  };
}

function emptyState() {
  return Object.fromEntries(entities.map((entity) => [entity, []]));
}

function withClock(iso, work) {
  const OriginalDate = Date;
  const fixed = OriginalDate.parse(iso);
  class FixedDate extends OriginalDate {
    constructor(...args) { super(...(args.length ? args : [fixed])); }
    static now() { return fixed; }
  }
  global.Date = FixedDate;
  return Promise.resolve().then(work).finally(() => { global.Date = OriginalDate; });
}

function fixture() {
  const state = emptyState();
  state.settings.push(setting);
  state.rooms.push({ id: "P1", name: "Phòng 101", typeId: "STD", status: "AVAILABLE" });
  state.types.push({ id: "STD", name: "Tiêu chuẩn", capacity: 2, dailyPrice: 500000 });
  state.customers.push({
    id: "KH1", name: "Khách kiểm thử", phone: "0900000001",
    identityNo: "079000000001", accountId: null, isActive: true,
  });
  return state;
}

test("counter booking runs through check-in, invoice, checkout, and housekeeping", async () => {
  await withClock("2026-11-18T19:00:00+07:00", async () => {
    const repo = makeRepo(fixture());
    const bookings = createBookings(repo);
    const stays = createStays(repo);
    const invoices = createInvoices(repo);
    const housekeeping = createHousekeeping(repo);
    const dates = rules.fixedStayTimes("2026-11-18", "2026-11-19", setting);

    const booking = await bookings.create(receptionist, {
      customerId: "KH1", roomId: "P1", startAt: "2026-11-18", endAt: "2026-11-19",
      guests: 1, deposit: 100000, method: "CASH", receiptConfirmed: true,
    });
    assert.equal(booking.status, "CONFIRMED");
    assert.equal(booking.deposit, 100000);
    assert.equal(booking.startAt, dates.startAt);
    assert.deepEqual(repo.snapshot().payments.map(({ amount, kind, method }) => ({ amount, kind, method })), [
      { amount: 100000, kind: "DEPOSIT", method: "CASH" },
    ]);

    const stay = await stays.checkIn(receptionist, {
      id: booking.id, identityNo: "079000000001", roomId: "P1",
    });
    assert.equal(repo.snapshot().bookings[0].status, "CHECKED_IN");
    assert.equal(repo.snapshot().rooms[0].status, "OCCUPIED");
    assert.equal(stay.currentRoomId, "P1");

    const bill = await invoices.preview(receptionist, stay.id);
    assert.equal(bill.roomCharge, 500000);
    assert.equal(bill.deposit, 100000);
    assert.equal(bill.due, 400000);
    const receipt = await invoices.checkout(receptionist, {
      id: stay.id, expectedDue: bill.due, fingerprint: bill.fingerprint,
      method: "CASH", receiptConfirmed: true,
    });
    const checkedOut = repo.snapshot();
    assert.equal(receipt.message, "Đã lập hóa đơn và chuyển phòng sang Cần dọn.");
    assert.equal(checkedOut.bookings[0].status, "COMPLETED");
    assert.ok(checkedOut.stays[0].checkOutAt);
    assert.equal(checkedOut.invoices[0].status, "PAID");
    assert.equal(checkedOut.invoices[0].amountDue, 400000);
    assert.deepEqual(checkedOut.payments.map(({ amount, kind, method }) => ({ amount, kind, method })), [
      { amount: 100000, kind: "DEPOSIT", method: "CASH" },
      { amount: 400000, kind: "SETTLEMENT", method: "CASH" },
    ]);
    assert.equal(checkedOut.rooms[0].status, "DIRTY");
    assert.equal(checkedOut.tasks[0].status, "OPEN");

    await housekeeping.clean(housekeeper, { id: "P1" });
    const finished = repo.snapshot();
    assert.equal(finished.rooms[0].status, "AVAILABLE");
    assert.equal(finished.tasks[0].status, "DONE");
  });
});

test("a guest arriving after the cutoff can use the independent walk-in flow", async () => {
  await withClock("2026-11-18T22:30:00+07:00", async () => {
    const repo = makeRepo(fixture());
    const stays = createStays(repo);
    const stay = await stays.walkIn(receptionist, {
      roomId: "P1", customerName: "Khách đến muộn", customerPhone: "0900000002",
      identityNo: "079000000002", endAt: "2026-11-19", guests: 1, deposit: 100000,
    });
    const saved = repo.snapshot();
    assert.equal(saved.bookings[0].status, "CHECKED_IN");
    assert.equal(saved.bookings[0].channel, "COUNTER");
    assert.equal(saved.rooms[0].status, "OCCUPIED");
    assert.equal(saved.payments[0].kind, "DEPOSIT");
    assert.equal(saved.payments[0].amount, 100000);
    assert.equal(stay.currentRoomId, "P1");
  });
});
