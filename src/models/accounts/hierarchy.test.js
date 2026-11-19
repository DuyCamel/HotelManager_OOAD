const test = require("node:test");
const assert = require("node:assert/strict");
const { grants, has, allow } = require("../../core/auth/rbac");
const config = require("../../config/env");
const passwords = require("../../core/auth/passwords");
const { defs } = require("../_shared/definitions");
const createAccounts = require("./account.model");
const createAuth = require("../auth/auth.model");
const createWorkspace = require("../workspace/workspace.model");
const createDashboard = require("../dashboard/dashboard.model");
const security = require("../../core/auth/security");
const createAuthController = require("../../controllers/auth/auth.controller");

const account = (role, authVersion = 0, phone = "") => ({
  id: `TK_${role}`,
  email: `${role.toLowerCase()}@example.test`,
  name: role,
  phone: phone || `090000000${role.length}`,
  passwordHash: "private-password-hash",
  role,
  isActive: true,
  authVersion,
});
const manager = account("MANAGER", 7, "0900000001");
const admin = account("ADMIN", 11, "0900000002");
const receptionist = account("RECEPTIONIST", 2, "0900000003");
const housekeeper = account("HOUSEKEEPER", 0, "0900000004");
const customer = account("CUSTOMER", 0, "0900000005");

function makeRepo(extra = {}) {
  let state = structuredClone({
    ...Object.fromEntries(Object.keys(defs).map((key) => [key, []])),
    accounts: [manager, admin, receptionist, housekeeper, customer],
    ...extra,
  });
  const client = (data) => ({
    async list(key) {
      return structuredClone(data[key]);
    },
    async find(key, id) {
      return structuredClone(data[key].find((row) => row.id === id) || null);
    },
    async insert(key, row) {
      const created = structuredClone({ id: data[key].length + 1, ...row });
      data[key].push(created);
      return structuredClone(created);
    },
    async update(key, id, changes) {
      const row = data[key].find((item) => item.id === id);
      assert.ok(row, `${key}/${id} must exist`);
      Object.assign(row, structuredClone(changes));
    },
  });
  return {
    list: (key) => client(state).list(key),
    find: (key, id) => client(state).find(key, id),
    snapshot: () => structuredClone(state),
    async transaction(work) {
      const draft = structuredClone(state);
      const result = await work(client(draft));
      state = draft;
      return result;
    },
  };
}

function enableDemoOtp(t) {
  const original = { otpProvider: config.otpProvider, production: config.production, otpNum: config.otpNum };
  config.otpProvider = "demo";
  config.production = false;
  config.otpNum = "";
  t.after(() => Object.assign(config, original));
}

test("RBAC separates system administration from hotel operations", () => {
  const staff = ["bookings", "customers", "usage", "cards", "board", "stays", "invoices"];
  const expected = {
    MANAGER: ["accounts", "accounts.assign", "admin"],
    ADMIN: [...staff, "catalog", "services.read", "config", "accounts", "reports", "clean"],
    RECEPTIONIST: [...staff, "services.read"],
    HOUSEKEEPER: ["board", "clean"],
    CUSTOMER: ["self"],
  };
  assert.deepEqual(grants, expected);
  const permissions = new Set([...Object.values(expected).flat(), "admin", "audit", "backups", "unknown"]);
  for (const [role, allowed] of Object.entries(expected)) {
    for (const permission of permissions) {
      const permitted = allowed.includes(permission);
      assert.equal(has({ role }, permission), permitted, `${role}: ${permission}`);
      if (permitted) assert.doesNotThrow(() => allow({ role }, permission));
      else assert.throws(() => allow({ role }, permission), { status: 403 });
    }
  }
  for (const user of [null, { role: "UNKNOWN" }]) {
    assert.equal(has(user, "accounts"), false);
    assert.throws(() => allow(user, "accounts"), { status: 403 });
  }
});

test("both administrators retain account capabilities; only MANAGER can transfer ownership", async () => {
  const model = createAccounts(makeRepo());
  for (const user of [admin, manager]) {
    const overview = await model.overview(user);
    assert.deepEqual(overview.capabilities, {
      createStaff: true,
      assignRoles: user.role === "MANAGER",
      transferAdmin: user.role === "MANAGER",
    });
    assert.equal(overview.roles.some((role) => role.code === "MANAGER"), user.role === "MANAGER");
    assert.ok(overview.roles.some((role) => role.code === "ADMIN"));
  }
});

