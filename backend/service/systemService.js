/** Thiết lập và bản sao chỉ Admin. SQL backup chạy tại máy SQL Server, không nhận đường dẫn tùy ý từ HTTP. */
const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { allow } = require("../shared/permissions");
const { ensure } = require("../shared/errors");
const v = require("../shared/validation");
const { audit } = require("./helpers");
const config = require("../config/env");
module.exports = (repo) => ({
  async settings(user, b) {
    allow(user, "admin");
    const row = {
      hotelName: v.text(b.hotelName, "Tên khách sạn", 150),
      address: v.text(b.address, "Địa chỉ", 250),
      hotline: v.phone(b.hotline),
      checkInTime: v.text(b.checkInTime, "Giờ nhận", 8),
      checkOutTime: v.text(b.checkOutTime, "Giờ trả", 8),
      lateFeeFrom: v.text(b.lateFeeFrom, "Giờ phụ thu", 8),
      lateFeePercent: v.number(b.lateFeePercent, "Phụ thu %", 0, 100),
      bankCode: v.text(b.bankCode, "Ngân hàng", 30),
      bankAccount: v.text(b.bankAccount, "Số tài khoản", 40),
      bankOwner: v.text(b.bankOwner, "Chủ tài khoản", 150),
    };
    for (const k of ["checkInTime", "checkOutTime", "lateFeeFrom"])
      ensure(
        /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(row[k]),
        "Giờ không hợp lệ.",
      );
    await repo.transaction(async (tx) => {
      await tx.update("settings", 1, row);
      await audit(tx, user, "Cập nhật cấu hình", "SETTING", "1");
    });
    return { ok: true };
  },
  async backup(user) {
    allow(user, "admin");
    const name =
      "hotel-" +
      new Date().toISOString().replace(/[:.]/g, "-") +
      "-" +
      randomUUID().slice(0, 8);
    let file;
    if (repo.mode === "demo") {
      file = "data/backups/" + name + ".json";
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, JSON.stringify(await repo.snapshot()), {
        mode: 0o600,
      });
    } else {
      ensure(
        config.backupDir,
        "Cấu hình SQL_BACKUP_DIR trên máy SQL Server trước.",
        503,
      );
      const { sql, connect } = require("../database/connection");
      file = config.backupDir.replace(/[\\/]$/, "") + "/" + name + ".bak";
      const req = new sql.Request(await connect());
      req.input("p", sql.NVarChar(4000), file);
      const database = config.sql.database.replace(/]/g, "]]");
      await req.query(
        `BACKUP DATABASE [${database}] TO DISK=@p WITH COPY_ONLY, CHECKSUM`,
      );
    }
    return repo.transaction(async (tx) => {
      const row = {
        id: v.id("BK"),
        filePath: file,
        backupAt: new Date().toISOString(),
        createdBy: user.id,
        status: "SUCCESS",
        note:
          repo.mode === "demo"
            ? "JSON demo — không phải SQL .bak"
            : "SQL COPY_ONLY CHECKSUM",
      };
      await tx.insert("backups", row);
      await audit(tx, user, "Sao lưu dữ liệu", "BACKUP", row.id);
      return { message: "Đã sao lưu.", id: row.id };
    });
  },
  async restore(user, b) {
    allow(user, "admin");
    ensure(
      repo.mode === "demo",
      "Khôi phục SQL thực hiện ngoại tuyến bằng SSMS để đóng kết nối an toàn. Xem hướng dẫn database.",
      409,
    );
    const row = await repo.find("backups", b.id);
    ensure(
      row && row.filePath.startsWith("data/backups/"),
      "Bản sao không hợp lệ.",
    );
    const data = JSON.parse(await fs.readFile(row.filePath, "utf8"));
    await repo.restore(data);
    return {
      message: "Đã khôi phục demo. Tất cả phiên đăng nhập sẽ kết thúc.",
      logoutAll: true,
    };
  },
});
