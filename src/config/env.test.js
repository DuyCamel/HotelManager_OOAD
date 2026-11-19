const { test } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");

test("business times are read from environment and used in stay deadlines", () => {
  const projectRoot = path.resolve(__dirname, "../..");
  const output = execFileSync(
    process.execPath,
    [
      "-e",
      [
        'const config = require("./src/config/env");',
        'const rules = require("./src/models/_shared/stayRules");',
        'const stay = rules.fixedStayTimes("2026-11-18", "2026-11-19");',
        'process.stdout.write(JSON.stringify({ config, stay, deadline: rules.noShowDeadline(stay) }));',
      ].join("\n"),
    ],
    {
      cwd: projectRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        DB_MODE: "demo",
        SESSION_SECRET: "environment-test-secret-long-enough",
        APP_TIME_ZONE: "Asia/Ho_Chi_Minh",
        APP_CHECK_IN_TIME: "15:30:00",
        APP_CHECK_OUT_TIME: "11:45:00",
        APP_NO_SHOW_TIME: "23:10:00",
        APP_BOOKING_HOLD_MINUTES: "7",
      },
    },
  );
  const result = JSON.parse(output);
  assert.equal(result.config.checkInTime, "15:30:00");
  assert.equal(result.config.checkOutTime, "11:45:00");
  assert.equal(result.config.noShowTime, "23:10:00");
  assert.equal(result.config.bookingHoldMinutes, 7);
  assert.equal(result.stay.startAt, "2026-11-18T08:30:00.000Z");
  assert.equal(result.stay.endAt, "2026-11-19T04:45:00.000Z");
  assert.equal(result.deadline, Date.parse("2026-11-18T23:10:00+07:00"));
});