test("both roles can create staff accounts and only MANAGER can change existing roles", async () => {
  for (const user of [admin, manager]) {
    const repo = makeRepo();
    const model = createAccounts(repo);
    for (const [idx, role] of ["ADMIN", "RECEPTIONIST", "HOUSEKEEPER"].entries()) {
      const created = await model.create(user, {
        role, email: `new-${role}@example.test`, name: "New staff",
        phone: `091234567${idx}`, password: "Staff password 123",
      });
      assert.equal(created.role, role);
      assert.equal(Object.hasOwn(created, "passwordHash"), false);
      const stored = await repo.find("accounts", created.id);
      assert.equal(stored.isActive, true);
      assert.equal(stored.authVersion, 0);
      assert.equal(await passwords.verify("Staff password 123", stored.passwordHash), true);

      const before = await repo.find("accounts", receptionist.id);
      if (user.role === "MANAGER") {
        await model.role(user, { id: receptionist.id, role });
        const after = await repo.find("accounts", receptionist.id);
        assert.equal(after.role, role);
        assert.equal(after.authVersion, before.authVersion + 1);
      } else {
        await assert.rejects(model.role(user, { id: receptionist.id, role }), { status: 403 });
        assert.deepEqual(await repo.find("accounts", receptionist.id), before);
      }
    }
    assert.equal(repo.snapshot().audit.length, user.role === "MANAGER" ? 6 : 3);
  }
});

test("ordinary account APIs cannot create or assign MANAGER, CUSTOMER or unknown roles", async () => {
  for (const user of [admin, manager]) {
    const repo = makeRepo();
    const model = createAccounts(repo);
    const before = repo.snapshot();
    for (const role of ["MANAGER", "CUSTOMER", "UNKNOWN"]) {
      await assert.rejects(model.create(user, {
        role, email: "escalated@example.test", name: "Escalation",
        phone: "0912345678", password: "Staff password 123",
      }), { status: 400 });
      await assert.rejects(model.role(user, { id: receptionist.id, role }), { status: user.role === "MANAGER" ? 400 : 403 });
    }
    assert.deepEqual(repo.snapshot(), before);
  }
});

test("MANAGER is protected from ADMIN edits and from ordinary lock or role changes by either actor", async () => {
  const repo = makeRepo();
  const model = createAccounts(repo);
  const before = repo.snapshot();
  await assert.rejects(model.update(admin, {
    id: manager.id, email: "hijacked@example.test", name: "Hijacked", phone: "0912345678",
  }), { status: 403 });
  for (const user of [admin, manager]) {
    await assert.rejects(model.toggle(user, { id: manager.id }), { status: 403 });
    await assert.rejects(model.role(user, { id: manager.id, role: "ADMIN" }), { status: user.role === "MANAGER" ? 400 : 403 });
  }
  assert.deepEqual(repo.snapshot(), before);
  await model.update(manager, {
    id: manager.id, email: "manager-updated@example.test", name: "Updated manager", phone: "0912345678",
  });
  assert.equal((await repo.find("accounts", manager.id)).email, "manager-updated@example.test");
});

test("both administrators can edit and lock ordinary accounts without accepting an injected role", async () => {
  for (const user of [admin, manager]) {
    const repo = makeRepo();
    const model = createAccounts(repo);
    await model.update(user, {
      id: receptionist.id, email: "updated@example.test", name: "Updated staff",
      phone: "0912345678", role: "MANAGER", authVersion: 999,
    });
    const edited = await repo.find("accounts", receptionist.id);
    assert.equal(edited.name, "Updated staff");
    assert.equal(edited.email, "updated@example.test");
    assert.equal(edited.role, "RECEPTIONIST");
    assert.equal(edited.authVersion, receptionist.authVersion);
    await model.toggle(user, { id: receptionist.id });
    assert.equal((await repo.find("accounts", receptionist.id)).isActive, false);
    await model.toggle(user, { id: receptionist.id });
    const restored = await repo.find("accounts", receptionist.id);
    assert.equal(restored.isActive, true);
    assert.equal(restored.authVersion, receptionist.authVersion + 2);
  }
});

