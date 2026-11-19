const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

test("demo restore requires exactly one active MANAGER regardless of ADMIN count", async (t) => {
  const config = require("../../config/env");
  const { defs } = require("./definitions");
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "hotel-hierarchy-test-"));
  const originalFile = config.demoFile;
  config.demoFile = path.join(directory, "demo.json");
  t.after(async () => {
    config.demoFile = originalFile;
    await fs.rm(directory, { recursive: true, force: true });
  });
  const initial = {
    meta: { version: 2 },
    ...Object.fromEntries(Object.keys(defs).map((key) => [key, []])),
    accounts: [{ id: "MANAGER", role: "MANAGER", isActive: true }],
  };
  await fs.writeFile(config.demoFile, JSON.stringify(initial));
  const repo = require("./demo.model");
  await repo.init();

  const activeManager = initial.accounts[0];
  const admin = { id: "ADMIN", role: "ADMIN", isActive: true };
  for (const accounts of [
    [],
    [admin],
    [admin, { ...activeManager, isActive: false }],
    [activeManager, { ...activeManager, id: "SECOND_MANAGER" }, admin],
  ]) {
    await assert.rejects(repo.restore({ ...initial, accounts }), { status: 400 });
    assert.deepEqual(await repo.snapshot(), initial);
    assert.deepEqual(JSON.parse(await fs.readFile(config.demoFile, "utf8")), initial);
  }

  for (const admins of [[], [admin, { ...admin, id: "SECOND_ADMIN" }]]) {
    const backup = { ...initial, accounts: [
      activeManager, { ...activeManager, id: "INACTIVE_MANAGER", isActive: false }, ...admins,
    ] };
    await repo.restore(backup);
    assert.deepEqual(await repo.snapshot(), backup);
    assert.deepEqual(JSON.parse(await fs.readFile(config.demoFile, "utf8")), backup);
  }
});
