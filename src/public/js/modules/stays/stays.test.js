const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");

const source = readFileSync(join(__dirname, "stays.js"), "utf8")
  .replace("export default function createModule", "function createModule") +
  "\ncreateModule;";
const css = readFileSync(
  join(__dirname, "../../../css/workspace/operations.css"),
  "utf8",
);

function staysContext() {
  return {
    page: "stays",
    d: {
      stays: [{ id: "PT1", bookingId: "DP1", checkInAt: "2026-11-17T07:00:00.000Z" }],
      bookings: [{ id: "DP1", customerId: "KH1", roomId: "P1", startAt: "2026-11-17T07:00:00.000Z", endAt: "2026-11-18T05:00:00.000Z", guests: 1, roomCharge: 500000, deposit: 100000 }],
      customers: [{ id: "KH1", name: "Guest", identityNo: "123", phone: "0900000000" }],
      rooms: [{ id: "P1", name: "Room 101", typeId: "T1", status: "OCCUPIED" }],
      types: [{ id: "T1", name: "Deluxe" }],
      history: [{ stayId: "PT1", roomId: "P1", toAt: null }],
      usage: [],
    },
    E: (value) => String(value ?? ""),
    date: (value) => String(value ?? "—"),
    money: (value) => `${Number(value).toLocaleString("en-US")} ₫`,
    btn: (label, action, id) => `<button data-action="${action}" data-id="${id}">${label}</button>`,
    field: (key, title, type, value, options) => ({ key, title, type, value, options }),
    name: (_entity, value) => value,
    actionForm() {},
  };
}

test("stay actions are laid out without horizontal scrolling at desktop and mobile widths", () => {
  const create = vm.runInNewContext(source, {
    document: { querySelector: () => null, addEventListener() {} },
  });
  const module = create(staysContext());
  const html = module.render();
  assert.match(html, /operation-table stays-table/);
  assert.match(html, /data-label="Thao tác"/);
  for (const label of ["Đổi phòng", "Gia hạn", "Dịch vụ", "Trả phòng"])
    assert.match(html, new RegExp(label));
  assert.match(css, /\.stays-table-wrap\s*\{\s*overflow-x:\s*hidden/);
  assert.match(css, /\.stays-table\s*\{[^}]*min-width:\s*0/);
  assert.match(css, /@media\s*\(max-width:\s*900px\)[\s\S]*?\.stays-table tbody tr\s*\{\s*display:\s*grid/);
});

test("walk-in form displays the configured checkout time", async () => {
  const context = staysContext();
  context.d.settings = [{ checkOutTime: "11:45:00" }];
  let fields;
  const create = vm.runInNewContext(source, {
    document: { querySelector: () => null, addEventListener() {} },
  });
  const module = create({
    ...context,
    form(_title, values) { fields = values; },
  });

  await module.act("stay.walkin", "P1");

  assert.equal(fields.find((field) => field.key === "endAt").title, "Ngày trả phòng (11:45)");
});

test("extension dialog previews additional room cost and confirms the previewed amounts", async () => {
  const context = staysContext();
  const inputs = {
    '[name="endDate"]': {
      value: "2026-11-19",
      addEventListener(type, handler) { this[type] = handler; },
    },
    '[name="roomId"]': {
      value: "",
      addEventListener(type, handler) { this[type] = handler; },
    },
  };
  const nodes = Object.fromEntries(
    ["room", "charge", "move", "total"].map((key) => [key, { textContent: "" }]),
  );
  let summary;
  const fields = {
    querySelector: (selector) => inputs[selector],
    append(node) { summary = node; },
  };
  summary = null;
  const calls = [];
  let form;
  let command;
  const moduleContext = {
    ...context,
    actionForm(...args) { form = args; },
    async api(path, body) {
      calls.push({ path, body });
      return { extensionCharge: 300000, moveExtra: 50000, targetRoomId: "P1" };
    },
    async command(action, body) { command = { action, body }; },
  };
  const document = {
    querySelector(selector) {
      if (selector === "#dialog-fields") return fields;
      return null;
    },
    addEventListener() {},
    createElement() {
      return {
        className: "",
        innerHTML: "",
        querySelector(selector) {
          if (selector === "[data-extension-room]") return nodes.room;
          if (selector === "[data-extension-charge]") return nodes.charge;
          if (selector === "[data-move-extra]") return nodes.move;
          if (selector === "[data-extension-total]") return nodes.total;
          return null;
        },
      };
    },
  };
  const create = vm.runInNewContext(source, { document });
  const module = create(moduleContext);
  await module.act("stay.extend", "PT1");
  await new Promise((resolve) => setImmediate(resolve));

  assert.ok(summary);
  assert.match(summary.innerHTML, /Tổng chi phí tăng thêm/);
  assert.equal(nodes.room.textContent, "P1");
  assert.equal(nodes.charge.textContent, "300,000 ₫");
  assert.equal(nodes.move.textContent, "50,000 ₫");
  assert.equal(nodes.total.textContent, "350,000 ₫");
  assert.doesNotMatch(form[3], /transaction/i);
  assert.equal(typeof form[4], "function");

  await form[4]({ id: "PT1", endDate: "2026-11-19", roomId: "" });
  assert.equal(calls.length, 2);
  assert.ok(calls.every((call) => call.path === "/api/action/stay.extend-preview"));
  assert.deepEqual(JSON.parse(JSON.stringify(command.body)), {
    id: "PT1",
    endDate: "2026-11-19",
    roomId: "",
    expectedExtensionCharge: 300000,
    expectedMoveExtra: 50000,
  });
});

test("stays page renders active stays on top and completed stays history below", () => {
  const context = staysContext();
  context.d.stays.push({
    id: "PT-DONE",
    bookingId: "DP1",
    checkInAt: "2026-11-15T07:00:00.000Z",
    checkOutAt: "2026-11-17T06:30:00.000Z",
    roomCharge: 500000,
  });
  context.d.invoices = [{ id: "HD01", stayId: "PT-DONE", total: 550000, status: "PAID" }];

  const create = vm.runInNewContext(source, {
    document: { querySelector: () => null, addEventListener() {} },
  });
  const module = create(context);
  const html = module.render();

  assert.match(html, /Khách đang lưu trú/);
  assert.match(html, /Lịch sử lưu trú đã hoàn tất/);
  assert.match(html, /PT1/);
  assert.match(html, /PT-DONE/);
  assert.match(html, /Đã trả/);
  assert.match(html, /data-invoice-detail="HD01"/);
});
