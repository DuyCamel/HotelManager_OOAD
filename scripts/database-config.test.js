const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const checkSource = fs.readFileSync(path.join(__dirname, "check-db.js"), "utf8");
const schemaSource = fs.readFileSync(
  path.join(__dirname, "../database/HotelManagerOOAD.sql"),
  "utf8",
);

async function runCheck(database, summary, mode = "sqlserver") {
  const output = { errors: [], queries: [], connections: 0, closed: 0 };
  const process = { exitCode: 0 };
  await vm.runInNewContext(checkSource, {
    require(id) {
      if (id === "../src/config/env") return { mode, sql: { database } };
      assert.equal(id, "../src/config/db");
      return {
        async connect() {
          output.connections++;
          return {
            request: () => ({
              async query(sql) {
                output.queries.push(sql);
                return { recordset: [summary] };
              },
            }),
          };
        },
        async close() { output.closed++; },
      };
    },
    console: {
      log() {},
      error: (...args) => output.errors.push(args.join(" ")),
    },
    process,
  });
  return { ...output, exitCode: process.exitCode };
}

test("db:check checks schema in the database configured by DB_NAME", async () => {
  for (const database of ["HotelManagerOOAD", "Hotel_Dev", "Khách sạn [test]"]) {
    const result = await runCheck(database, {
      databaseName: database,
      schemaVersion: 4,
    });
    assert.equal(result.connections, 1, database);
    assert.equal(result.queries.length, 1, database);
    assert.match(result.errors.join("\n"), /SchemaVersion=4; cần 5/);
    assert.equal(result.exitCode, 1);
    assert.equal(result.closed, 1);
  }
});

test("db:check still rejects a connection to a different database", async () => {
  const result = await runCheck("Hotel_Dev", {
    databaseName: "OtherHotel",
    schemaVersion: 5,
  });
  assert.equal(result.connections, 1);
  assert.match(result.errors.join("\n"), /OtherHotel/);
  assert.match(result.errors.join("\n"), /Hotel_Dev/);
  assert.equal(result.exitCode, 1);
  assert.equal(result.closed, 1);
});

test("db:check keeps validating application data for a custom database name", async () => {
  const result = await runCheck("Hotel_Dev", {
    databaseName: "Hotel_Dev",
    schemaVersion: 5,
    settingCount: 0,
  });
  assert.match(result.errors.join("\n"), /HotelSetting phải có đúng một dòng/);
  assert.equal(result.exitCode, 1);
  assert.equal(result.closed, 1);
});

test("db:check still rejects demo mode without opening a SQL connection", async () => {
  const result = await runCheck("Hotel_Dev", {}, "demo");
  assert.equal(result.connections, 0);
  assert.match(result.errors.join("\n"), /DB_MODE=sqlserver/);
  assert.equal(result.exitCode, 1);
  assert.equal(result.closed, 1);
});

test("schema installer preserves the selected database across all batches", () => {
  const sql = schemaSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\n]*/g, "");
  assert.doesNotMatch(sql, /^\s*USE\s+/im);
  assert.doesNotMatch(sql, /\bCREATE\s+DATABASE\b/i);
  assert.match(sql.split(/^\s*GO\s*$/im)[0], /DB_ID\(\)\s*(?:<=\s*4|IN\s*\(\s*1\s*,\s*2\s*,\s*3\s*,\s*4\s*\))/i);
  assert.match(sql.split(/^\s*GO\s*$/im)[0], /SET NOEXEC ON/i);
  assert.match(sql.trim(), /SET NOEXEC OFF;\s*GO$/i);
});

test("standalone SePay upgrade also guards against selecting a system database", () => {
  const block = schemaSource.split("-- BEGIN SEPAY SCHEMA V5")[1]?.split("-- END SEPAY SCHEMA V5")[0];
  assert.ok(block, "standalone upgrade markers must be preserved");
  assert.match(block.split(/^\s*GO\s*$/im)[0], /DB_ID\(\)/i);
  assert.match(block.split(/^\s*GO\s*$/im)[0], /SET NOEXEC ON/i);
  assert.match(block.trim(), /SET NOEXEC OFF;\s*GO$/i);
});
