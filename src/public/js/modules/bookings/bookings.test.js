const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");

function element(tagName = "div") {
  const listeners = {}, attributes = {}, classes = new Set();
  return {
    tagName: tagName.toUpperCase(), children: [], dataset: {}, style: {}, value: "", hidden: false, disabled: false,
    classList: {
      add: (name) => classes.add(name), remove: (name) => classes.delete(name),
      toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name),
      contains: (name) => classes.has(name),
    },
    setAttribute: (key, value) => { attributes[key] = value; },
    getAttribute: (key) => attributes[key],
    addEventListener: (event, callback) => { listeners[event] = callback; },
    fire(event) { return listeners[event]?.(); },
    append(...children) { for (const child of children) { child.parent = this; this.children.push(child); } },
    after(...children) { this.parent?.append(...children); },
    closest() { return this.parent; },
    focus() { this.focused = true; },
    reportValidity() { return !this.required || Boolean(this.value.trim()); },
  };
}

function counterForm(paymentError, customerError, refreshError) {
  let definition, handler, methodChange, closed = false;
  const payments = [], commands = [], messages = [], requests = [];
  let refreshes = 0, formOpens = 0;
  let paymentCallback = null;
  const fields = element();
  const receiptLabel = { hidden: false, dataset: {} };
  const immediateLabel = { hidden: false };
  const button = { textContent: "", disabled: false };
  const form = { elements: {}, querySelector: () => button };
  form.elements.method = { value: "CASH", addEventListener: (event, callback) => { methodChange = callback; } };
  form.elements.receiptConfirmed = { required: true, disabled: false, closest: () => receiptLabel };
  form.elements.checkInNow = { checked: false, addEventListener: (event, callback) => { form.elements.checkInNow.change = callback; }, closest: () => immediateLabel };
  const sandbox = vm.createContext({
    document: {
      querySelector: (selector) => selector === "#editor-form" ? form : selector === "#dialog-fields" ? fields : { close: () => { closed = true; } },
      createElement: element,
    },
    URLSearchParams,
    depositAmount: (amount, maximum) => {
      assert.ok(Number.isSafeInteger(Number(amount)) && Number(amount) > 0 && Number(amount) <= maximum);
      return Number(amount);
    },
    openPayment: async (ctx, body, callback) => { payments.push(body); paymentCallback = callback || null; if (paymentError) throw paymentError; },
  });
  const source = readFileSync(join(__dirname, "bookings.js"), "utf8")
    .replace(/^import .*;\r?\n/m, "")
    .replace("export default function createModule", "function createModule");
  vm.runInContext(source, sandbox);
  const ctx = {
    d: { customers: [{ id: "C1", name: "Guest", identityNo: "ID-1", isActive: true }], rooms: [], types: [] },
    field: (key, title, type, value, options) => ({ key, title, type, value, options }),
    form: (title, definitions, callback) => {
      formOpens++;
      definition = definitions;
      handler = callback;
      for (const field of definitions) {
        if (form.elements[field.key]) continue;
        const input = element("input"), label = element("label");
        input.type = field.type;
        input.value = String(field.value || "");
        input.checked = false;
        input.required = !field.optional;
        label.append(input);
        fields.append(label);
        form.elements[field.key] = input;
      }
    },
    api: async (url, body) => {
      if (url.startsWith("/api/availability")) throw new Error("Availability unavailable");
      requests.push({ url, body });
      if (customerError) throw customerError;
      return { id: "C2", ...body, isActive: true };
    },
    refresh: async () => { refreshes++; if (refreshError) throw refreshError; },
    command: async (action, body) => { commands.push({ action, body }); return { id: "B1", roomCharge: 500 }; },
    toast: (message) => messages.push(message),
  };
  sandbox.openCounterBooking(ctx);
  return {
    form, receiptLabel, button, commands, payments, messages, requests, ctx,
    inline: fields.children.find((child) => child.id === "counter-new-customer"),
    toggle: fields.children.find((child) => child.getAttribute?.("aria-controls") === "counter-new-customer"),
    match: fields.children.find((child) => child.id === "counter-customer-match"),
    refreshes: () => refreshes,
    formOpens: () => formOpens,
    fields: definition,
    getPaymentCallback: () => paymentCallback,
    choose(method) { form.elements.method.value = method; methodChange(); },
    chooseCheckInNow(value) {
      form.elements.checkInNow.checked = value;
      form.elements.checkInNow.change();
    },
    submit: (body) => {
      const startAt = sandbox.localDate();
      const endAt = sandbox.localDate(Date.now() + 86400000);
      return handler({ customerLookup: "Guest", roomId: "R1", startAt, endAt, guests: "1", deposit: "100", ...body });
    },
    closed: () => closed,
    expired: (booking) => sandbox.isExpiredHold(booking),
  };
}

