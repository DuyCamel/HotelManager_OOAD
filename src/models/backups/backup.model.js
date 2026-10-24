/**
 * TASK-BAN-GIAO (TODO) | Phụ trách: TV1 | Mã việc: A3, A5
 * Đây là việc còn lại/nghiệm thu, không phải mô tả tính năng đã hoàn tất.
 * Tách truy vấn nhật ký có lọc/phân trang/xuất CSV và bản in PDF (có thể tạo auditService.js khi triển khai).
 * Hoàn thiện trạng thái sao lưu thành công/thất bại, hướng dẫn và giao diện khôi phục; SQL restore giữ ngoại tuyến trừ khi chốt cách khác.
 * Không mở lại tùy chỉnh giờ 12:00–14:00/12:00 đã cố định trong bản hiện tại.
 * Chi tiết, phụ thuộc và tiêu chí xong: docs/PHAN_CONG_3_NGUOI.md.
 */
/** Thiết lập và bản sao chỉ Admin. SQL backup chạy tại máy SQL Server, không nhận đường dẫn tùy ý từ HTTP. */
const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { allow } = require("../../core/auth/rbac");
const { ensure } = require("../../core/errors/AppError");
const v = require("../../core/validation/fields");
const { audit } = require("../_shared/stayRules");
const config = require("../../config/env");

module.exports = (repo) => ({
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
      const { sql, connect } = require("../../config/db");
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
