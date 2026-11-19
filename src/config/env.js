/**
 * TASK-BAN-GIAO (TODO) | Phụ trách: TV1 | Mã việc: A4, A5, A6, C1
 * Đây là việc còn lại/nghiệm thu, không phải mô tả tính năng đã hoàn tất.
 * Cập nhật kiểm tra cấu hình OTP/session/backup nếu có tích hợp; đồng bộ tên biến với .env_ex và tài liệu.
 * Phối hợp TV2/TV3 thống nhất múi giờ; không hardcode mật khẩu SQL hoặc API key vào code.
 * Chi tiết, phụ thuộc và tiêu chí xong: docs/PHAN_CONG_3_NGUOI.md.
 */
/** Cấu hình duy nhất; DB_MODE sai hoặc cấu hình production chưa đủ sẽ dừng sớm. */
const path = require("node:path");
require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
  quiet: true,
});
const { ensure } = require("../core/errors/AppError");
const e = process.env;
const config = {
  root: path.resolve(__dirname, "../.."),
  port: Number(e.PORT || 3000),
  production: e.NODE_ENV === "production",
  mode: e.DB_MODE || "demo",
  name: e.APP_NAME || "Aurora Hotel",
  timeZone: e.APP_TIME_ZONE || "Asia/Ho_Chi_Minh",
  checkInTime: e.APP_CHECK_IN_TIME || "14:00:00",
  checkOutTime: e.APP_CHECK_OUT_TIME || "12:00:00",
  noShowTime: e.APP_NO_SHOW_TIME || "22:00:00",
  bookingHoldMinutes: Number(e.APP_BOOKING_HOLD_MINUTES || 10),
  sessionSecret: e.SESSION_SECRET || "",
  sessionHours: Number(e.SESSION_HOURS || 8),
  otpProvider: e.OTP_PROVIDER || "disabled",
  otpNum: (e.OTPNUM || e.otpnum || e.OTP_NUM || "").trim(),
  trustProxy: e.TRUST_PROXY === "1",
  sepay: {
    apiKey: e.SEPAY_WEBHOOK_API_KEY || "",
    bankId: (e.SEPAY_BANK_ID || "").trim(),
    accountNo: (e.SEPAY_ACCOUNT_NO || "").trim(),
    accountName: (e.SEPAY_ACCOUNT_NAME || "").trim(),
  },
  demoFile: path.resolve(e.DEMO_DATA_FILE || "data/demo.json"),
  backupDir: e.SQL_BACKUP_DIR || "",
  sql: {
    server: e.DB_SERVER || "localhost",
    port: Number(e.DB_PORT || 1433),
    database: e.DB_NAME || "",
    user: e.DB_USER,
    password: e.DB_PASSWORD,
    options: {
      encrypt: e.DB_ENCRYPT !== "false",
      trustServerCertificate: e.DB_TRUST_SERVER_CERTIFICATE === "true",
      useUTC: true,
      enableArithAbort: true,
    },
    pool: { min: 0, max: 5, idleTimeoutMillis: 30000 },
  },
};
ensure(
  ["demo", "sqlserver"].includes(config.mode),
  "DB_MODE phải là demo hoặc sqlserver.",
);
ensure(
  config.sessionSecret.length >= 32 &&
    !config.sessionSecret.startsWith("CHANGE_ME"),
  "Chạy npm run setup để tạo SESSION_SECRET riêng.",
);
ensure(
  Number.isInteger(config.port) && config.port > 0 && config.port < 65536,
  "PORT không hợp lệ.",
);
ensure(
  Number.isFinite(config.sessionHours) &&
    config.sessionHours > 0 &&
    config.sessionHours <= 72,
  "SESSION_HOURS phải từ 1 đến 72.",
);
for (const [name, value] of [
  ["APP_CHECK_IN_TIME", config.checkInTime],
  ["APP_CHECK_OUT_TIME", config.checkOutTime],
  ["APP_NO_SHOW_TIME", config.noShowTime],
])
  ensure(
    /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(String(value)),
    `${name} phải có dạng HH:mm hoặc HH:mm:ss.`,
  );
const timeMinutes = (value) => {
  const [hours, minutes] = String(value).split(":").map(Number);
  return hours * 60 + minutes;
};
ensure(
  timeMinutes(config.noShowTime) > timeMinutes(config.checkInTime),
  "APP_NO_SHOW_TIME phải sau APP_CHECK_IN_TIME.",
);
ensure(
  Number.isInteger(config.bookingHoldMinutes) &&
    config.bookingHoldMinutes > 0 &&
    config.bookingHoldMinutes <= 1440,
  "APP_BOOKING_HOLD_MINUTES phải từ 1 đến 1440.",
);
if (config.production) {
  ensure(config.mode === "sqlserver", "Production phải dùng SQL Server.");
  ensure(config.otpProvider !== "demo", "Production không được dùng OTP demo.");
}
module.exports = config;
