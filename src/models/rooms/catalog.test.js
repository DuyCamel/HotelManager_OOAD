const test = require("node:test");
const assert = require("node:assert/strict");
const createRoomModel = require("./room.model");
const createTypeModel = require("../room-types/roomType.model");
const createServiceModel = require("../services/service.model");
const createHolidayModel = require("../holiday-rates/holidayRate.model");

const admin = { id: "TK02", role: "ADMIN" };

function repository(seed = {}, mode = "demo") {
  const state = {
    rooms: [],
    types: [],
    services: [],
    holidays: [],
    bookings: [],
    tasks: [],
    audit: [],
    ...structuredClone(seed),
  };
  const client = {
    async list(key) {
      return structuredClone(state[key]);
    },
    async find(key, id) {
      return structuredClone(
        state[key].find((row) => String(row.id) === String(id)) || null,
      );
    },
    async insert(key, row) {
      const value = structuredClone(row);
      if (value.id === undefined) value.id = state[key].length + 1;
      state[key].push(value);
      return structuredClone(value);
    },
    async update(key, id, changes) {
      Object.assign(
        state[key].find((row) => String(row.id) === String(id)),
        structuredClone(changes),
      );
    },
  };
  return {
    mode,
    state,
    async transaction(work) {
      return work(client);
    },
  };
}

test("room persists validated catalog metadata without a room price", async () => {
  const repo = repository({
    types: [{ id: "STD", name: "Standard", nightlyPrice: 500000 }],
  });
  const room = await createRoomModel(repo).save(admin, {
    code: "P101",
    name: "Phòng 101",
    typeId: "STD",
    status: "AVAILABLE",
    imageUrl: "https://images.example/cover.webp",
    galleryUrls: "https://images.example/one.webp\nhttps://images.example/two.webp",
    viewName: "Hướng vườn",
    amenities: "Ban công, bồn tắm",
    note: "Tầng 1",
  });
  const stored = repo.state.rooms[0];
  assert.equal(room.imagePath, "https://images.example/cover.webp");
  assert.equal(stored.viewName, "Hướng vườn");
  assert.deepEqual(JSON.parse(stored.imageGalleryJson), [
    "https://images.example/one.webp",
    "https://images.example/two.webp",
  ]);
  assert.equal(Object.hasOwn(stored, "price"), false);
});

test("room auto-generates code from name or next sequence when code is omitted", async () => {
  const repo = repository({
    types: [{ id: "STD", name: "Standard", nightlyPrice: 500000 }],
    rooms: [
      { id: "P101", name: "Phòng 101", typeId: "STD", status: "AVAILABLE" },
    ],
  });
  const model = createRoomModel(repo);

  // 1. Tự sinh mã P205 từ tên 'Phòng 205'
  const room1 = await model.save(admin, {
    name: "Phòng 205",
    typeId: "STD",
    status: "AVAILABLE",
  });
  assert.equal(room1.id, "P205");

  // 2. Tự sinh mã kế tiếp khi tên không chứa số
  const room2 = await model.save(admin, {
    name: "Suite Hoàng Gia",
    typeId: "STD",
    status: "AVAILABLE",
  });
  assert.equal(room2.id, "P206");
});

test("catalog cannot bypass an open maintenance workflow", async () => {
  const repo = repository({
    types: [{ id: "STD", name: "Standard", nightlyPrice: 500000 }],
    rooms: [
      {
        id: "P101",
        name: "Phòng 101",
        typeId: "STD",
        status: "MAINTENANCE",
      },
    ],
    tasks: [{ id: "DD1", roomId: "P101", status: "MAINTENANCE" }],
  });
  const model = createRoomModel(repo);

  for (const status of ["DISABLED", "AVAILABLE"])
    await assert.rejects(
      model.save(admin, {
        id: "P101",
        name: "Phòng 101",
        typeId: "STD",
        status,
      }),
      /chỉ được mở lại sau khi xác nhận sửa chữa/,
    );
});

test("room type owns nightly price and a typed service configuration", async () => {
  const repo = repository({
    services: [
      { id: "BREAKFAST", name: "Ăn sáng" },
      { id: "SPA", name: "Spa" },
    ],
  });
  const type = await createTypeModel(repo).save(admin, {
    name: "Deluxe",
    capacity: "2",
    beds: "1",
    nightlyPrice: "900000",
    amenities: "Wi-Fi, TV",
    serviceConfigTouched: "1",
    serviceConfig: JSON.stringify([
      { serviceId: "BREAKFAST", included: true },
      { serviceId: "SPA", included: false },
    ]),
  });
  assert.equal(type.nightlyPrice, 900000);
  assert.equal(type.dailyPrice, 900000);
  assert.equal(type.hourlyPrice, 225000);
  assert.deepEqual(type.serviceConfig, [
    { serviceId: "BREAKFAST", included: true },
    { serviceId: "SPA", included: false },
  ]);
});

