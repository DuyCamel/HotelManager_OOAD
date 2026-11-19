const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");

function setup() {
  let submit, selection;
  const commands = [];
  const staySelect = { value: "ST1", addEventListener(event, fn) { this[event] = fn; } };
  const doc = {
    addEventListener() {},
    createElement() {
      selection = {
        innerHTML: "", rows: [], listeners: {},
        addEventListener(event, fn) { this.listeners[event] = fn; },
        querySelectorAll() { return this.rows; },
        querySelector() { return this.total; },
        total: { textContent: "" },
      };
      return selection;
    },
    querySelector(selector) {
      if (selector === "#editor-form") return { elements: { stayId: staySelect } };
      if (selector === "#dialog-fields") return { append() {} };
      return null;
    },
  };
  const sandbox = vm.createContext({ document: doc });
  const source = readFileSync(join(__dirname, "service-usage.js"), "utf8")
    .replace("export default function createModule", "function createModule");
  vm.runInContext(source, sandbox);
  const ctx = {
    page: "usage",
    d: {
      stays: [{ id: "ST1", currentRoomId: "R1" }, { id: "ST2", currentRoomId: "R2" }],
      rooms: [{ id: "R1", typeId: "T1" }, { id: "R2", typeId: "T2" }],
      types: [
        { id: "T1", serviceConfig: [{ serviceId: "PAID" }, { serviceId: "PAID2" }, { serviceId: "FREE", included: true }, { serviceId: "OFF" }] },
        { id: "T2", serviceConfig: [{ serviceId: "OTHER" }] },
      ],
      services: [
        { id: "PAID", name: "Water", price: 12000, isActive: true },
        { id: "PAID2", name: "Laundry", price: 30000, isActive: true },
        { id: "FREE", name: "Breakfast", price: 50000, isActive: true },
        { id: "OFF", name: "Closed", price: 10000, isActive: false },
        { id: "OTHER", name: "Other", price: 20000, isActive: true },
      ],
    },
    E: (value) => String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;"),
    money: (value) => `${value} VND`,
    field: (key, title, type, value, options) => ({ key, title, type, value, options }),
    form(title, fields, handler) { submit = handler; staySelect.value = fields[0].value; },
    async command(action, body) { commands.push({ action, body }); },
    toast() {},
  };
  const module = sandbox.createModule(ctx);
  return {
    module, ctx, commands, staySelect,
    selection: () => selection,
    submit: () => submit({ stayId: staySelect.value }),
  };
}

function row(serviceId, checked, value) {
  const checkbox = { checked }, quantity = { value, disabled: true }, subtotal = {};
  return {
    dataset: { serviceRow: serviceId }, checkbox, quantity, subtotal,
    querySelector(selector) {
      return selector === "[data-service-check]" ? checkbox
        : selector === "[data-service-quantity]" ? quantity : subtotal;
    },
  };
}

test("service table disables included/inactive services and omits unconfigured services", async () => {
  const f = setup();
  await f.module.act("usage.stay", "ST1");
  const html = f.selection().innerHTML;
  assert.match(html, /<th>Dịch vụ<\/th><th>Trạng thái<\/th><th>Đơn giá<\/th><th>Chọn<\/th><th>Số lượng<\/th><th>Thành tiền<\/th>/);
  assert.match(html, /Đã gồm trong giá phòng/);
  assert.match(html, /Ngừng phục vụ/);
  assert.doesNotMatch(html, /data-service-row="OTHER"/);
  for (const id of ["FREE", "OFF"]) {
    const markup = html.match(new RegExp(`<tr data-service-row="${id}">[\\s\\S]*?<\\/tr>`))[0];
    assert.match(markup, /type="checkbox"[^>]*disabled/);
  }
  assert.match(html, /value="1" disabled required/);
});

test("checking rows enables quantity and updates provisional subtotal and total", async () => {
  const f = setup();
  await f.module.act("usage.new");
  const selected = row("PAID", true, "3");
  const unselected = row("OFF", false, "1");
  f.selection().rows = [selected, unselected];
  f.selection().listeners.change();
  assert.equal(selected.quantity.disabled, false);
  assert.equal(unselected.quantity.disabled, true);
  assert.equal(selected.subtotal.textContent, "36000 VND");
  assert.equal(f.selection().total.textContent, "36000 VND");
  selected.checkbox.checked = false;
  f.selection().listeners.input();
  assert.equal(selected.quantity.disabled, true);
  assert.equal(f.selection().total.textContent, "0 VND");
});

test("one submission sends all selected lines in one workspace command with no client prices", async () => {
  const f = setup();
  await f.module.act("usage.stay", "ST1");
  f.selection().rows = [row("PAID", true, "2"), row("PAID2", true, "3"), row("FREE", false, "1"), row("OFF", false, "1")];
  await f.submit();
  assert.deepEqual(JSON.parse(JSON.stringify(f.commands)), [{
    action: "usage.add", body: { stayId: "ST1", items: [{ serviceId: "PAID", quantity: 2 }, { serviceId: "PAID2", quantity: 3 }] },
  }]);
});

test("selection requires at least one valid quantity and re-renders for a different stay", async () => {
  const f = setup();
  await f.module.act("usage.new");
  await assert.rejects(f.submit(), /1 đến 50/);
  f.selection().rows = [row("PAID", true, "1.5")];
  await assert.rejects(f.submit(), /số nguyên/);
  assert.equal(f.commands.length, 0);
  f.staySelect.value = "ST2";
  f.staySelect.change();
  assert.match(f.selection().innerHTML, /data-service-row="OTHER"/);
  assert.doesNotMatch(f.selection().innerHTML, /data-service-row="PAID"/);
});

test("history retains usage rows and void actions only for unsettled active stays", () => {
  const f = setup();
  f.ctx.date = (value) => value || "";
  f.ctx.badge = (value) => value;
  f.ctx.btn = (text, action, id) => `<button data-action="${action}" data-id="${id}">${text}</button>`;
  f.ctx.d.usage = [
    { id: "U1", stayId: "ST1", serviceId: "PAID", quantity: 2, unitPrice: 12000 },
    { id: "U2", stayId: "ST1", serviceId: "FREE", quantity: 1, unitPrice: 0, isVoided: true },
    { id: "U3", stayId: "ST1", serviceId: "PAID", quantity: 1, unitPrice: 12000, invoiceId: "I1" },
  ];
  const html = f.module.render();
  assert.match(html, /Lịch sử dịch vụ/);
  assert.match(html, /data-action="usage.void" data-id="U1"/);
  assert.doesNotMatch(html, /data-action="usage.void" data-id="U[23]"/);
  for (const id of ["U1", "U2", "U3"]) assert.ok(html.includes(id));
});
