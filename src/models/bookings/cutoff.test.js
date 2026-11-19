const { test } = require("node:test");
const assert = require("node:assert/strict");
const rules = require("../_shared/stayRules");
const createBookings = require("./booking.model");
const createStays = require("../stays/stay.model");

const staff = { id: "TK_TEST", role: "RECEPTIONIST" };
const customer = { id: "KH1", isActive: true, identityNo: "079000000001" };
const setting = { checkInTime: "14:00:00", checkOutTime: "12:00:00" };
const base = () => ({
  settings: [setting],
  rooms: [{ id: "P1", name: "101", typeId: "STD", status: "AVAILABLE" }],
  types: [{ id: "STD", name: "Standard", capacity: 2, dailyPrice: 500000 }],
  holidays: [],
  customers: [customer],
  bookings: [],
  stays: [],
  history: [],
  payments: [],
  paymentIntents: [],
  sepayReceipts: [],
  audit: [],
  tasks: [],
});

function repoFor(initial) {
  let state = structuredClone(initial);
  const client = (draft) => ({
    async list(entity) { return structuredClone(draft[entity]); },
    async find(entity, id) {
      return structuredClone(draft[entity].find((row) => String(row.id) === String(id)) || null);
    },
    async insert(entity, row) {
      const created = structuredClone(row);
      draft[entity].push(created);
      return structuredClone(created);
    },
    async update(entity, id, changes) {
      Object.assign(draft[entity].find((row) => String(row.id) === String(id)), changes);
    },
  });
  return {
    async list(entity) { return client(state).list(entity); },
    async find(entity, id) { return client(state).find(entity, id); },
    async transaction(work) {
      const draft = structuredClone(state);
      const result = await work(client(draft));
      state = draft;
      return result;
    },
    snapshot() { return structuredClone(state); },
  };
}

async function at(time, work) {
  const RealDate = Date;
  const fixed = RealDate.parse(time);
  global.Date = class extends RealDate {
    constructor(...args) { super(...(args.length ? args : [fixed])); }
    static now() { return fixed; }
  };
  try { return await work(); } finally { global.Date = RealDate; }
}

async function sameDayBooking(repo) {
  return createBookings(repo).create(staff, {
    customerId: customer.id,
    roomId: "P1",
    startAt: "2026-11-18",
    endAt: "2026-11-19",
    guests: 1,
    deposit: 100000,
    method: "CASH",
    receiptConfirmed: true,
  });
}

test("same-day reservation accepts 21:59 and 22:00, but blocks 22:01 before deposit", async () => {
  await at("2026-11-18T21:59:00+07:00", async () => {
    const repo = repoFor(base());
    const booking = await sameDayBooking(repo);
    assert.equal(booking.status, "CONFIRMED");
    await createStays(repo).checkIn(staff, { id: booking.id, identityNo: customer.identityNo });
    assert.equal(repo.snapshot().bookings[0].status, "CHECKED_IN");
  });

  await at("2026-11-18T22:00:00+07:00", async () => {
    const repo = repoFor(base());
    const booking = await sameDayBooking(repo);
    assert.equal(booking.status, "CONFIRMED");
    await createStays(repo).checkIn(staff, { id: booking.id, identityNo: customer.identityNo });
    assert.equal(repo.snapshot().bookings[0].status, "CHECKED_IN");
  });

  await at("2026-11-18T22:01:00+07:00", async () => {
    const repo = repoFor(base());
    await assert.rejects(sameDayBooking(repo), /22:00/);
    assert.equal(repo.snapshot().bookings.length, 0);
    assert.equal(repo.snapshot().payments.length, 0);
  });
});

test("after 22:00 an existing confirmed booking is cancelled with its deposit retained", async () => {
  await at("2026-11-18T22:01:00+07:00", async () => {
    const state = base();
    const { startAt, endAt } = rules.fixedStayTimes("2026-11-18", "2026-11-19", setting);
    state.bookings.push({ id: "DP1", customerId: customer.id, roomId: "P1", startAt, endAt,
      guests: 1, status: "CONFIRMED", roomCharge: 500000, deposit: 100000,
      holdUntil: new Date(Date.now() + 600000).toISOString() });
    const repo = repoFor(state);
    await createBookings(repo).expire();
    const booking = repo.snapshot().bookings[0];
    assert.equal(booking.status, "CANCELLED");
    assert.equal(booking.deposit, 100000);
    assert.equal(rules.active(booking), false);
  });
});