test("staff and customers cannot use any account management operation", async () => {
  const repo = makeRepo();
  const model = createAccounts(repo);
  const before = repo.snapshot();
  for (const user of [receptionist, housekeeper, customer]) {
    for (const method of ["overview", "create", "update", "toggle", "role"]) {
      await assert.rejects(model[method](user, { id: admin.id, role: "ADMIN" }), { status: 403 });
    }
  }
  assert.deepEqual(repo.snapshot(), before);
});

test("legacy OTP APIs allow only MANAGER to initiate a transfer to an active ADMIN", async (t) => {
  enableDemoOtp(t);
  const inactive = { ...admin, id: "TK_INACTIVE", isActive: false };
  const repo = makeRepo({ accounts: [manager, admin, receptionist, housekeeper, customer, inactive] });
  const auth = createAuth(repo);
  const before = repo.snapshot();
  for (const user of [admin, receptionist, housekeeper, customer]) {
    await assert.rejects(auth.challenge(user, "session", { targetId: admin.id }), { status: 403 });
    await assert.rejects(auth.transfer(user, "session", {}), { status: 403 });
  }
  for (const targetId of [manager.id, receptionist.id, housekeeper.id, customer.id, inactive.id, "MISSING"]) {
    await assert.rejects(auth.challenge(manager, "session", { targetId }), { status: 400 });
  }
  const challenge = await auth.challenge(manager, "session", { targetId: admin.id });
  assert.match(challenge.demoCode, /^\d{6}$/);
  assert.ok(challenge.requestId);
  assert.deepEqual(repo.snapshot(), before);
});

test("OTP binds actor and session, rejects wrong codes, then swaps roles and invalidates both accounts", async (t) => {
  enableDemoOtp(t);
  const repo = makeRepo();
  const auth = createAuth(repo);
  const challenge = await auth.challenge(manager, "original-session", { targetId: admin.id });
  const body = { requestId: challenge.requestId, code: challenge.demoCode };
  const before = repo.snapshot();
  await assert.rejects(auth.transfer(manager, "other-session", body), { status: 400 });
  await assert.rejects(auth.transfer({ ...manager, id: "OTHER_MANAGER" }, "original-session", body), { status: 400 });
  const wrongCode = String((Number(challenge.demoCode) + 1) % 1000000).padStart(6, "0");
  await assert.rejects(auth.transfer(manager, "original-session", { ...body, code: wrongCode }), { status: 400 });
  assert.deepEqual(repo.snapshot(), before);

  await auth.transfer(manager, "original-session", { ...body, targetId: receptionist.id });
  const old = await repo.find("accounts", manager.id);
  const next = await repo.find("accounts", admin.id);
  assert.deepEqual(old, { ...manager, role: "ADMIN", authVersion: manager.authVersion + 1 });
  assert.deepEqual(next, { ...admin, role: "MANAGER", authVersion: admin.authVersion + 1 });
  assert.deepEqual(await repo.find("accounts", receptionist.id), receptionist);
  assert.equal(repo.snapshot().accounts.filter((row) => row.isActive && row.role === "MANAGER").length, 1);
  assert.equal(repo.snapshot().audit.length, 1);
  assert.equal(repo.snapshot().audit[0].actorId, manager.id);
  assert.equal(repo.snapshot().audit[0].objectId, admin.id);
  const transferred = repo.snapshot();
  await assert.rejects(auth.transfer(manager, "original-session", body), { status: 400 });
  assert.deepEqual(repo.snapshot(), transferred);
});

test("OTP transfer rechecks persisted roles and active status before either account changes", async (t) => {
  enableDemoOtp(t);
  for (const [id, changes] of [
    [manager.id, { role: "ADMIN" }],
    [manager.id, { isActive: false }],
    [admin.id, { role: "RECEPTIONIST" }],
    [admin.id, { isActive: false }],
  ]) {
    const repo = makeRepo();
    const auth = createAuth(repo);
    const challenge = await auth.challenge(manager, "session", { targetId: admin.id });
    await repo.transaction((tx) => tx.update("accounts", id, changes));
    const before = repo.snapshot();
    await assert.rejects(auth.transfer(manager, "session", {
      requestId: challenge.requestId, code: challenge.demoCode,
    }), { status: 400 });
    assert.deepEqual(repo.snapshot(), before);
  }
});

