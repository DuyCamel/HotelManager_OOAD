/** Tạo cấu hình local từ .env_ex, sinh session secret; không ghi đè file đã có. */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");
const file = path.join(root, ".env");
if (!fs.existsSync(file)) {
  const sample = fs.readFileSync(path.join(root, ".env_ex"), "utf8");
  fs.writeFileSync(
    file,
    sample.replace(
      "CHANGE_ME_GENERATE_WITH_NPM_RUN_SETUP",
      crypto.randomBytes(48).toString("hex"),
    ),
    { flag: "wx", mode: 0o600 },
  );
  console.log(
    "Đã tạo .env. Chế độ demo sẵn sàng; sửa DB_MODE nếu dùng SQL Server.",
  );
} else console.log("Đã có .env, giữ nguyên cấu hình của máy bạn.");