test("reception counter form offers exactly cash and transfer and changes receipt confirmation", () => {
  const ui = counterForm();
  assert.equal(JSON.stringify(ui.fields.find((f) => f.key === "method").options.map((option) => option[0])), '["CASH","TRANSFER"]');
  assert.equal(ui.form.elements.receiptConfirmed.required, true);
  ui.choose("TRANSFER");
  assert.equal(ui.receiptLabel.hidden, true);
  assert.equal(ui.form.elements.receiptConfirmed.required, false);
  assert.equal(ui.form.elements.receiptConfirmed.disabled, true);
  assert.match(ui.button.textContent, /QR/);
  ui.choose("CASH");
  assert.equal(ui.receiptLabel.hidden, false);
  assert.equal(ui.form.elements.receiptConfirmed.required, true);
  assert.equal(ui.form.elements.receiptConfirmed.disabled, false);
});

test("immediate check-in adds only an optional checkbox to the existing booking form", () => {
  const ui = counterForm();
  const field = ui.fields.find((field) => field.key === "checkInNow");
  assert.equal(field.type, "checkbox");
  assert.equal(field.optional, true);
  assert.equal(ui.form.elements.checkInNow.checked, false);
  assert.ok(!ui.fields.some((field) => field.key === "identityNo"));
  ui.chooseCheckInNow(true);
  assert.match(ui.button.textContent, /nhận phòng ngay/i);
  ui.chooseCheckInNow(false);
  assert.doesNotMatch(ui.button.textContent, /nhận phòng ngay/i);
  assert.equal(ui.formOpens(), 1);
});

test("counter cash keeps receipt confirmation and does not open a QR", async () => {
  const ui = counterForm();
  await ui.submit({ method: "CASH", receiptConfirmed: "yes" });
  assert.equal(ui.commands[0].action, "booking.create");
  assert.equal(ui.commands[0].body.method, "CASH");
  assert.equal(ui.commands[0].body.receiptConfirmed, true);
  assert.equal(ui.payments.length, 0);
});

test("counter booking can receive the guest immediately without opening a second form", async () => {
  const ui = counterForm();
  await ui.submit({ method: "CASH", receiptConfirmed: "yes", checkInNow: "yes" });
  assert.equal(ui.commands.length, 1);
  assert.equal(ui.commands[0].action, "booking.create");
  assert.equal(ui.commands[0].body.method, "CASH");
  assert.equal(ui.commands[0].body.receiptConfirmed, true);
  assert.deepEqual(JSON.parse(JSON.stringify(ui.requests)), [
    { url: "/api/action/stay.checkin", body: { id: "B1", identityNo: "ID-1" } },
  ]);
  assert.equal(ui.formOpens(), 1);
  assert.equal(ui.refreshes(), 1);
  assert.equal(ui.payments.length, 0);
});

test("immediate check-in preserves QR transfer and does not require a cash receipt", () => {
  const ui = counterForm();
  ui.choose("TRANSFER");
  ui.chooseCheckInNow(true);
  assert.equal(ui.form.elements.method.value, "TRANSFER");
  assert.equal(ui.receiptLabel.hidden, true);
  assert.equal(ui.form.elements.receiptConfirmed.required, false);
  assert.match(ui.button.textContent, /QR/);
  assert.equal(ui.formOpens(), 1);
});

test("immediate QR check-in uses the existing booking and waits for bank confirmation", async () => {
  const ui = counterForm();
  ui.choose("TRANSFER");
  ui.chooseCheckInNow(true);
  await ui.submit({ method: "TRANSFER", checkInNow: "yes" });
  assert.equal(ui.commands.length, 1);
  assert.equal(ui.commands[0].action, "booking.create");
  assert.equal(ui.commands[0].body.method, "TRANSFER");
  assert.equal(ui.commands[0].body.receiptConfirmed, false);
  assert.equal(ui.payments[0].bookingId, "B1");
  assert.equal(ui.requests.length, 0);
  assert.equal(ui.formOpens(), 1);
  const message = await ui.getPaymentCallback()();
  assert.deepEqual(JSON.parse(JSON.stringify(ui.requests)), [
    { url: "/api/action/stay.checkin", body: { id: "B1", identityNo: "ID-1" } },
  ]);
  assert.equal(ui.refreshes(), 1);
  assert.match(message, /đã nhận phòng/);
});