test("workspace exposes audit and backups only to MANAGER and keeps account secrets private", async (t) => {
  const audit = [{ id: 1, action: "PRIVATE_AUDIT" }];
  const backups = [{ id: "BACKUP", filePath: "PRIVATE_BACKUP" }];
  const repo = makeRepo({ audit, backups });
  const reads = t.mock.method(repo, "list");
  const model = createWorkspace(repo);
  for (const user of [manager, admin, receptionist, housekeeper, customer]) {
    reads.mock.resetCalls();
    const data = await model.workspace(user);
    const keys = reads.mock.calls.map((call) => call.arguments[0]);
    if (user.role === "MANAGER") {
      assert.deepEqual(Object.keys(data).sort(), ["accounts", "audit", "backups", "me"]);
      assert.deepEqual(keys.sort(), ["accounts", "audit", "backups"]);
      assert.deepEqual(data.audit, audit);
      assert.deepEqual(data.backups, backups);
    } else {
      assert.equal(Object.hasOwn(data, "audit"), false);
      assert.equal(Object.hasOwn(data, "backups"), false);
      assert.equal(keys.includes("audit"), false);
      assert.equal(keys.includes("backups"), false);
    }
    assert.equal(Object.hasOwn(data, "accounts"), ["ADMIN", "MANAGER"].includes(user.role));
    assert.equal(JSON.stringify(data).includes("private-password-hash"), false);
    if (data.accounts) assert.equal(data.accounts.length, 5);
  }
});

test("HTTP login, navigation, pages and APIs enforce the role split", async (t) => {
  const repo = makeRepo();
  const passwordHash = await passwords.hash("Role test password 123");
  await repo.transaction(async (tx) => {
    for (const user of [manager, admin]) await tx.update("accounts", user.id, { passwordHash });
  });
  const app = require("../../app")(repo, require("..")(repo));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const user of [manager, admin]) {
      let loginPage;
      try {
        loginPage = await fetch(base + "/login");
      } catch (err) {
        if (err.cause?.code === "EACCES") {
          t.skip("Sandbox environment prevents local loopback fetch");
          return;
        }
        throw err;
      }
      let cookie = loginPage.headers.get("set-cookie").split(";")[0];
      const token = (await loginPage.text()).match(/name="csrf-token" content="([^"]+)"/)[1];
      const login = await fetch(base + "/api/login", {
        method: "POST", headers: { cookie, "Content-Type": "application/json", "X-CSRF-Token": token },
        body: JSON.stringify({ email: user.email, password: "Role test password 123" }),
      });
      assert.equal(login.status, 200);
      cookie = login.headers.get("set-cookie").split(";")[0];
      const get = (path) => fetch(base + path, { headers: { cookie }, redirect: "manual" });
      const landing = await get("/app");
      assert.equal(landing.headers.get("location"), user.role === "MANAGER" ? "/app/accounts" : "/app/dashboard");
      const accountsPage = await get("/app/accounts");
      assert.equal(accountsPage.status, 200);
      const html = await accountsPage.text();
      const nav = html.match(/<nav id="side-nav">([\s\S]*?)<\/nav>/)[1];
      assert.equal(nav.includes('href="/app/bookings"'), user.role === "ADMIN");
      assert.equal(nav.includes('href="/app/backups"'), user.role === "MANAGER");
      for (const path of ["/app/dashboard", "/app/bookings", "/app/stays", "/app/reports", "/app/settings", "/app/rooms", "/app/housekeeping", "/api/modules/dashboard", "/api/modules/reports"])
        assert.equal((await get(path)).status, user.role === "MANAGER" ? 403 : 200, `${user.role} ${path}`);
      for (const path of ["/app/audit", "/app/backups", "/api/modules/audit", "/api/modules/backups"])
        assert.equal((await get(path)).status, user.role === "MANAGER" ? 200 : 403, `${user.role} ${path}`);
      if (user.role === "MANAGER") {
        const data = await (await get("/api/data")).json();
        assert.deepEqual(Object.keys(data).sort(), ["accounts", "audit", "backups", "me"]);
        assert.equal((await get("/api/invoice/nonexistent")).status, 403);
        assert.equal((await get("/api/availability")).status, 403);
      }
    }
  } finally {
    await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  }
});

