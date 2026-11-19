const test = require("node:test");
const assert = require("node:assert/strict");
const customerModel = require("./customer.model");
const profileModel = require("../profile/profile.model");
const membershipModel = require("../memberships/membership.model");

const copy = (value) => structuredClone(value);

function createRepo(initial) {
  let state = copy(initial);
  const client = (data) => ({
    async list(entity) {
      return copy(data[entity]);
    },
    async find(entity, id) {
      return copy(
        data[entity].find((row) => String(row.id) === String(id)) || null,
      );
    },
    async insert(entity, row) {
      data[entity].push(copy(row));
      return copy(row);
    },
    async update(entity, id, changes) {
      const row = data[entity].find(
        (item) => String(item.id) === String(id),
      );
      assert.ok(row, `${entity}/${id} must exist`);
      Object.assign(row, copy(changes));
    },
  });
  return {
    snapshot: () => copy(state),
    async list(entity) {
      return client(state).list(entity);
    },
    async find(entity, id) {
      return client(state).find(entity, id);
    },
    async transaction(work) {
      const draft = copy(state);
      const result = await work(client(draft));
      state = draft;
      return result;
    },
  };
}

function data() {
  return {
    accounts: [
      {
        id: "TK01",
        role: "CUSTOMER",
        name: "Tên cũ",
        phone: "0900000000",
        isActive: true,
        authVersion: 3,
      },
    ],
    customers: [
      {
        id: "KH01",
        accountId: "TK01",
        name: "Tên cũ",
        phone: "0900000000",
        identityNo: "ID-01",
        address: "Địa chỉ cũ",
        isActive: true,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "KH02",
        accountId: null,
        name: "Khách tại quầy",
        phone: "0911111111",
        identityNo: "ID-02",
        address: "",
        isActive: true,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    bookings: [],
    stays: [],
    invoices: [],
    cards: [
      {
        id: "TV01",
        customerId: "KH01",
        points: 40,
        isActive: true,
        issuedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    points: [
      {
        id: "HD01",
        cardId: "TV01",
        points: 40,
        createdAt: "2026-02-01T00:00:00.000Z",
      },
      {
        id: "HD-OTHER",
        cardId: "TV-OTHER",
        points: 99,
        createdAt: "2026-02-02T00:00:00.000Z",
      },
    ],
    audit: [],
  };
}

const receptionist = { id: "TK-RECEPTION", role: "RECEPTIONIST" };

test("customer edit synchronizes linked account and rolls back duplicate identity", async () => {
  const repo = createRepo(data());
  const model = customerModel(repo);
  await model.save(receptionist, {
    id: "KH01",
    name: "Tên đồng bộ",
    phone: "0901234567",
    identityNo: "id-01",
    address: "A".repeat(512),
  });
  let state = repo.snapshot();
  assert.equal(state.customers[0].name, "Tên đồng bộ");
  assert.equal(state.accounts[0].name, "Tên đồng bộ");
  assert.equal(state.accounts[0].phone, "0901234567");
  assert.equal(state.customers[0].address.length, 512);

  await assert.rejects(
    model.save(receptionist, {
      id: "KH01",
      name: "Không được lưu",
      phone: "0901234567",
      identityNo: "id-02",
      address: "Hợp lệ",
    }),
    (error) => error.status === 409,
  );
  state = repo.snapshot();
  assert.equal(state.customers[0].name, "Tên đồng bộ");
  assert.equal(state.accounts[0].name, "Tên đồng bộ");
});

test("self profile enforces the shared address limit and updates both records", async () => {
  const repo = createRepo(data());
  const model = profileModel(repo);
  const user = repo.snapshot().accounts[0];
  await model.update(user, {
    name: "Hồ sơ mới",
    phone: "0907654321",
    identityNo: "SELF-01",
    address: "Địa chỉ mới",
  });
  let state = repo.snapshot();
  assert.equal(state.accounts[0].name, "Hồ sơ mới");
  assert.equal(state.customers[0].name, "Hồ sơ mới");
  assert.equal(state.customers[0].identityNo, "SELF-01");

  await assert.rejects(
    model.update(user, {
      name: "Không được lưu",
      phone: "0907654321",
      identityNo: "SELF-01",
      address: "x".repeat(513),
    }),
  );
  state = repo.snapshot();
  assert.equal(state.accounts[0].name, "Hồ sơ mới");
  assert.equal(state.customers[0].name, "Hồ sơ mới");
});

test("reception archive blocks unfinished business and retires linked access", async () => {
  const initial = data();
  initial.bookings.push({
    id: "DP01",
    customerId: "KH01",
    status: "CONFIRMED",
  });
  const repo = createRepo(initial);
  const model = customerModel(repo);
  await assert.rejects(model.archive(receptionist, { id: "KH01" }));
  assert.equal(repo.snapshot().customers[0].isActive, true);

  const state = repo.snapshot();
  state.bookings[0].status = "COMPLETED";
  state.stays.push({ id: "PT01", bookingId: "DP01", checkOutAt: null });
  const openStayRepo = createRepo(state);
  await assert.rejects(
    customerModel(openStayRepo).archive(receptionist, { id: "KH01" }),
  );
  const completed = openStayRepo.snapshot();
  completed.stays[0].checkOutAt = "2026-02-01T00:00:00.000Z";
  completed.invoices.push({ id: "HD01", stayId: "PT01", status: "PAID" });
  const completedRepo = createRepo(completed);
  await customerModel(completedRepo).archive(receptionist, { id: "KH01" });
  const archived = completedRepo.snapshot();
  assert.equal(archived.customers[0].isActive, false);
  assert.equal(archived.cards[0].isActive, false);
  assert.equal(archived.accounts[0].isActive, false);
  assert.equal(archived.accounts[0].authVersion, 4);
});

test("membership ledger is owner-filtered and a customer receives only one card", async () => {
  const repo = createRepo(data());
  const model = membershipModel(repo);
  const mine = await model.data({ id: "TK01", role: "CUSTOMER" });
  assert.deepEqual(mine.cards.map((card) => card.id), ["TV01"]);
  assert.deepEqual(mine.points.map((entry) => entry.id), ["HD01"]);

  const issued = await model.issueCard(receptionist, { customerId: "KH02" });
  assert.equal(issued.customerId, "KH02");
  assert.equal(issued.points, 0);
  await assert.rejects(
    model.issueCard(receptionist, { customerId: "KH02" }),
    (error) => error.status === 409,
  );
  const admin = { id: "TK-ADMIN", role: "ADMIN" };
  await assert.rejects(
    model.disableCard(receptionist, { id: issued.id }),
    (error) => error.status === 403,
  );
  const req = await model.requestDisable(receptionist, {
    id: issued.id,
    reason: "Khách báo mất thẻ",
  });
  assert.equal(req.ok, true);
  assert.equal(req.status, "PENDING");
  await model.approveDisable(admin, { id: issued.id });
  const state = repo.snapshot();
  assert.equal(
    state.cards.find((card) => card.id === issued.id).isActive,
    false,
  );
  await assert.rejects(
    model.reactivateCard(receptionist, { id: issued.id }),
    (error) => error.status === 403,
  );
  await model.reactivateCard(admin, { id: issued.id });
  const reactivatedState = repo.snapshot();
  assert.equal(
    reactivatedState.cards.find((card) => card.id === issued.id).isActive,
    true,
  );
  assert.equal(state.points.length, 2);
});