test("a check-in failure after QR payment keeps the paid booking and does not request money again", async () => {
  const ui = counterForm(null, new Error("Phòng chưa sạch/sẵn sàng."));
  await ui.submit({ method: "TRANSFER", checkInNow: "yes" });
  const message = await ui.getPaymentCallback()();
  assert.match(message, /đã ghi nhận cọc/);
  assert.match(message, /Phòng chưa sạch/);
  assert.match(message, /không chuyển thêm tiền/);
  assert.equal(ui.commands.length, 1);
  assert.equal(ui.payments.length, 1);
});

test("normal QR booking has no automatic check-in callback", async () => {
  const ui = counterForm();
  await ui.submit({ method: "TRANSFER" });
  assert.equal(ui.getPaymentCallback(), null);
});

test("immediate check-in requires a document in the profile, but ordinary booking does not", async () => {
  const ui = counterForm();
  ui.ctx.d.customers[0].identityNo = "";
  const body = { method: "CASH", receiptConfirmed: "yes" };
  await assert.rejects(ui.submit({ ...body, checkInNow: "yes", identityNo: "IGNORED" }), /Bổ sung trong hồ sơ khách/);
  assert.equal(ui.commands.length, 0);
  await ui.submit(body);
  assert.equal(ui.commands[0].action, "booking.create");
  assert.equal(ui.requests.length, 0);
});

test("immediate check-in rejects future arrivals and unconfirmed cash before creating a record", async () => {
  const ui = counterForm();
  const body = { checkInNow: "yes", method: "CASH", receiptConfirmed: "yes" };
  await assert.rejects(ui.submit({ ...body, startAt: "2099-01-01" }), /hôm nay/);
  await assert.rejects(ui.submit({ ...body, receiptConfirmed: "" }), /xác nhận/);
  assert.equal(ui.commands.length, 0);
  assert.equal(ui.formOpens(), 1);
});

test("counter booking keeps the normal reservation path when immediate check-in is unchecked", async () => {
  const ui = counterForm();
  await ui.submit({ method: "CASH", receiptConfirmed: "yes", checkInNow: "" });
  assert.equal(ui.commands.length, 1);
  assert.equal(ui.commands[0].action, "booking.create");
});

test("counter transfer opens the new booking QR for exactly the requested deposit", async () => {
  const ui = counterForm();
  ui.choose("TRANSFER");
  await ui.submit({ method: "TRANSFER", receiptConfirmed: "yes" });
  assert.equal(ui.commands[0].body.receiptConfirmed, false);
  assert.equal(ui.commands[0].body.method, "TRANSFER");
  assert.equal(ui.closed(), true);
  assert.equal(ui.payments.length, 1);
  assert.equal(ui.payments[0].bookingId, "B1");
  assert.equal(ui.payments[0].amount, 100);
  assert.equal(ui.payments[0].kind, "DEPOSIT");
  assert.equal(ui.expired({ channel: "COUNTER", status: "PENDING", holdUntil: "2000-01-01T00:00:00Z" }), true);
});

test("QR startup failure remains visible after closing the counter form without confirming money", async () => {
  const ui = counterForm(new Error("SePay chưa được cấu hình"));
  await ui.submit({ method: "TRANSFER" });
  assert.equal(ui.closed(), true);
  assert.equal(ui.commands.length, 1);
  assert.equal(ui.commands[0].body.receiptConfirmed, false);
  assert.equal(ui.messages.length, 1);
  assert.match(ui.messages[0], /B1.*chưa nhận cọc.*SePay/);
});

function inlineControls(ui) {
  const [name, phone, identityNo, address] = ui.inline.children.slice(0, 4).map((label) => label.children[0]);
  const [status, save, cancel] = ui.inline.children.slice(4);
  return { name, phone, identityNo, address, status, save, cancel };
}