test("dashboard is operational and restricted to ADMIN", async (t) => {
  const eventAt = "2026-01-01T12:00:00.000Z";
  const repo = makeRepo({
    audit: [{ id: 1, eventAt, action: "PRIVATE_AUDIT", detail: "PRIVATE_DETAIL" }],
    bookings: [{ id: "BOOKING", createdAt: eventAt, status: "CANCELLED" }],
  });
  const reads = t.mock.method(repo, "list");
  const model = createDashboard(repo);
  await assert.rejects(model.list(manager), { status: 403 });
  assert.equal(reads.mock.calls.length, 0);
  reads.mock.resetCalls();
  const adminData = await model.list(admin);
  assert.equal(adminData.recent.items.length, 1);
  assert.equal(adminData.recent.items[0].kind, "booking");
  assert.equal(adminData.recent.items[0].detail, "BOOKING");
  assert.equal(JSON.stringify(adminData).includes("PRIVATE_"), false);
  assert.equal(reads.mock.calls.some((call) => ["audit", "backups"].includes(call.arguments[0])), false);
  for (const user of [receptionist, housekeeper, customer]) {
    await assert.rejects(model.list(user), { status: 403 });
  }
});

test("fixed OTPNUM from config overrides random OTP and accepts fixed code", async (t) => {
  enableDemoOtp(t);
  config.otpNum = "9999";
  const repo = makeRepo();
  const auth = createAuth(repo);
  const challenge = await auth.challenge(manager, "session", { targetId: admin.id });
  assert.equal(challenge.demoCode, "9999");
  await auth.transfer(manager, "session", { requestId: challenge.requestId, code: "9999" });
  const old = await repo.find("accounts", manager.id);
  assert.equal(old.role, "ADMIN");
});


test("transfer postAction LOCK requires >= 2 active ADMINs and deactivates old account when met", async (t) => {
  enableDemoOtp(t);
  const repo1 = makeRepo();
  const auth1 = createAuth(repo1);
  const ch1 = await auth1.challenge(manager, "s1", { targetId: admin.id });
  assert.equal(ch1.adminCount, 1);
  assert.equal(ch1.canLock, false);
  await assert.rejects(
    auth1.transfer(manager, "s1", { requestId: ch1.requestId, code: ch1.demoCode, postAction: "LOCK" }),
    { status: 400 },
  );

  const admin2 = { ...admin, id: "TK_ADMIN_2", email: "admin2@hotel.test" };
  const repo2 = makeRepo({ accounts: [manager, admin, admin2, receptionist, housekeeper, customer] });
  const auth2 = createAuth(repo2);
  const ch2 = await auth2.challenge(manager, "s2", { targetId: admin.id });
  assert.equal(ch2.adminCount, 2);
  assert.equal(ch2.canLock, true);
  await auth2.transfer(manager, "s2", { requestId: ch2.requestId, code: ch2.demoCode, postAction: "LOCK" });
  const old = await repo2.find("accounts", manager.id);
  const next = await repo2.find("accounts", admin.id);
  assert.equal(old.role, "ADMIN");
  assert.equal(old.isActive, false);
  assert.equal(next.role, "MANAGER");
  assert.equal(next.isActive, true);
  const remainingAdmins = (await repo2.list("accounts")).filter((a) => a.role === "ADMIN" && a.isActive);
  assert.equal(remainingAdmins.length, 1);
  assert.equal(remainingAdmins[0].id, admin2.id);
});

test("session duration limits CUSTOMER to config.sessionHours while staff sessions stay long-lived", async () => {
  const repo = makeRepo();
  const authMiddleware = security.auth(repo);

  // 1. In security.auth middleware:
  // Staff account (ADMIN) gets 365 days
  const reqStaff = {
    session: {
      user: { id: admin.id, authVersion: admin.authVersion },
      epoch: global.hotelEpoch,
      cookie: { maxAge: 1000 },
    },
  };
  await new Promise((resolve) => authMiddleware(reqStaff, { locals: {} }, resolve));
  assert.equal(reqStaff.user.role, "ADMIN");
  assert.equal(reqStaff.session.cookie.maxAge, 365 * 24 * 3600000);

  // Customer account (CUSTOMER) gets config.sessionHours
  const reqCustomer = {
    session: {
      user: { id: customer.id, authVersion: customer.authVersion },
      epoch: global.hotelEpoch,
      cookie: { maxAge: 1000 },
    },
  };
  await new Promise((resolve) => authMiddleware(reqCustomer, { locals: {} }, resolve));
  assert.equal(reqCustomer.user.role, "CUSTOMER");
  assert.equal(reqCustomer.session.cookie.maxAge, config.sessionHours * 3600000);

  // 2. In auth.controller login:
  const authController = createAuthController({
    auth: {
      async login(b) {
        return b.email === customer.email ? customer : admin;
      },
    },
  });

  const reqLoginStaff = {
    body: { email: admin.email, password: "test" },
    session: {
      regenerate(cb) { cb(); },
      cookie: {},
    },
  };
  await authController.login(reqLoginStaff, { json() {} });
  assert.equal(reqLoginStaff.session.cookie.maxAge, 365 * 24 * 3600000);

  const reqLoginCustomer = {
    body: { email: customer.email, password: "test" },
    session: {
      regenerate(cb) { cb(); },
      cookie: {},
    },
  };
  await authController.login(reqLoginCustomer, { json() {} });
  assert.equal(reqLoginCustomer.session.cookie.maxAge, config.sessionHours * 3600000);
});

