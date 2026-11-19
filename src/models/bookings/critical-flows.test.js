const test = require("node:test");
const assert = require("node:assert/strict");

const rules = require("../_shared/stayRules");
const createBookings = require("./booking.model");
const createStays = require("../stays/stay.model");
const createInvoices = require("../invoices/invoice.model");
const createUsage = require("../service-usage/serviceUsage.model");
const createHousekeeping = require("../housekeeping/housekeeping.model");
const createWorkspace = require("../workspace/workspace.model");

const entities = [
  "rooms",
  "types",
  "services",
  "holidays",
  "settings",
  "customers",
  "bookings",
  "stays",
  "history",
  "usage",
  "cards",
  "points",
  "invoices",
  "lines",
  "payments",
  "tasks",
  "audit",
  "accounts",
  "damages",
  "backups",
  "paymentIntents",
  "sepayReceipts",
];
const clone = (value) => structuredClone(value);
const setting = {
  id: 1,
  hotelName: "Test Hotel",
  address: "1 Test Street",
  hotline: "0900000000",
  checkInTime: "14:00:00",
  checkOutTime: "12:00:00",
};
const user = {
  id: "TK_TEST",
  email: "staff@example.test",
  name: "Staff",
  phone: "0900000000",
  role: "RECEPTIONIST",
  isActive: true,
};

function emptyState() {
  return Object.fromEntries(entities.map((entity) => [entity, []]));
}

function makeRepo(initial) {
  let state = clone(initial);
  const makeClient = (data) => ({
    async list(entity) {
      return clone(data[entity]);
    },
    async find(entity, id) {
      return clone(
        data[entity].find((row) => String(row.id) === String(id)) || null,
      );
    },
    async insert(entity, row) {
      const created = clone(row);
      if (created.id === undefined)
        created.id =
          data[entity].reduce(
            (max, item) => Math.max(max, Number(item.id) || 0),
            0,
          ) + 1;
      data[entity].push(created);
      return clone(created);
    },
    async update(entity, id, changes) {
      const row = data[entity].find(
        (item) => String(item.id) === String(id),
      );
      assert.ok(row, `${entity} ${id} must exist`);
      Object.assign(row, clone(changes));
    },
    async finalizeInvoice(id) {
      const invoice = data.invoices.find(
        (item) => String(item.id) === String(id),
      );
      assert.ok(invoice);
      invoice.status = "PAID";
    },
  });
  return {
    async list(entity) {
      return makeClient(state).list(entity);
    },
    async find(entity, id) {
      return makeClient(state).find(entity, id);
    },
    async transaction(work) {
      const draft = clone(state);
      const result = await work(makeClient(draft));
      state = draft;
      return result;
    },
    snapshot() {
      return clone(state);
    },
  };
}

