/**
 * TASK-BAN-GIAO (TODO) | Phụ trách: TV1 | Mã việc: A2
 * Đây là việc còn lại/nghiệm thu, không phải mô tả tính năng đã hoàn tất.
 * Đồng bộ thông tin tài khoản/hồ sơ khách; thống nhất địa chỉ tối đa 512 ký tự với Customer/SQL.
 * Hoàn thiện dữ liệu hồ sơ/thẻ/lịch sử cho màn hình cá nhân; giữ kiểm tra giấy tờ trùng và mật khẩu nguyên văn.
 * Chi tiết, phụ thuộc và tiêu chí xong: docs/PHAN_CONG_3_NGUOI.md.
 */
/** Khách cập nhật đúng hồ sơ của mình; không thay đổi vai trò qua trang hồ sơ. */
const v = require("../shared/validation");
const passwords = require("../shared/passwords");
const { ensure } = require("../shared/errors");
const { audit } = require("./helpers");
module.exports = (repo) => ({
  async update(user, b) {
    const name = v.text(b.name, "Họ tên", 120),
      phone = v.phone(b.phone);
    return repo.transaction(async (tx) => {
      await tx.update("accounts", user.id, { name, phone });
      const c = (await tx.list("customers")).find(
        (x) => x.accountId === user.id,
      );
      if (c && b.identityNo)
        ensure(
          !(await tx.list("customers")).some(
            (x) => x.id !== c.id && x.identityNo === b.identityNo.trim(),
          ),
          "Giấy tờ đã thuộc hồ sơ khách khác.",
          409,
        );
      if (c)
        await tx.update("customers", c.id, {
          name,
          phone,
          address: String(b.address || "").slice(0, 250),
          identityNo: b.identityNo
            ? v.text(b.identityNo, "Giấy tờ", 30)
            : c.identityNo,
        });
      await audit(tx, user, "Cập nhật hồ sơ", "ACCOUNT", user.id);
      return { ok: true };
    });
  },
  async password(user, b) {
    ensure(
      v.password(b.newPassword).length >= 8,
      "Mật khẩu mới tối thiểu 8 ký tự.",
    );
    ensure(
      b.newPassword === b.confirmPassword,
      "Mật khẩu nhập lại không khớp.",
    );
    const current = await repo.find("accounts", user.id);
    ensure(
      await passwords.verify(String(b.oldPassword || ""), current.passwordHash),
      "Mật khẩu hiện tại không đúng.",
    );
    const passwordHash = await passwords.hash(b.newPassword);
    await repo.transaction(async (tx) => {
      const a = await tx.find("accounts", user.id);
      ensure(
        a.passwordHash === current.passwordHash,
        "Tài khoản vừa thay đổi. Hãy thử lại.",
        409,
      );
      await tx.update("accounts", user.id, {
        passwordHash,
        authVersion: a.authVersion + 1,
      });
      await audit(tx, user, "Đổi mật khẩu", "ACCOUNT", user.id);
    });
    return { message: "Đã đổi mật khẩu. Hãy đăng nhập lại.", logout: true };
  },
});