test("a pending deposit QR remains valid at 22:00 and is rejected after cutoff", async () => {
  const sepay = {
    apiKey: "cutoff-test-".repeat(4),
    bankId: "MSB",
    accountNo: "1234567890",
    accountName: "TEST HOTEL",
  };
  const staff = { id: "TK_TEST", role: "RECEPTIONIST" };
  for (const scenario of [
    { arrival: "2026-11-18T22:00:00+07:00", outcome: "APPLIED", status: "CONFIRMED", amount: 100000 },
    { arrival: "2026-11-18T22:01:00+07:00", outcome: "REVIEW", status: "CANCELLED", amount: 0 },
  ]) {
    await at("2026-11-18T21:59:00+07:00", async () => {
      const repo = repoFor(base());
      const booking = await createBookings(repo).create(staff, {
        customerId: customer.id,
        roomId: "P1",
        startAt: "2026-11-18",
        endAt: "2026-11-19",
        guests: 1,
        deposit: 100000,
        method: "TRANSFER",
      });
      assert.equal(booking.status, "PENDING");
      assert.equal(booking.holdUntil, "2026-11-18T15:00:00.000Z");

      const paymentModel = require("../payments/payment.model")(repo, sepay);
      const intent = await paymentModel.create(staff, {
        kind: "DEPOSIT",
        bookingId: booking.id,
        amount: 100000,
      });

      await at(scenario.arrival, async () => {
        const result = await paymentModel.receive(
          {
            id: scenario.arrival.endsWith("22:00:00+07:00") ? 4001 : 4002,
            transferType: "in",
            transferAmount: intent.amount,
            accountNumber: sepay.accountNo,
            content: intent.id,
          },
          `Apikey ${sepay.apiKey}`,
        );
        assert.equal(result.outcome, scenario.outcome);
        const saved = repo.snapshot();
        assert.equal(saved.bookings[0].status, scenario.status);
        assert.equal(saved.bookings[0].deposit, scenario.amount);
        assert.equal(saved.payments.length, scenario.amount ? 1 : 0);
        assert.equal(saved.paymentIntents[0].status, scenario.outcome);
      });
    });
  }
});

test("walk-in after the cutoff creates an immediate stay without a reservation hold", async () => {
  await at("2026-11-18T22:30:00+07:00", async () => {
    const repo = repoFor(base());
    const stay = await createStays(repo).walkIn(staff, {
      roomId: "P1", customerId: customer.id, identityNo: customer.identityNo,
      endAt: "2026-11-19", guests: 1, deposit: 100000,
    });
    const saved = repo.snapshot();
    assert.equal(saved.bookings[0].status, "CHECKED_IN");
    assert.equal(saved.bookings[0].holdUntil, null);
    assert.equal(saved.stays[0].id, stay.id);
    assert.equal(saved.rooms[0].status, "OCCUPIED");
  });
});

test("walk-in after the cutoff cancels an old reservation and retains its deposit", async () => {
  await at("2026-11-18T22:30:00+07:00", async () => {
    const state = base();
    const { startAt, endAt } = rules.fixedStayTimes("2026-11-18", "2026-11-19", setting);
    state.bookings.push({
      id: "DP_OLD",
      customerId: customer.id,
      roomId: "P1",
      startAt,
      endAt,
      guests: 1,
      status: "CONFIRMED",
      channel: "COUNTER",
      roomCharge: 500000,
      deposit: 100000,
      holdUntil: "2026-11-18T15:00:00.000Z",
    });
    state.payments.push({
      id: "GD_OLD",
      bookingId: "DP_OLD",
      invoiceId: null,
      kind: "DEPOSIT",
      amount: 100000,
      method: "CASH",
    });
    const repo = repoFor(state);

    await createStays(repo).walkIn(staff, {
      roomId: "P1",
      customerId: customer.id,
      identityNo: customer.identityNo,
      endAt: "2026-11-19",
      guests: 1,
    });

    const saved = repo.snapshot();
    assert.equal(saved.bookings[0].status, "CANCELLED");
    assert.equal(saved.bookings[0].deposit, 100000);
    assert.equal(saved.payments.length, 1);
    assert.equal(saved.bookings[1].status, "CHECKED_IN");
    assert.equal(saved.rooms[0].status, "OCCUPIED");
  });
});

test("extension preview returns server prices and stale confirmation is rejected", async () => {
  const state = base();
  const { startAt, endAt } = rules.fixedStayTimes("2026-11-18", "2026-11-19", setting);
  state.bookings.push({ id: "DP1", customerId: customer.id, roomId: "P1", startAt, endAt,
    guests: 1, status: "CHECKED_IN", roomCharge: 500000, deposit: 100000 });
  state.stays.push({ id: "PT1", bookingId: "DP1", checkInAt: startAt, checkOutAt: null,
    roomCharge: 500000, surcharge: 0 });
  state.history.push({ id: "H1", stayId: "PT1", roomId: "P1", fromAt: startAt, toAt: null, extraCharge: 0 });
  const repo = repoFor(state);
  const stays = createStays(repo);
  const preview = await stays.previewExtend(staff, { id: "PT1", endDate: "2026-11-20" });
  assert.equal(preview.extensionCharge, 500000);
  assert.equal(preview.moveExtra, 0);
  await stays.extend(staff, {
    id: "PT1", endDate: "2026-11-20",
    expectedExtensionCharge: preview.extensionCharge,
    expectedMoveExtra: preview.moveExtra,
  });
  assert.equal(repo.snapshot().bookings[0].endAt, preview.endAt);
  await assert.rejects(
    stays.extend(staff, { id: "PT1", endDate: "2026-11-21", expectedExtensionCharge: 0, expectedMoveExtra: 0 }),
    /chi phí gia hạn đã thay đổi/i,
  );
});