function shiftDate(date, days) {
  const shifted = new Date(`${date}T12:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
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

function activeStayState({ deposit = 1000, usage = [] } = {}) {
  const state = emptyState();
  const today = rules.localDatePart(new Date());
  const { startAt, endAt } = rules.fixedStayTimes(
    shiftDate(today, -1),
    shiftDate(today, 1),
    setting,
  );
  state.rooms.push({
    id: "P1",
    name: "Room 1",
    typeId: "STD",
    status: "OCCUPIED",
  });
  state.types.push({ id: "STD", capacity: 2, dailyPrice: 500 });
  state.services.push({ id: "DV1", name: "Water", price: 100, isActive: true });
  state.customers.push({
    id: "KH1",
    name: "Test Guest",
    identityNo: "079000000001",
    phone: "0900000001",
    accountId: null,
    isActive: true,
  });
  state.settings.push(setting);
  state.bookings.push({
    id: "DP1",
    customerId: "KH1",
    roomId: "P1",
    startAt,
    endAt,
    guests: 1,
    status: "CHECKED_IN",
    roomCharge: 1000,
    deposit,
  });
  state.stays.push({
    id: "PT1",
    bookingId: "DP1",
    checkInAt: startAt,
    checkOutAt: null,
    roomCharge: 1000,
    surcharge: 0,
  });
  state.history.push({
    id: 1,
    stayId: "PT1",
    roomId: "P1",
    fromAt: startAt,
    toAt: null,
    extraCharge: 0,
  });
  state.usage.push(...usage);
  return state;
}

test("same-day booking uses hotel-local check-in time", async () => {
  await withClock("2026-11-18T19:00:00+07:00", async () => {
  const state = emptyState();
  const today = rules.localDatePart(new Date());
  const tomorrow = shiftDate(today, 1);
  state.settings.push(setting);
  state.rooms.push({ id: "P1", typeId: "STD", status: "AVAILABLE" });
  state.types.push({ id: "STD", capacity: 2, dailyPrice: 500 });
  state.customers.push({ id: "KH1", isActive: true });
  const repo = makeRepo(state);

  const created = await createBookings(repo).create(user, {
    customerId: "KH1",
    roomId: "P1",
    startAt: today,
    endAt: tomorrow,
    guests: 1,
    deposit: 100,
    receiptConfirmed: true,
  });

  assert.equal(
    created.startAt,
    rules.fixedStayTimes(today, tomorrow, setting).startAt,
  );
  assert.equal(rules.localDatePart(created.startAt), today);
  assert.equal(repo.snapshot().bookings.length, 1);
  });
});

test("deposit confirmation requires receipt acknowledgement and transfer reference", async () => {
  const state = emptyState();
  state.bookings.push({
    id: "DP1",
    customerId: "KH1",
    roomId: "P1",
    status: "PENDING",
    roomCharge: 1000,
    deposit: 0,
    holdUntil: new Date(Date.now() + 60000).toISOString(),
  });
  const repo = makeRepo(state);
  const bookings = createBookings(repo);

  await assert.rejects(
    bookings.deposit(user, {
      id: "DP1",
      amount: 100,
      method: "CASH",
    }),
    /xác nhận đã nhận hoặc đối soát/,
  );
  await assert.rejects(
    bookings.deposit(user, {
      id: "DP1",
      amount: 100,
      method: "TRANSFER",
      receiptConfirmed: true,
    }),
    /Mã giao dịch/,
  );
  await bookings.deposit(user, {
    id: "DP1",
    amount: 100,
    method: "CASH",
    receiptConfirmed: true,
  });
  assert.equal(repo.snapshot().bookings[0].status, "CONFIRMED");
});

test("counter cash confirms receipt while counter transfer waits for the exact SePay deposit", async () => {
  await withClock("2026-11-18T19:00:00+07:00", async () => {
  for (const method of ["CASH", "TRANSFER"]) {
    const state = emptyState();
    const today = rules.localDatePart(new Date());
    state.settings.push(setting);
    state.rooms.push({ id: "P1", typeId: "STD", status: "AVAILABLE" });
    state.types.push({ id: "STD", capacity: 2, dailyPrice: 500 });
    state.customers.push({ id: "KH1", isActive: true });
    const repo = makeRepo(state);
    const created = await createBookings(repo).create(user, {
      customerId: "KH1", roomId: "P1", startAt: today,
      endAt: shiftDate(today, 1), guests: 1, deposit: 100,
      method, receiptConfirmed: true,
    });
    assert.equal(created.channel, "COUNTER");
    if (method === "CASH") {
      assert.equal(created.status, "CONFIRMED");
      assert.equal(created.deposit, 100);
      assert.equal(repo.snapshot().payments.length, 1);
      assert.equal(repo.snapshot().payments[0].method, "CASH");
    } else {
      assert.equal(created.status, "PENDING");
      assert.equal(created.deposit, 0);
      assert.ok(Date.parse(created.holdUntil) > Date.now());
      assert.equal(repo.snapshot().payments.length, 0);
      const sepay = { apiKey: "counter-test-".repeat(4), bankId: "MSB", accountNo: "1234567890", accountName: "TEST HOTEL" };
      const payments = require("../payments/payment.model")(repo, sepay);
      const intent = await payments.create(user, { kind: "DEPOSIT", bookingId: created.id, amount: 100 });
      assert.equal(intent.amount, 100);
      await payments.receive({ id: 101, transferType: "in", transferAmount: 100,
        content: intent.id, accountNumber: sepay.accountNo }, "Apikey " + sepay.apiKey);
      assert.equal(repo.snapshot().bookings[0].status, "CONFIRMED");
      assert.equal(repo.snapshot().bookings[0].deposit, 100);
      assert.equal(repo.snapshot().payments.length, 1);
      assert.equal(repo.snapshot().payments[0].method, "TRANSFER");
    }
  }
  });
});

test("counter booking rejects unsupported methods, unacknowledged cash and invalid transfer amounts", async () => {
  await withClock("2026-11-18T19:00:00+07:00", async () => {
  const state = emptyState();
  const today = rules.localDatePart(new Date());
  state.settings.push(setting);
  state.rooms.push({ id: "P1", typeId: "STD", status: "AVAILABLE" });
  state.types.push({ id: "STD", capacity: 2, dailyPrice: 500 });
  state.customers.push({ id: "KH1", isActive: true });
  const repo = makeRepo(state);
  const body = { customerId: "KH1", roomId: "P1", startAt: today,
    endAt: shiftDate(today, 1), guests: 1, deposit: 100 };
  for (const changes of [
    { method: "CARD", receiptConfirmed: true },
    { method: "CASH", receiptConfirmed: false },
    { method: "TRANSFER", deposit: 0 },
    { method: "TRANSFER", deposit: 501 },
  ]) await assert.rejects(createBookings(repo).create(user, { ...body, ...changes }), { status: 400 });
  assert.equal(repo.snapshot().bookings.length, 0);
  assert.equal(repo.snapshot().payments.length, 0);
  const transfer = await createBookings(repo).create(user, { ...body, method: "TRANSFER", receiptConfirmed: false });
  assert.equal(transfer.status, "PENDING");
  });
});

test("room change previews the surcharge and commits only on confirmation", async () => {
  const state = activeStayState();
  state.rooms.push({ id: "P2", typeId: "STD", status: "AVAILABLE" });
  const repo = makeRepo(state);
  const stays = createStays(repo);

  const plan = await stays.previewMove(user, { id: "PT1", roomId: "P2" });
  assert.equal(plan.extra, 0);
  assert.equal(plan.nextRoomId, "P2");

  const result = await stays.changeRoom(user, {
    id: "PT1",
    roomId: "P2",
    expectedExtra: plan.extra,
  });
  const saved = repo.snapshot();
  const booking = saved.bookings.find((item) => item.id === "DP1");
  const oldHistory = saved.history.find((item) => item.id === 1);
  const newHistory = saved.history.find(
    (item) => item.stayId === "PT1" && !item.toAt,
  );

  assert.equal(result.currentRoomId, "P2");
  assert.equal(booking.roomId, "P2");
  assert.ok(oldHistory.toAt);
  assert.equal(newHistory.roomId, "P2");
  assert.equal(saved.rooms.find((item) => item.id === "P1").status, "DIRTY");
  assert.equal(saved.rooms.find((item) => item.id === "P2").status, "OCCUPIED");
  assert.equal(
    await rules.available(repo, "P1", new Date().toISOString(), booking.endAt),
    true,
  );
  assert.equal(
    await rules.available(repo, "P2", new Date().toISOString(), booking.endAt),
    false,
  );
});

test("room change rejects a stale surcharge estimate", async () => {
  const state = activeStayState();
  state.rooms.push({ id: "P2", typeId: "VIP", status: "AVAILABLE" });
  state.types.push({
    id: "VIP",
    capacity: 4,
    nightlyPrice: 1000,
    dailyPrice: 1000,
  });
  const repo = makeRepo(state);

  await assert.rejects(
    createStays(repo).changeRoom(user, {
      id: "PT1",
      roomId: "P2",
      expectedExtra: 0,
    }),
    /Phụ thu đổi phòng đã thay đổi/,
  );
  assert.equal(repo.snapshot().bookings[0].roomId, "P1");
});

test("cleaning cannot close maintenance; Admin resolves repairs separately", async () => {
  const state = emptyState();
  state.rooms.push({ id: "P1", typeId: "STD", status: "MAINTENANCE" });
  state.tasks.push({
    id: "DD1",
    roomId: "P1",
    stayId: null,
    status: "MAINTENANCE",
  });
  const repo = makeRepo(state);
  const housekeeping = createHousekeeping(repo);

  await assert.rejects(
    housekeeping.clean({ id: "TK7", role: "HOUSEKEEPER" }, { id: "P1" }),
    /không ở trạng thái cần dọn/,
  );
  await assert.rejects(
    housekeeping.resolveMaintenance({ id: "TK2", role: "MANAGER" }, { id: "P1" }),
    { status: 403 },
  );
  await housekeeping.resolveMaintenance(
    { id: "TK2", role: "ADMIN" },
    { id: "P1" },
  );
  const saved = repo.snapshot();
  assert.equal(saved.rooms[0].status, "AVAILABLE");
  assert.equal(saved.tasks[0].status, "DONE");
});

test("stay extension updates the departure and room charge atomically", async () => {
  const state = activeStayState();
  const oldEndAt = state.bookings[0].endAt;
  const endDate = shiftDate(rules.localDatePart(oldEndAt), 2);
  const repo = makeRepo(state);

  const result = await createStays(repo).extend(user, {
    id: "PT1",
    endDate,
  });
  const saved = repo.snapshot();

  assert.equal(rules.localDatePart(result.endAt), endDate);
  assert.equal(result.extensionCharge, 1000);
  assert.equal(saved.bookings[0].endAt, result.endAt);
  assert.equal(saved.bookings[0].roomCharge, 2000);
  assert.equal(saved.stays[0].roomCharge, 2000);
  assert.match(saved.audit[0].action, /Gia hạn/);
});

test("stay extension rejects a conflicting future room booking", async () => {
  const state = activeStayState();
  const oldEndAt = state.bookings[0].endAt;
  const endDate = shiftDate(rules.localDatePart(oldEndAt), 2);
  state.bookings.push({
    id: "DP2",
    customerId: "KH1",
    roomId: "P1",
    startAt: oldEndAt,
    endAt: rules.fixedStayTimes(
      rules.localDatePart(oldEndAt),
      endDate,
      setting,
    ).endAt,
    guests: 1,
    status: "CONFIRMED",
    roomCharge: 1000,
    deposit: 100,
  });
  const repo = makeRepo(state);

  await assert.rejects(
    createStays(repo).extend(user, { id: "PT1", endDate }),
    /lịch trùng/,
  );
  assert.equal(repo.snapshot().bookings[0].endAt, oldEndAt);
});

test("stay extension atomically moves to a confirmed alternative room", async () => {
  const state = activeStayState();
  state.rooms.push({
    id: "P2",
    name: "Room 2",
    typeId: "STD",
    status: "AVAILABLE",
  });
  const oldEndAt = state.bookings[0].endAt;
  const endDate = shiftDate(rules.localDatePart(oldEndAt), 2);
  state.bookings.push({
    id: "DP2",
    customerId: "KH1",
    roomId: "P1",
    startAt: oldEndAt,
    endAt: rules.fixedStayTimes(
      rules.localDatePart(oldEndAt),
      endDate,
      setting,
    ).endAt,
    guests: 1,
    status: "CONFIRMED",
    roomCharge: 1000,
    deposit: 100,
  });
  const repo = makeRepo(state);

  const result = await createStays(repo).extend(user, {
    id: "PT1",
    endDate,
    roomId: "P2",
  });
  const saved = repo.snapshot();
  assert.equal(result.currentRoomId, "P2");
  assert.equal(saved.bookings[0].roomId, "P2");
  assert.equal(saved.rooms.find((room) => room.id === "P1").status, "DIRTY");
  assert.equal(saved.rooms.find((room) => room.id === "P2").status, "OCCUPIED");
  assert.equal(
    saved.history.find((row) => row.roomId === "P2" && !row.toAt)?.stayId,
    "PT1",
  );
});

test("open room history repairs legacy stale booking availability", async () => {
  const state = activeStayState();
  state.rooms[0].status = "DIRTY";
  state.rooms.push({ id: "P2", typeId: "STD", status: "OCCUPIED" });
  state.history[0].roomId = "P2";
  const repo = makeRepo(state);
  const booking = state.bookings[0];

  assert.equal(
    await rules.available(repo, "P1", new Date().toISOString(), booking.endAt),
    true,
  );
  assert.equal(
    await rules.available(repo, "P2", new Date().toISOString(), booking.endAt),
    false,
  );
});

test("workspace derives current room, invoice owner, and usage invoice", async () => {
  const state = activeStayState({
    usage: [
      {
        id: "SD1",
        stayId: "PT1",
        serviceId: "DV1",
        quantity: 1,
        unitPrice: 100,
        isVoided: false,
        invoiceId: null,
      },
      {
        id: "SD2",
        stayId: "PT1",
        serviceId: "DV1",
        quantity: 1,
        unitPrice: 100,
        isVoided: true,
        invoiceId: null,
      },
    ],
  });
  state.customers[0].accountId = "TK_CUSTOMER";
  state.invoices.push({
    id: "HD1",
    stayId: "PT1",
    customerId: "WRONG",
    status: "PAID",
  });
  state.lines.push({ id: 1, invoiceId: "HD1" });
  const repo = makeRepo(state);
  const model = createWorkspace(repo);

  const staffData = await model.workspace(user);
  assert.equal(staffData.stays[0].currentRoomId, "P1");
  assert.equal(staffData.stays[0].roomId, "P1");
  assert.equal(staffData.invoices[0].customerId, "KH1");
  assert.equal(staffData.usage[0].invoiceId, "HD1");
  assert.equal(staffData.usage[1].invoiceId, null);

  const customerData = await model.workspace({
    id: "TK_CUSTOMER",
    role: "CUSTOMER",
    isActive: true,
  });
  assert.deepEqual(customerData.invoices.map((item) => item.id), ["HD1"]);
});

test("service usage follows the room-type configuration and included price", async () => {
  const includedState = activeStayState();
  includedState.types[0].serviceConfig = [
    { serviceId: "DV1", included: true },
  ];
  const includedRepo = makeRepo(includedState);

  const row = await createUsage(includedRepo).addUsage(user, {
    stayId: "PT1",
    serviceId: "DV1",
    quantity: 2,
  });
  assert.equal(row.unitPrice, 0);

  const unavailableState = activeStayState();
  unavailableState.types[0].serviceConfig = [];
  const unavailableRepo = makeRepo(unavailableState);
  await assert.rejects(
    createUsage(unavailableRepo).addUsage(user, {
      stayId: "PT1",
      serviceId: "DV1",
      quantity: 1,
    }),
    /chưa được cấu hình/,
  );
  assert.equal(unavailableRepo.snapshot().usage.length, 0);
});

test("checkout links usage and records only a positive settlement", async () => {
  const state = activeStayState({
    usage: [
      {
        id: "SD1",
        stayId: "PT1",
        serviceId: "DV1",
        quantity: 1,
        unitPrice: 100,
        isVoided: false,
        invoiceId: null,
      },
    ],
  });
  const repo = makeRepo(state);
  const invoices = createInvoices(repo);
  const bill = await invoices.preview(user, "PT1");

  const result = await invoices.checkout(user, {
    id: "PT1",
    expectedDue: 100,
    fingerprint: bill.fingerprint,
    method: "CASH",
    receiptConfirmed: true,
  });
  const saved = repo.snapshot();

  assert.equal(saved.usage[0].invoiceId, result.id);
  assert.equal(saved.payments.length, 1);
  assert.equal(saved.payments[0].amount, 100);
  assert.equal(saved.invoices[0].status, "PAID");
  assert.equal(saved.invoices[0].customerName, "Test Guest");
  assert.equal(saved.invoices[0].roomName, "Room 1");
  assert.equal(saved.invoices[0].hotelName, "Test Hotel");
  await repo.transaction((tx) =>
    tx.update("customers", "KH1", { name: "Renamed Guest" }),
  );
  assert.equal(repo.snapshot().invoices[0].customerName, "Test Guest");
});

test("checkout skips zero settlement and rejects negative due", async () => {
  const zeroRepo = makeRepo(activeStayState());
  const zeroInvoices = createInvoices(zeroRepo);
  const zeroBill = await zeroInvoices.preview(user, "PT1");
  await zeroInvoices.checkout(user, {
    id: "PT1",
    expectedDue: 0,
    fingerprint: zeroBill.fingerprint,
    method: "CASH",
    receiptConfirmed: true,
  });
  assert.equal(zeroRepo.snapshot().payments.length, 0);

  const negativeRepo = makeRepo(activeStayState({ deposit: 1100 }));
  const negativeInvoices = createInvoices(negativeRepo);
  const negativeBill = await negativeInvoices.preview(user, "PT1");
  await assert.rejects(
    negativeInvoices.checkout(user, {
      id: "PT1",
      expectedDue: -100,
      fingerprint: negativeBill.fingerprint,
      method: "CASH",
      receiptConfirmed: true,
    }),
    /Tiền cọc vượt quá/,
  );
  assert.equal(negativeRepo.snapshot().invoices.length, 0);
  assert.equal(negativeRepo.snapshot().stays[0].checkOutAt, null);
});

test("checkout requires an explicit receipt confirmation", async () => {
  const repo = makeRepo(activeStayState());
  const invoices = createInvoices(repo);
  const bill = await invoices.preview(user, "PT1");

  await assert.rejects(
    invoices.checkout(user, {
      id: "PT1",
      expectedDue: 0,
      fingerprint: bill.fingerprint,
      method: "CASH",
    }),
    /xác nhận đã nhận hoặc đối soát tiền/,
  );
  assert.equal(repo.snapshot().invoices.length, 0);
  assert.equal(repo.snapshot().stays[0].checkOutAt, null);
});

test("checkout fingerprint detects equal-value bill line changes", async () => {
  const state = activeStayState({
    usage: [
      {
        id: "SD1",
        stayId: "PT1",
        serviceId: "DV1",
        quantity: 1,
        unitPrice: 100,
        isVoided: false,
        invoiceId: null,
      },
    ],
  });
  state.services.push({ id: "DV2", name: "Dịch vụ khác", price: 100 });
  const repo = makeRepo(state);
  const invoices = createInvoices(repo);
  const bill = await invoices.preview(user, "PT1");
  await repo.transaction((tx) => tx.update("usage", "SD1", { serviceId: "DV2" }));

  await assert.rejects(
    invoices.checkout(user, {
      id: "PT1",
      expectedDue: bill.due,
      fingerprint: bill.fingerprint,
      method: "CASH",
      receiptConfirmed: true,
    }),
    /Nội dung bảng kê đã thay đổi/,
  );
  assert.equal(repo.snapshot().invoices.length, 0);
});

test("annual holiday rate supports a year-end wrap", async () => {
  const state = emptyState();
  state.rooms.push({ id: "P1", typeId: "STD", status: "AVAILABLE" });
  state.types.push({ id: "STD", capacity: 2, dailyPrice: 100 });
  state.holidays.push({
    id: "GL1",
    typeId: "STD",
    scheduleType: "ANNUAL",
    startMonthDay: "12-31",
    endMonthDay: "01-01",
    percent: 100,
    isActive: true,
  });
  const repo = makeRepo(state);
  const { startAt, endAt } = rules.fixedStayTimes(
    "2026-12-30",
    "2027-01-02",
    setting,
  );

  assert.equal(await rules.quote(repo, "P1", startAt, endAt), 500);
});

test("checkout applies membership tier discount to bill and calculates earned points on net amount", async () => {
  const state = activeStayState({ deposit: 100 });
  state.bookings[0].roomCharge = 100000;
  state.stays[0].roomCharge = 100000;
  state.cards.push({ id: "TV1", customerId: "KH1", points: 550, isActive: true });
  const repo = makeRepo(state);
  const invoices = createInvoices(repo);

  const bill = await invoices.preview(user, "PT1");
  assert.equal(bill.tier.code, "GOLD");
  assert.equal(bill.tier.percent, 10);
  assert.equal(bill.discount, 10000);
  assert.equal(bill.due, 89900);
  assert.equal(bill.earnedPoints, 9);

  await invoices.checkout(user, {
    id: "PT1",
    expectedDue: bill.due,
    fingerprint: bill.fingerprint,
    method: "CASH",
    receiptConfirmed: true,
  });
  const saved = repo.snapshot();
  assert.equal(saved.invoices[0].discount, 10000);
  assert.ok(saved.lines.some((line) => line.lineType === "DISCOUNT" && line.unitPrice === 10000));
});

test("walk-in check-in, checkout surcharge adjustment, and auto-issuing membership card at checkout", async () => {
  const state = emptyState();
  const today = rules.localDatePart(new Date());
  const tomorrow = shiftDate(today, 1);
  state.settings.push(setting);
  state.rooms.push({ id: "P1", name: "Room 101", typeId: "STD", status: "AVAILABLE" });
  state.types.push({ id: "STD", capacity: 2, dailyPrice: 500000 });
  const repo = makeRepo(state);
  const stays = createStays(repo);
  const invoices = createInvoices(repo);

  const stay = await stays.walkIn(user, {
    roomId: "P1",
    customerName: "Walk-in Guest",
    customerPhone: "0912345678",
    identityNo: "079099999999",
    endAt: tomorrow,
    guests: 1,
    deposit: 100000,
  });
  assert.equal(stay.currentRoomId, "P1");
  assert.equal(repo.snapshot().rooms[0].status, "OCCUPIED");
  assert.equal(repo.snapshot().cards.length, 0);

  await stays.addSurcharge(user, { id: stay.id, amount: 50000, note: "Trả phòng muộn" });
  const bill = await invoices.preview(user, stay.id);
  assert.equal(bill.surcharge, 50000);
  assert.equal(bill.canIssueCard, true);
  assert.equal(bill.earnedPoints, 55);

  await invoices.checkout(user, {
    id: stay.id,
    expectedDue: bill.due,
    fingerprint: bill.fingerprint,
    method: "CASH",
    receiptConfirmed: true,
  });
  const saved = repo.snapshot();
  assert.equal(saved.cards.length, 1);
  assert.equal(saved.cards[0].isActive, true);
});

test("normal check-in rejects another customer's document without losing the confirmed deposit", async () => {
  await withClock("2026-11-18T19:00:00+07:00", async () => {
    const state = emptyState();
    state.settings.push(setting);
    state.rooms.push({ id: "P1", typeId: "STD", status: "AVAILABLE" });
    state.types.push({ id: "STD", capacity: 2, dailyPrice: 500 });
    state.customers.push(
      { id: "KH1", identityNo: "ID-OLD", isActive: true },
      { id: "KH2", identityNo: "DOC-TAKEN", isActive: true },
    );
    const repo = makeRepo(state);
    const booking = await createBookings(repo).create(user, {
      customerId: "KH1", roomId: "P1", startAt: "2026-11-18", endAt: "2026-11-19",
      guests: 1, deposit: 100, method: "CASH", receiptConfirmed: true,
    });
    await assert.rejects(createStays(repo).checkIn(user, {
      id: booking.id, identityNo: " doc-taken ",
    }), { status: 409, message: "Giấy tờ đã thuộc hồ sơ khác." });
    const saved = repo.snapshot();
    assert.equal(saved.bookings[0].status, "CONFIRMED");
    assert.equal(saved.bookings[0].deposit, 100);
    assert.equal(saved.payments.length, 1);
    assert.equal(saved.stays.length, 0);
    assert.equal(saved.rooms[0].status, "AVAILABLE");
    assert.equal(saved.customers[0].identityNo, "ID-OLD");
  });
});

test("walk-in rejects an identity document already assigned to another customer", async () => {
  const state = emptyState();
  const today = rules.localDatePart(new Date());
  const tomorrow = shiftDate(today, 1);
  state.settings.push(setting);
  state.rooms.push({ id: "P1", name: "Room 101", typeId: "STD", status: "AVAILABLE" });
  state.types.push({ id: "STD", capacity: 2, dailyPrice: 500000 });
  state.customers.push(
    { id: "KH1", name: "Selected Guest", phone: "0912345678", identityNo: "ID-OLD", isActive: true },
    { id: "KH2", name: "Other Guest", phone: "0912345679", identityNo: "DOC-TAKEN", isActive: true },
  );
  const repo = makeRepo(state);

  await assert.rejects(
    createStays(repo).walkIn(user, {
      roomId: "P1",
      customerId: "KH1",
      identityNo: " doc-taken ",
      endAt: tomorrow,
      guests: 1,
    }),
    { status: 409, message: "Giấy tờ đã thuộc hồ sơ khác." },
  );

  const saved = repo.snapshot();
  assert.equal(saved.customers.find((item) => item.id === "KH1").identityNo, "ID-OLD");
  assert.equal(saved.customers.find((item) => item.id === "KH2").identityNo, "DOC-TAKEN");
  assert.equal(saved.bookings.length, 0);
  assert.equal(saved.stays.length, 0);
  assert.equal(saved.rooms[0].status, "AVAILABLE");
});

test("booking cancellation: staff keeps deposit on no-show, customer gets refund within 2h and rejected past 2h", async () => {
  const initial = emptyState();
  initial.settings = [setting];
  initial.rooms = [{ id: "P1", name: "101", typeId: "LP1", floor: 1, status: "OCCUPIED" }];
  initial.customers = [{ id: "C1", accountId: "U_CUST", isActive: true }];
  initial.bookings = [
    {
      id: "B_STAFF",
      customerId: "C1",
      roomId: "P1",
      status: "CONFIRMED",
      deposit: 208000,
      roomCharge: 520000,
      startAt: new Date(Date.now() + 86400000).toISOString(),
      endAt: new Date(Date.now() + 172800000).toISOString(),
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    {
      id: "B_FRESH",
      customerId: "C1",
      roomId: "P1",
      status: "CONFIRMED",
      deposit: 208000,
      roomCharge: 520000,
      startAt: new Date(Date.now() + 86400000).toISOString(),
      endAt: new Date(Date.now() + 172800000).toISOString(),
      createdAt: new Date(Date.now() - 3600000 * 0.5).toISOString(),
    },
    {
      id: "B_OLD",
      customerId: "C1",
      roomId: "P1",
      status: "CONFIRMED",
      deposit: 208000,
      roomCharge: 520000,
      startAt: new Date(Date.now() + 86400000).toISOString(),
      endAt: new Date(Date.now() + 172800000).toISOString(),
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    },
  ];
  const repo = makeRepo(initial);
  const bookings = createBookings(repo);
  const staff = { id: "U_STAFF", role: "RECEPTIONIST" };
  const customer = { id: "U_CUST", role: "CUSTOMER" };

  // 1. Staff cancels confirmed no-show booking -> deposit is retained
  const resStaff = await bookings.cancel(staff, { id: "B_STAFF" });
  assert.equal(resStaff.ok, true);
  assert.equal(resStaff.refunded, false);
  const bStaff = (await repo.list("bookings")).find((b) => b.id === "B_STAFF");
  assert.equal(bStaff.status, "CANCELLED");
  assert.equal(bStaff.deposit, 208000);

  // 2. Customer cancels fresh confirmed booking within 2 hours -> deposit is refunded (set to 0 for financial sync)
  const resCust = await bookings.cancel(customer, { id: "B_FRESH" });
  assert.equal(resCust.ok, true);
  assert.equal(resCust.refunded, true);
  assert.equal(resCust.refundAmount, 208000);
  const bFresh = (await repo.list("bookings")).find((b) => b.id === "B_FRESH");
  assert.equal(bFresh.status, "CANCELLED");
  assert.equal(bFresh.deposit, 0);

  // 3. Customer tries to cancel booking older than 2 hours -> rejected
  await assert.rejects(
    async () => {
      await bookings.cancel(customer, { id: "B_OLD" });
    },
    (err) => err.message.includes("2 tiếng"),
  );
  const bOld = (await repo.list("bookings")).find((b) => b.id === "B_OLD");
  assert.equal(bOld.status, "CONFIRMED");
});
