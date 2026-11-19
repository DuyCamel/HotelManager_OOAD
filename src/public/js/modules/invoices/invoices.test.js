const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");

test("checkout close actions work after success body replacement, including nested button content", () => {
  const source = readFileSync(join(__dirname, "invoices.js"), "utf8")
    .replace(/^import .*;\r?\n/gm, "")
    .replace("export default function createModule", "function createModule");
  const context = vm.createContext({});
  vm.runInContext(source, context);
  const events = {}, buttons = [];
  let closed = 0, removed = 0;
  const header = { addEventListener: () => {} };
  const dialog = {
    querySelectorAll: () => [header],
    addEventListener: (type, handler) => { events[type] = handler; },
    contains: (node) => buttons.includes(node),
    close: () => { closed++; },
    remove: () => { removed++; },
  };
  context.attachDialogLifecycle(dialog);
  const footer = {};
  buttons.push(footer);
  events.click({ target: { closest: () => footer } });
  assert.equal(closed, 1, "new success footer must close the checkout dialog");
  events.click({ target: { closest: () => null } });
  assert.equal(closed, 1, "normal content must not close the dialog");
  events.click({ target: dialog });
  assert.equal(closed, 2, "backdrop still closes the dialog");
  events.close();
  assert.equal(removed, 1);
});
