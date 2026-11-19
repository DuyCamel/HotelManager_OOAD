const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");

const privateValues = [
  "PRIVATE-GUEST", "PRIVATE-BOOKING", "PRIVATE-STAY", "PRIVATE-CUSTOMER",
  "PRIVATE-PHONE", "PRIVATE-DOCUMENT", "PRIVATE-NOTE", "987654321",
];

function board(role = "RECEPTIONIST") {
  let dialog;
  const listeners = {};
  const sandbox = vm.createContext({
    document: {
      querySelector: () => null,
      head: { append() {} },
      body: { append(node) { dialog = node; } },
      addEventListener(name, callback) { listeners[name] = callback; },
      createElement: () => ({
        setAttribute() {}, addEventListener() {}, querySelector: () => null,
        showModal() {},
      }),
    },
  });
  const source = readFileSync(join(__dirname, "housekeeping.js"), "utf8")
    .replace("export default function createModule", "function createModule");
  vm.runInContext(source, sandbox);
  const today = vm.runInContext("localDate()", sandbox);
  const ctx = {
    role, page: "board", clean: ["ADMIN", "HOUSEKEEPER"].includes(role),
    catalog: ["ADMIN"].includes(role),
    E: (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;"),
    date: (value) => value || "",
    btn: (label, action, id) => `<button data-action="${action}" data-id="${id}">${label}</button>`,
    toast() {},
    d: {
      rooms: [{ id: "R1", name: "Phòng 101", typeId: "T1", status: "OCCUPIED", note: "PRIVATE-NOTE" }],
      types: [{ id: "T1", name: "Deluxe", amenities: "Wifi" }],
      customers: [{ id: "PRIVATE-CUSTOMER", name: "PRIVATE-GUEST", phone: "PRIVATE-PHONE", identityNo: "PRIVATE-DOCUMENT" }],
      bookings: [{ id: "PRIVATE-BOOKING", customerId: "PRIVATE-CUSTOMER", roomId: "R1", status: "CHECKED_IN", startAt: `${today}T00:00:00+07:00`, endAt: `${today}T23:59:59+07:00`, deposit: 987654321 }],
      stays: [{ id: "PRIVATE-STAY", bookingId: "PRIVATE-BOOKING", currentRoomId: "R1", identityNo: "PRIVATE-DOCUMENT" }],
      history: [{ stayId: "PRIVATE-STAY", roomId: "R1", fromAt: `${today}T00:00:00+07:00` }],
      tasks: [], damages: [],
    },
  };
  const module = sandbox.createModule(ctx);
  return {
    ctx, module, today,
    render: () => module.render(),
    filter(values) {
      sandbox.filters = values;
      vm.runInContext("Object.assign(boardFilters, filters)", sandbox);
    },
    clickDate(date) {
      listeners.click({ target: { closest: (selector) => selector === "[data-room-date]" ? { dataset: { roomDate: date } } : null } });
    },
    detail: () => dialog?.innerHTML || "",
  };
}

function assertPrivate(html) {
  for (const value of privateValues) assert.ok(!html.includes(value), `Leaked ${value}`);
}

test("day tiles expose only room identity, type and status and are directly clickable without a detail button", () => {
  const ui = board();
  const html = ui.render();
  assertPrivate(html);
  assert.match(html, /<article class="operation-room-card is-occupied" data-action="room\.detail" data-id="R1" role="button" tabindex="0"/);
  assert.match(html, /Phòng 101/);
  assert.match(html, /Deluxe/);
  assert.match(html, /Đã có khách/);
  assert.doesNotMatch(html, /Đang ở/);
  assert.doesNotMatch(html, /Chi tiết/);
});

test("week tiles keep private data out of text and attributes and retain dated keyboard controls", () => {
  const ui = board();
  ui.filter({ view: "week" });
  const html = ui.render();
  assertPrivate(html);
  assert.match(html, /<button type="button" class="week-cell is-occupied"/);
  assert.match(html, new RegExp(`data-room-date="${ui.today}"`));
  assert.match(html, /aria-label="Phòng 101,[^"]*Đã có khách"/);
  assert.doesNotMatch(html, /Chi tiết/);
  assert.equal((html.match(/class="week-cell /g) || []).length, 7);
});

test("every current status has a full-tile color class and a textual label", () => {
  const ui = board();
  ui.ctx.d.bookings = [];
  ui.ctx.d.stays = [];
  ui.ctx.d.history = [];
  const states = ["AVAILABLE", "RESERVED", "HOLD", "OCCUPIED", "DIRTY", "MAINTENANCE", "DISABLED"];
  ui.ctx.d.rooms = states.map((status, index) => ({ id: `R${index}`, name: `Room ${index}`, typeId: "T1", status }));
  const html = ui.render();
  const css = readFileSync(join(__dirname, "../../../css/workspace/operations.css"), "utf8");
  for (const status of states) {
    assert.match(html, new RegExp(`<article class="operation-room-card is-${status.toLowerCase()}"`));
    assert.match(css, new RegExp(`\\.operation-board \\.is-${status.toLowerCase()} \\{ --room-fill:`));
  }
  assert.match(css, /\.operation-board \.operation-room-card,\s*\.operation-board \.week-cell\s*\{\s*background: var\(--room-fill\)/);
});

test("housekeeping tiles omit free-text notes and detail never exposes guests or staff workflows", async () => {
  const ui = board("HOUSEKEEPER");
  assertPrivate(ui.render());
  await ui.module.act("room.detail", "R1");
  const html = ui.detail();
  for (const value of privateValues.filter((value) => value !== "PRIVATE-NOTE")) {
    assert.ok(!html.includes(value), `Housekeeper saw ${value}`);
  }
  assert.match(html, /Nhiệm vụ hiện tại/);
  assert.doesNotMatch(html, /data-action="(?:usage\.|stay\.|booking\.)/);
});

test("authorized detail hides private guest data inside a collapsible disclosure and keeps occupied-stay workflows", async () => {
  const ui = board();
  await ui.module.act("room.detail", "R1");
  const html = ui.detail();
  assert.match(html, /<details class="room-guest-disclosure"><summary>Khách đặt \(1\)/);
  assert.match(html, /PRIVATE-GUEST/);
  assert.match(html, /PRIVATE-PHONE/);
  assert.match(html, /PRIVATE-DOCUMENT/);
  for (const action of ["usage.stay", "stay.move", "stay.checkout"]) {
    assert.ok(html.includes(`data-action="${action}" data-id="PRIVATE-STAY"`));
  }
  assert.doesNotMatch(html, /data-action="room\.(?:clean|damage|resolve)"/);
});

test("booking, deposit and check-in remain in authorized current-day detail", async () => {
  for (const [status, action] of [[null, "booking.new"], ["PENDING", "booking.deposit"], ["CONFIRMED", "stay.checkin"]]) {
    const ui = board();
    ui.ctx.d.stays = [];
    ui.ctx.d.history = [];
    ui.ctx.d.rooms[0].status = "AVAILABLE";
    if (status) ui.ctx.d.bookings[0].status = status;
    else ui.ctx.d.bookings = [];
    assertPrivate(ui.render());
    await ui.module.act("room.detail", "R1");
    assert.ok(ui.detail().includes(`data-action="${action}"`));
  }
});

test("historical room assignments drive filtered snapshots and dated detail remains read-only", async () => {
  const ui = board();
  const date = "2020-01-06";
  ui.ctx.d.bookings[0].startAt = `${date}T00:00:00+07:00`;
  ui.ctx.d.bookings[0].endAt = "2020-01-08T00:00:00+07:00";
  ui.ctx.d.bookings[0].status = "COMPLETED";
  ui.ctx.d.stays[0].currentRoomId = "R2";
  ui.ctx.d.history[0].fromAt = `${date}T00:00:00+07:00`;
  ui.ctx.d.history[0].toAt = "2020-01-07T00:00:00+07:00";
  ui.filter({ date, week: "2020-W02", number: "101", type: "T1", amenity: "Wifi", status: "OCCUPIED" });
  assert.match(ui.render(), /<article class="operation-room-card is-occupied"/);
  ui.filter({ view: "week" });
  assert.match(ui.render(), /class="week-cell is-occupied"/);
  ui.clickDate(date);
  await ui.module.act("room.detail", "R1");
  assert.match(ui.detail(), /PRIVATE-GUEST/);
  assert.doesNotMatch(ui.detail(), /data-action=/);
  ui.filter({ status: "DIRTY" });
  assert.match(ui.render(), /Không có phòng phù hợp/);
});

test("today's checked-out room stays dirty and cannot checkout the completed stay again", async () => {
  const ui = board();
  ui.ctx.d.rooms[0].status = "DIRTY";
  ui.ctx.d.stays[0].checkOutAt = `${ui.today}T10:00:00+07:00`;
  ui.ctx.d.stays[0].currentRoomId = null;
  ui.ctx.d.history[0].toAt = ui.ctx.d.stays[0].checkOutAt;
  ui.ctx.d.bookings[0].status = "COMPLETED";
  assert.match(ui.render(), /operation-room-card is-dirty/);
  await ui.module.act("room.detail", "R1");
  assert.doesNotMatch(ui.detail(), /data-action="stay\.(?:checkout|move|extend)"/);
  assert.match(ui.detail(), /data-action="room.urge"/);
});

test("today's room selects the current stay instead of the first assignment earlier that day", async () => {
  const ui = board();
  ui.ctx.d.stays.unshift({ id: "OLD-STAY", bookingId: "OLD-BOOKING", checkOutAt: `${ui.today}T09:00:00+07:00` });
  ui.ctx.d.bookings.unshift({ ...ui.ctx.d.bookings[0], id: "OLD-BOOKING", status: "COMPLETED" });
  ui.ctx.d.history.unshift({ stayId: "OLD-STAY", roomId: "R1", fromAt: `${ui.today}T00:00:00+07:00`, toAt: `${ui.today}T09:00:00+07:00` });
  await ui.module.act("room.detail", "R1");
  assert.match(ui.detail(), /data-action="stay.checkout" data-id="PRIVATE-STAY"/);
  assert.doesNotMatch(ui.detail(), /data-action="stay.checkout" data-id="OLD-STAY"/);
});

test("an overdue open stay still offers checkout today", async () => {
  const ui = board();
  ui.ctx.d.bookings[0].startAt = "2020-01-01T00:00:00+07:00";
  ui.ctx.d.bookings[0].endAt = "2020-01-02T00:00:00+07:00";
  ui.ctx.d.history[0].fromAt = ui.ctx.d.bookings[0].startAt;
  await ui.module.act("room.detail", "R1");
  assert.match(ui.detail(), /data-action="stay.checkout" data-id="PRIVATE-STAY"/);
});

test("moving a guest today removes checkout actions from the previous room", async () => {
  const ui = board();
  ui.ctx.d.rooms[0].status = "DIRTY";
  ui.ctx.d.stays[0].currentRoomId = "R2";
  ui.ctx.d.history[0].toAt = `${ui.today}T09:00:00+07:00`;
  ui.ctx.d.history.push({ stayId: "PRIVATE-STAY", roomId: "R2", fromAt: `${ui.today}T09:00:00+07:00` });
  assert.match(ui.render(), /operation-room-card is-dirty/);
  await ui.module.act("room.detail", "R1");
  assert.doesNotMatch(ui.detail(), /data-action="stay.checkout"/);
});

test("non-staff roles cannot open private room details", async () => {
  for (const role of ["CUSTOMER", "MANAGER"]) {
    const ui = board(role);
    assert.doesNotMatch(ui.render(), /data-action="room.detail"/);
    await ui.module.act("room.detail", "R1");
    assert.equal(ui.detail(), "");
  }
});

test("cleaning and maintenance actions keep their existing role permissions", async () => {
  for (const role of ["RECEPTIONIST", "HOUSEKEEPER", "ADMIN"]) {
    const ui = board(role);
    ui.ctx.d.bookings = [];
    ui.ctx.d.stays = [];
    ui.ctx.d.history = [];
    ui.ctx.d.rooms[0].status = "DIRTY";
    await ui.module.act("room.detail", "R1");
    assert.equal(ui.detail().includes('data-action="room.clean"'), role !== "RECEPTIONIST");
    assert.equal(ui.detail().includes('data-action="room.damage"'), role !== "RECEPTIONIST");
    ui.ctx.d.rooms[0].status = "MAINTENANCE";
    await ui.module.act("room.detail", "R1");
    assert.equal(ui.detail().includes('data-action="room.resolve"'), ["ADMIN"].includes(role));
  }
});

test("reception toolbar displays interactive room-type price pills and syncs type filter", () => {
  const ui = board("RECEPTIONIST");
  ui.ctx.d.types = [
    { id: "T1", name: "Phòng đơn", nightlyPrice: 350000 },
    { id: "T2", name: "Phòng VIP", nightlyPrice: 900000 },
  ];
  const html = ui.render();
  assert.doesNotMatch(html, /data-room-filter="type"/);
  assert.match(html, /class="operation-type-pills"/);
  assert.match(html, /data-room-filter-type=""/);
  assert.match(html, /data-room-filter-type="T1"/);
  assert.match(html, /data-room-filter-type="T2"/);
  assert.match(html, /Phòng đơn/);
  assert.match(html, /350\.000/);
  assert.match(html, /Phòng VIP/);
  assert.match(html, /900\.000/);

  const hk = board("HOUSEKEEPER");
  hk.ctx.d.types = ui.ctx.d.types;
  assert.doesNotMatch(hk.render(), /class="operation-type-pills"/);
});
