const test = require("node:test");
const assert = require("node:assert/strict");
const createUsage = require("./serviceUsage.model");

const user = { id: "STAFF", role: "RECEPTIONIST", isActive: true };

function fixture(change = () => {}, fail = () => false) {
  let state = {
    stays: [{ id: "ST1", checkOutAt: null }],
    history: [
      { stayId: "ST1", roomId: "OLD", toAt: "2026-01-01" },
      { stayId: "ST1", roomId: "R1", toAt: null },
    ],
    rooms: [{ id: "R1", typeId: "T1" }, { id: "OLD", typeId: "T0" }],
    types: [
      { id: "T0", serviceConfig: [{ serviceId: "OTHER", included: false }] },
      { id: "T1", serviceConfig: [
        { serviceId: "PAID1", included: false },
        { serviceId: "PAID2", included: false },
        { serviceId: "FREE", included: true },
        { serviceId: "OFF", included: false },
      ] },
    ],
    services: [
      { id: "PAID1", name: "Water", price: 12000, isActive: true },
      { id: "PAID2", name: "Laundry", price: 30000, isActive: true },
      { id: "FREE", name: "Breakfast", price: 50000, isActive: true },
      { id: "OFF", name: "Closed", price: 10000, isActive: false },
      { id: "OTHER", name: "Other", price: 10000, isActive: true },
    ],
    usage: [], audit: [],
  };
  change(state);
  let transactions = 0;
  const repo = {
    async transaction(work) {
      transactions++;
      const draft = structuredClone(state);
      const result = await work({
        async find(entity, id) {
          return structuredClone(draft[entity].find((row) => String(row.id).toUpperCase() === String(id).toUpperCase()) || null);
        },
        async list(entity) { return structuredClone(draft[entity]); },
        async insert(entity, row) {
          if (fail(entity, row, draft)) throw new Error("injected write failure");
          draft[entity].push(structuredClone(row));
          return structuredClone(row);
        },
      });
      state = draft;
      return result;
    },
  };
  return { model: createUsage(repo), snapshot: () => structuredClone(state), transactions: () => transactions };
}

test("batch snapshots server prices, defaults omitted quantity to one, and writes audit atomically", async () => {
  const f = fixture();
  const result = await f.model.addUsage(user, {
    stayId: "ST1", unitPrice: 1, total: 1,
    items: [{ serviceId: "PAID1", quantity: 2, unitPrice: 1 }, { serviceId: "PAID2" }],
  });
  assert.equal(f.transactions(), 1);
  assert.equal(result.items.length, 2);
  assert.equal(result.total, 54000);
  assert.deepEqual(result.items.map((row) => [row.serviceId, row.quantity, row.unitPrice]), [
    ["PAID1", 2, 12000], ["PAID2", 1, 30000],
  ]);
  for (const row of result.items) {
    assert.equal(row.stayId, "ST1");
    assert.equal(row.recordedBy, user.id);
    assert.equal(row.isVoided, false);
    assert.equal(row.invoiceId, null);
    assert.ok(Number.isFinite(Date.parse(row.usedAt)));
  }
  assert.equal(f.snapshot().audit.length, 2);
});

test("legacy single included service still returns a zero-priced row", async () => {
  const f = fixture();
  const row = await f.model.addUsage(user, { stayId: "ST1", serviceId: "FREE", quantity: "2", unitPrice: 999 });
  assert.equal(row.unitPrice, 0);
  assert.equal(row.quantity, 2);
  assert.equal(row.serviceId, "FREE");
  assert.equal(f.snapshot().audit.length, 1);
});

test("batch rejects invalid envelopes, duplicates, services, and quantities without partial records", async () => {
  const invalidItems = [
    null, {}, [], Array.from({ length: 51 }, () => ({ serviceId: "PAID1" })),
    [null], ["PAID1"], [{}], [{ serviceId: [] }],
    [{ serviceId: "PAID1" }, { serviceId: "PAID1" }],
    [{ serviceId: "PAID1" }, { serviceId: " PAID1 " }],
    [{ serviceId: "PAID1" }, { serviceId: "paid1" }],
    ...["FREE", "OFF", "OTHER", "MISSING"].map((serviceId) => [{ serviceId: "PAID1" }, { serviceId }]),
    ...[0, -1, 1.5, 1001, "", null, true, [], {}, "NaN", Infinity].map((quantity) => [
      { serviceId: "PAID1" }, { serviceId: "PAID2", quantity },
    ]),
  ];
  for (const items of invalidItems) {
    const f = fixture();
    const before = f.snapshot();
    await assert.rejects(f.model.addUsage(user, { stayId: "ST1", items }), undefined, JSON.stringify(items));
    assert.deepEqual(f.snapshot(), before);
  }
});

test("batch requires an active stay, current room assignment and current type configuration", async () => {
  for (const change of [
    (state) => { state.stays = []; },
    (state) => { state.stays[0].checkOutAt = "2026-01-01"; },
    (state) => { state.history = state.history.filter((row) => row.toAt); },
    (state) => { state.rooms = []; },
    (state) => { state.types = []; },
    (state) => { state.types[1].serviceConfig = []; },
  ]) {
    const f = fixture(change);
    await assert.rejects(f.model.addUsage(user, { stayId: "ST1", items: [{ serviceId: "PAID1" }] }));
    assert.equal(f.snapshot().usage.length, 0);
    assert.equal(f.snapshot().audit.length, 0);
  }
});

test("failure inserting a later usage or audit rolls back every usage and audit", async () => {
  for (const fail of [
    (entity, row) => entity === "usage" && row.serviceId === "PAID2",
    (entity, row, state) => entity === "audit" && state.audit.length === 1,
  ]) {
    const f = fixture(undefined, fail);
    const before = f.snapshot();
    await assert.rejects(f.model.addUsage(user, {
      stayId: "ST1", items: [{ serviceId: "PAID1" }, { serviceId: "PAID2" }],
    }), /injected write failure/);
    assert.deepEqual(f.snapshot(), before);
  }
});

test("batch accepts boundary quantities and requires usage permission", async () => {
  const f = fixture();
  const result = await f.model.addUsage(user, {
    stayId: "ST1", items: [{ serviceId: "PAID1", quantity: 1000 }, { serviceId: "PAID2", quantity: "1" }],
  });
  assert.equal(result.total, 12030000);
  const denied = fixture();
  await assert.rejects(denied.model.addUsage({ ...user, role: "CUSTOMER" }, {
    stayId: "ST1", items: [{ serviceId: "PAID1" }],
  }));
  assert.equal(denied.transactions(), 0);
});

test("batch accepts fifty distinct services in one transaction", async () => {
  const f = fixture((state) => {
    state.services = Array.from({ length: 50 }, (_, index) => ({
      id: `S${index}`, name: `Service ${index}`, price: 100, isActive: true,
    }));
    state.types[1].serviceConfig = state.services.map((service) => ({ serviceId: service.id, included: false }));
  });
  const result = await f.model.addUsage(user, {
    stayId: "ST1", items: f.snapshot().services.map((service) => ({ serviceId: service.id })),
  });
  assert.equal(result.items.length, 50);
  assert.equal(result.total, 5000);
  assert.equal(f.snapshot().audit.length, 50);
  assert.equal(f.transactions(), 1);
});