test("annual holiday uses month-day fields and blocks cross-kind overlap", async () => {
  const repo = repository({ types: [{ id: "STD", name: "Standard" }] });
  const model = createHolidayModel(repo);
  const annual = await model.save(admin, {
    name: "Tết dương lịch",
    typeId: "STD",
    scheduleType: "ANNUAL",
    startMonthDay: "12-30",
    endMonthDay: "01-02",
    percent: "20",
  });
  assert.equal(annual.startDate, null);
  assert.equal(annual.startMonthDay, "12-30");
  await assert.rejects(
    model.save(admin, {
      name: "Ngày đầu năm 2028",
      typeId: "STD",
      scheduleType: "ONE_OFF",
      startDate: "2028-01-01",
      endDate: "2028-01-01",
      percent: "10",
    }),
    /chồng lấn/,
  );
});

test("services.read never authorizes a catalog mutation", async () => {
  const repo = repository();
  await assert.rejects(
    createServiceModel(repo).save(
      { id: "TK03", role: "RECEPTIONIST" },
      { name: "Spa", unit: "Lượt", price: "100000" },
    ),
    /không có quyền/,
  );
});

test("SQL service configuration fails clearly without composite-key adapter methods", async () => {
  const repo = repository(
    {
      services: [{ id: "BREAKFAST", name: "Ăn sáng" }],
    },
    "sqlserver",
  );
  await assert.rejects(
    createTypeModel(repo).save(admin, {
      name: "Standard",
      capacity: "2",
      beds: "1",
      nightlyPrice: "500000",
      serviceConfigTouched: "1",
      serviceConfig: JSON.stringify([
        { serviceId: "BREAKFAST", included: true },
      ]),
    }),
    /list\/replaceRoomTypeServices/,
  );
  assert.equal(repo.state.types.length, 0);
});

test("bulkEdit updates room type, status, and view for multiple rooms atomically", async () => {
  const repo = repository({
    types: [
      { id: "STD", name: "Standard", nightlyPrice: 500000 },
      { id: "VIP", name: "VIP", nightlyPrice: 1000000 },
    ],
    rooms: [
      { id: "P101", name: "Phòng 101", typeId: "STD", status: "AVAILABLE", viewName: "Hướng phố" },
      { id: "P102", name: "Phòng 102", typeId: "STD", status: "AVAILABLE", viewName: "Hướng phố" },
      { id: "P103", name: "Phòng 103", typeId: "STD", status: "AVAILABLE", viewName: "Hướng phố" },
    ],
  });
  const model = createRoomModel(repo);

  // 1. Bulk edit type and view on P101 and P102
  const res = await model.bulkEdit(admin, {
    roomIds: ["P101", "P102"],
    applyType: true,
    typeId: "VIP",
    applyView: true,
    viewName: "Hướng biển",
  });
  assert.equal(res.ok, true);
  assert.equal(res.count, 2);

  const p101 = repo.state.rooms.find((r) => r.id === "P101");
  const p102 = repo.state.rooms.find((r) => r.id === "P102");
  const p103 = repo.state.rooms.find((r) => r.id === "P103");

  assert.equal(p101.typeId, "VIP");
  assert.equal(p101.viewName, "Hướng biển");
  assert.equal(p102.typeId, "VIP");
  assert.equal(p102.viewName, "Hướng biển");
  assert.equal(p103.typeId, "STD"); // P103 unchanged
  assert.equal(p103.viewName, "Hướng phố");

  // 2. Bulk edit status
  await model.bulkEdit(admin, {
    roomIds: ["P101", "P103"],
    applyStatus: true,
    status: "MAINTENANCE",
  });
  assert.equal(repo.state.rooms.find((r) => r.id === "P101").status, "MAINTENANCE");
  assert.equal(repo.state.rooms.find((r) => r.id === "P103").status, "MAINTENANCE");
  assert.equal(repo.state.rooms.find((r) => r.id === "P102").status, "AVAILABLE");

  // 3. Reject if no rooms or no fields
  await assert.rejects(
    model.bulkEdit(admin, { roomIds: [], applyType: true, typeId: "STD" }),
    /ít nhất một phòng/,
  );
  await assert.rejects(
    model.bulkEdit(admin, { roomIds: ["P101"] }),
    /ít nhất một thông tin/,
  );

  // 4. Reject type change if active booking exists
  repo.state.bookings.push({
    id: "DP01",
    roomId: "P103",
    status: "CONFIRMED",
    startAt: "2026-11-20",
    endAt: "2026-11-25",
  });
  await assert.rejects(
    model.bulkEdit(admin, { roomIds: ["P103"], applyType: true, typeId: "VIP" }),
    /chưa hoàn tất/,
  );
});