test("inline customer save preserves booking fields, refreshes and selects the new profile", async () => {
  const ui = counterForm();
  const controls = inlineControls(ui);
  ui.choose("TRANSFER");
  const entered = { roomId: "R7", startAt: "2030-03-03", endAt: "2030-03-07", guests: "3", deposit: "321", method: "TRANSFER" };
  for (const [key, value] of Object.entries(entered)) ui.form.elements[key].value = value;
  ui.toggle.fire("click");
  assert.equal(ui.button.disabled, true);
  assert.equal(ui.form.elements.customerLookup.disabled, true);
  controls.name.value = " New Guest ";
  controls.phone.value = "0901234567";
  controls.identityNo.value = "ID-2";
  controls.address.value = "Address";
  const saving = controls.save.fire("click");
  assert.equal(controls.save.disabled, true);
  assert.equal(controls.cancel.disabled, true);
  assert.match(controls.status.textContent, /Đang lưu/);
  await saving;
  assert.equal(ui.requests.length, 1);
  assert.equal(ui.requests[0].url, "/api/action/customer.save");
  assert.deepEqual(JSON.parse(JSON.stringify(ui.requests[0].body)), {
    name: "New Guest", phone: "0901234567", identityNo: "ID-2", address: "Address",
  });
  assert.equal(ui.refreshes(), 1);
  assert.equal(ui.formOpens(), 1);
  for (const [key, value] of Object.entries(entered)) assert.equal(ui.form.elements[key].value, value);
  assert.equal(ui.form.elements.customerLookup.value, "New Guest · ID-2 · 0901234567 · C2");
  assert.match(ui.match.textContent, /Đã chọn: New Guest/);
  assert.equal(ui.inline.hidden, true);
  assert.equal(ui.inline.style.display, "none");
  assert.equal(controls.name.disabled, true);
  assert.equal(controls.phone.disabled, true);
  assert.equal(ui.form.elements.customerLookup.disabled, false);
  assert.equal(ui.button.disabled, false);
  ui.chooseCheckInNow(true);
  await ui.submit({ customerLookup: ui.form.elements.customerLookup.value, method: "TRANSFER", deposit: "321", checkInNow: "yes" });
  assert.equal(ui.commands[0].body.customerId, "C2");
  assert.equal(ui.payments[0].amount, 321);
  await ui.getPaymentCallback()();
  assert.deepEqual(JSON.parse(JSON.stringify(ui.requests[1])), {
    url: "/api/action/stay.checkin", body: { id: "B1", identityNo: "ID-2" },
  });
  assert.equal(ui.formOpens(), 1);
});

test("inline cancel disables required fields and restores the previous lookup without submitting", () => {
  const ui = counterForm();
  const controls = inlineControls(ui);
  ui.form.elements.customerLookup.value = "Guest";
  for (const button of [ui.toggle, controls.save, controls.cancel]) assert.equal(button.type, "button");
  assert.equal(controls.name.maxLength, 120);
  assert.equal(controls.phone.maxLength, 10);
  assert.equal(controls.phone.pattern, "0[0-9]{9}");
  assert.equal(controls.identityNo.maxLength, 30);
  assert.equal(controls.address.maxLength, 512);
  assert.equal(controls.identityNo.required, false);
  assert.equal(controls.address.required, false);
  ui.toggle.fire("click");
  assert.equal(controls.name.disabled, false);
  controls.cancel.fire("click");
  assert.equal(ui.inline.hidden, true);
  assert.equal(ui.toggle.getAttribute("aria-expanded"), "false");
  assert.equal(ui.form.elements.customerLookup.value, "Guest");
  assert.equal(ui.form.elements.customerLookup.disabled, false);
  assert.equal(ui.button.disabled, false);
  for (const input of [controls.name, controls.phone, controls.identityNo, controls.address]) assert.equal(input.disabled, true);
  assert.equal(ui.requests.length, 0);
  assert.equal(ui.commands.length, 0);
});

test("inline validation and server failure leave booking and customer entries available for correction", async () => {
  const ui = counterForm(null, new Error("Số điện thoại đã tồn tại."));
  const controls = inlineControls(ui);
  ui.toggle.fire("click");
  await controls.save.fire("click");
  assert.equal(ui.requests.length, 0);
  controls.name.value = "New Guest";
  controls.phone.value = "0901234567";
  await controls.save.fire("click");
  assert.match(controls.status.textContent, /Chưa lưu được khách:.*đã tồn tại/);
  assert.equal(ui.inline.hidden, false);
  assert.equal(controls.name.value, "New Guest");
  assert.equal(controls.phone.value, "0901234567");
  assert.equal(controls.name.disabled, false);
  assert.equal(controls.save.disabled, false);
  assert.equal(controls.cancel.disabled, false);
  assert.equal(ui.refreshes(), 0);
  assert.equal(ui.formOpens(), 1);
  controls.cancel.fire("click");
  assert.equal(ui.button.disabled, false);
  assert.equal(controls.name.disabled, true);
});

test("a refresh failure after saving still selects the saved customer without a duplicate save", async () => {
  const ui = counterForm(null, null, new Error("Network unavailable"));
  const controls = inlineControls(ui);
  ui.toggle.fire("click");
  controls.name.value = "New Guest";
  controls.phone.value = "0901234567";
  await controls.save.fire("click");
  assert.equal(ui.requests.length, 1);
  assert.match(ui.messages[0], /Đã lưu khách.*Network unavailable/);
  assert.match(ui.match.textContent, /Đã chọn: New Guest/);
  assert.equal(ui.inline.hidden, true);
  assert.equal(controls.name.disabled, true);
});