test("workspace returns accounts ordered by role hierarchy: MANAGER -> ADMIN -> RECEPTIONIST -> HOUSEKEEPER -> CUSTOMER", async () => {
  const unsortedAccounts = [
    { ...customer, id: "TK_CUST_1", createdAt: "2026-01-01T00:00:00Z" },
    { ...housekeeper, id: "TK_HK_1", createdAt: "2026-01-02T00:00:00Z" },
    { ...admin, id: "TK_ADM_1", createdAt: "2026-01-03T00:00:00Z" },
    { ...receptionist, id: "TK_REC_1", createdAt: "2026-01-04T00:00:00Z" },
    { ...manager, id: "TK_MGR_1", createdAt: "2026-01-05T00:00:00Z" },
    { ...admin, id: "TK_ADM_2", createdAt: "2026-01-06T00:00:00Z" },
  ];
  const repo = makeRepo({ accounts: unsortedAccounts });
  const wsModel = createWorkspace(repo);

  const mgrData = await wsModel.workspace(manager);
  const roles = mgrData.accounts.map((a) => a.role);
  assert.deepEqual(roles, [
    "MANAGER",
    "ADMIN",
    "ADMIN",
    "RECEPTIONIST",
    "HOUSEKEEPER",
    "CUSTOMER",
  ]);
  // Newer admin (ADM_2) comes before older admin (ADM_1)
  const adminIds = mgrData.accounts.filter((a) => a.role === "ADMIN").map((a) => a.id);
  assert.deepEqual(adminIds, ["TK_ADM_2", "TK_ADM_1"]);

  // Also verify overview exposed role hierarchy
  const accModel = createAccounts(repo);
  const overview = await accModel.overview(manager);
  assert.deepEqual(
    overview.roles.map((r) => r.code),
    ["MANAGER", "ADMIN", "RECEPTIONIST", "HOUSEKEEPER", "CUSTOMER"],
  );
});

