const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const source = readFileSync(join(__dirname, "accounts.js"), "utf8");
const stylesheet = readFileSync(
  join(__dirname, "../../../css/workspace/admin.css"),
  "utf8",
);

test("account rows expose labels for the mobile card layout", () => {
  for (const label of ["Tài khoản", "Vai trò", "Điện thoại", "Trạng thái", "Thao tác"])
    assert.match(source, new RegExp(`data-label=\\"${label}\\"`));
  assert.match(stylesheet, /\.accounts-admin tbody td::before/);
  assert.match(stylesheet, /\.accounts-admin tbody td\.admin-actions/);
});

test("accounts module orders roles from manager, admin, receptionist to housekeeper and customer", () => {
  assert.match(source, /MANAGER.*ADMIN.*RECEPTIONIST.*HOUSEKEEPER.*CUSTOMER/s);
  assert.match(source, /\["RECEPTIONIST",\s*"Lễ tân"\]/);
  assert.doesNotMatch(source, /\["RECEPTIONIST",\s*"Nhân viên"\]/);
});

test("accounts module hides role change for customers and provides duplicate checker with conversion prompt", () => {
  assert.match(
    source,
    /\["ADMIN",\s*"RECEPTIONIST",\s*"HOUSEKEEPER"\]\.includes\(account\.role\)/,
  );
  assert.doesNotMatch(
    source,
    /\["ADMIN",\s*"RECEPTIONIST",\s*"HOUSEKEEPER",\s*"CUSTOMER"\]\.includes\(account\.role\)/,
  );
  assert.match(source, /attachConflictChecker/);
  assert.match(source, /convertCustomer/);
  assert.match(source, /\/\^0\[0-9\]\{9\}\$\//);
});
