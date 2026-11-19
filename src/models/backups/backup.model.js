/** Manager-only backups. SQL restore deliberately remains an offline operation. */
const fs = require("node:fs/promises");
const path = require("node:path");
const { allow } = require("../../core/auth/rbac");
const { AppError, ensure } = require("../../core/errors/AppError");
const v = require("../../core/validation/fields");
const { audit } = require("../_shared/stayRules");
const config = require("../../config/env");

const demoBackupRoot = path.resolve(config.root, "data/backups");

module.exports = (repo) => {
  async function record(user, row, action) {
    await repo.transaction(async (tx) => {
      await tx.insert("backups", row);
      await audit(tx, user, action, "BACKUP", row.id, row.status);
    });
  }

  return {
    async overview(user) {
      allow(user, "admin");
      const history = (await repo.list("backups"))
        .sort((a, b) => Date.parse(b.backupAt) - Date.parse(a.backupAt))
        .map((row) => ({
          ...row,
          canRestore:
            repo.mode === "demo" &&
            row.status === "SUCCESS" &&
            String(row.filePath).toLowerCase().endsWith(".json"),
        }));
      return {
        mode: repo.mode,
        canRestore: repo.mode === "demo",
        sqlBackupConfigured: repo.mode !== "sqlserver" || Boolean(config.backupDir),
        history,
      };
    },
    async backup(user, body = {}) {
      allow(user, "admin");
      ensure(
        body.confirm === "SAO LUU",
        'Nhập chính xác "SAO LUU" để xác nhận.',
      );
      const id = v.id("BK");
      const backupAt = new Date().toISOString();
      const name = `hotel-${backupAt.replace(/[:.]/g, "-")}-${id.slice(-6)}`;
      const relativeDemoPath = `data/backups/${name}.json`;
      const filePath =
        repo.mode === "demo"
          ? relativeDemoPath
          : config.backupDir
            ? `${config.backupDir.replace(/[\\/]$/, "")}/${name}.bak`
            : "SQL_BACKUP_DIR chưa cấu hình";
      try {
        if (repo.mode === "demo") {
          await fs.mkdir(demoBackupRoot, { recursive: true });
          await fs.writeFile(
            path.join(demoBackupRoot, `${name}.json`),
            JSON.stringify(await repo.snapshot()),
            { mode: 0o600 },
          );
        } else {
          ensure(
            config.backupDir,
            "Cấu hình SQL_BACKUP_DIR trên máy SQL Server trước.",
            503,
          );
          const { sql, connect } = require("../../config/db");
          const request = new sql.Request(await connect());
          request.input("backupPath", sql.NVarChar(4000), filePath);
          const database = config.sql.database.replace(/]/g, "]]");
          await request.query(
            `BACKUP DATABASE [${database}] TO DISK=@backupPath WITH COPY_ONLY, CHECKSUM`,
          );
        }
        await record(
          user,
          {
            id,
            filePath,
            backupAt,
            createdBy: user.id,
            status: "SUCCESS",
            note:
              repo.mode === "demo"
                ? "Bản chụp JSON demo; không phải tệp SQL .bak."
                : "SQL Server COPY_ONLY với CHECKSUM.",
          },
          "Sao lưu dữ liệu",
        );
      } catch (error) {
        const message = error.status
          ? error.message
          : repo.mode === "demo"
            ? "Không thể ghi tệp sao lưu demo. Kiểm tra quyền thư mục dữ liệu."
            : "SQL Server không thể tạo bản sao. Kiểm tra quyền BACKUP, đường dẫn máy chủ và nhật ký SQL Server.";
        try {
          await record(
            user,
            {
              id,
              filePath,
              backupAt,
              createdBy: user.id,
              status: "FAILED",
              note: message.slice(0, 500),
            },
            "Sao lưu thất bại",
          );
        } catch (recordError) {
          console.error(
            "BackupHistory",
            recordError.number || "",
            recordError.message,
          );
        }
        throw new AppError(message, error.status || 503);
      }
      return { message: "Đã tạo bản sao lưu.", id };
    },
    async restore(user, body = {}) {
      allow(user, "admin");
      ensure(
        repo.mode === "demo",
        "Khôi phục SQL không khả dụng trên web. Dùng SSMS trong cửa sổ bảo trì ngoại tuyến.",
        409,
      );
      const row = await repo.find("backups", body.id);
      ensure(row && row.status === "SUCCESS", "Bản sao không hợp lệ.", 404);
      ensure(
        body.confirm === `KHOI PHUC ${row.id}`,
        `Nhập chính xác "KHOI PHUC ${row.id}" để xác nhận.`,
      );
      const source = path.resolve(config.root, row.filePath);
      ensure(
        source.startsWith(`${demoBackupRoot}${path.sep}`) &&
          source.toLowerCase().endsWith(".json"),
        "Đường dẫn bản sao không hợp lệ.",
      );
      let data;
      try {
        data = JSON.parse(await fs.readFile(source, "utf8"));
      } catch {
        throw new AppError("Không thể đọc bản sao demo đã chọn.", 409);
      }
      await repo.restore(data);
      await repo.transaction(async (tx) => {
        if (!(await tx.find("backups", row.id))) await tx.insert("backups", row);
        await audit(tx, user, "Khôi phục dữ liệu demo", "BACKUP", row.id);
      });
      return {
        message: "Đã khôi phục bản sao demo. Tất cả phiên sẽ kết thúc.",
        logoutAll: true,
      };
    },
  };
};