test("account creation, update, and customer registration reject duplicate phone numbers and emails with clear guidance", async () => {
  const repo = makeRepo();
  const accModel = createAccounts(repo);
  const authModel = createAuth(repo);

  // 1. Cannot create new staff account with duplicate staff phone
  await assert.rejects(
    accModel.create(manager, {
      role: "RECEPTIONIST",
      email: "newrec@example.test",
      name: "New Rec",
      phone: admin.phone, // Already belongs to admin
      password: "Password123",
    }),
    { status: 409, message: `Số điện thoại '${admin.phone}' đã thuộc tài khoản nhân sự Admin 'ADMIN'. Vui lòng dùng số điện thoại khác.` },
  );

  // 2. Cannot create new staff account with duplicate customer phone without convert confirmation
  await assert.rejects(
    accModel.create(manager, {
      role: "ADMIN",
      role: "ADMIN",
      email: "newadmin@example.test",
      name: "New Admin",
      phone: customer.phone, // Belongs to customer
      password: "Password123",
    }),
    {
      status: 409,
      message: `Thông tin này đang gắn với tài khoản Khách hàng 'CUSTOMER'. Bạn có muốn chuyển đổi tài khoản khách này thành nhân viên không? Hãy xác nhận chuyển đổi hoặc nhập email/SĐT khác.`,
    },
  );

  // 3. Cannot create new staff account with duplicate customer email without convert confirmation
  await assert.rejects(
    accModel.create(manager, {
      role: "ADMIN",
      email: customer.email, // Belongs to customer
      name: "New Admin",
      phone: "0999111222",
      password: "Password123",
    }),
    {
      status: 409,
      message: `Thông tin này đang gắn với tài khoản Khách hàng 'CUSTOMER'. Bạn có muốn chuyển đổi tài khoản khách này thành nhân viên không? Hãy xác nhận chuyển đổi hoặc nhập email/SĐT khác.`,
    },
  );

  // 4. Admin cannot convert customer account to staff (only Manager can)
  await assert.rejects(
    accModel.create(admin, {
      role: "RECEPTIONIST",
      email: customer.email,
      name: "New Rec",
      phone: customer.phone,
      password: "Password123",
      convertCustomer: true,
    }),
    { status: 403, message: "Chỉ Quản lý mới có quyền chuyển đổi tài khoản khách hàng thành nhân sự." },
  );

  // 5. Manager can confirm conversion of customer account to ADMIN during account creation
  const prevVersion = customer.authVersion;
  const converted = await accModel.create(manager, {
    role: "ADMIN",
    email: customer.email,
    name: "Converted Admin",
    phone: customer.phone,
    password: "Password123",
    convertCustomer: true,
  });
  assert.equal(converted.role, "ADMIN");
  assert.equal(converted.id, customer.id);
  const inDb = await repo.find("accounts", customer.id);
  assert.equal(inDb.role, "ADMIN");
  assert.equal(inDb.authVersion, prevVersion + 1);

  // 4. Can create new staff with unique phone & email
  const created = await accModel.create(manager, {
    role: "RECEPTIONIST",
    email: "newrec@example.test",
    name: "New Rec",
    phone: "0999888777",
    password: "Password123",
  });
  assert.equal(created.phone, "0999888777");

  // 5. Cannot update account to another account's phone
  await assert.rejects(
    accModel.update(manager, {
      id: created.id,
      email: "newrec@example.test",
      name: "New Rec Updated",
      phone: receptionist.phone, // Conflicting with receptionist
    }),
    { status: 409, message: `Số điện thoại '${receptionist.phone}' đã thuộc tài khoản nhân sự Lễ tân 'RECEPTIONIST'.` },
  );

  // 6. Can update account keeping its own phone
  await assert.doesNotReject(
    accModel.update(manager, {
      id: created.id,
      email: "newrec-renamed@example.test",
      name: "New Rec Name",
      phone: "0999888777", // Same phone
    }),
  );

  // 7. Cannot register customer with duplicate phone
  await assert.rejects(
    authModel.register({
      name: "Khách Trùng SĐT",
      email: "khachmoi@example.test",
      phone: customer.phone, // Already used by customer
      password: "Password123",
      confirmPassword: "Password123",
    }),
    { status: 409, message: "Số điện thoại đã được sử dụng." },
  );

  // 8. Manager can reassign staff role via "Đổi vai trò"
  const prevRecVersion = receptionist.authVersion;
  await accModel.role(manager, { id: receptionist.id, role: "HOUSEKEEPER" });
  const updatedRec = await repo.find("accounts", receptionist.id);
  assert.equal(updatedRec.role, "HOUSEKEEPER");
  assert.equal(updatedRec.authVersion, prevRecVersion + 1); // session revoked for security
});

test("phone validation enforces strictly 10 digits starting with 0 across staff creation, update, and customer registration", async () => {
  const repo = makeRepo();
  const accModel = createAccounts(repo);
  const authModel = createAuth(repo);

  const invalidPhones = [
    "09012345678", // 11 digits
    "090123456", // 9 digits
    "1901234567", // does not start with 0
    "090123456a", // letters
    "+8490123456", // +84 format rejected
    "090 123 456", // spaces
  ];

  for (const phone of invalidPhones) {
    await assert.rejects(
      accModel.create(manager, {
        role: "RECEPTIONIST",
        email: `valid${Math.random()}@example.test`,
        name: "Test Staff",
        phone,
        password: "Password123",
      }),
      { status: 400, message: "Số điện thoại không hợp lệ. Phải gồm 10 chữ số và bắt đầu bằng số 0." },
    );

    await assert.rejects(
      authModel.register({
        name: "Test Customer",
        email: `cust${Math.random()}@example.test`,
        phone,
        password: "Password123",
        confirmPassword: "Password123",
      }),
      { status: 400, message: "Số điện thoại không hợp lệ. Phải gồm 10 chữ số và bắt đầu bằng số 0." },
    );
  }
});
