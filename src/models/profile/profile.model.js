/**
 * TASK-BAN-GIAO (TODO) | Phụ trách: TV1 | Mã việc: A2
 * Đây là việc còn lại/nghiệm thu, không phải mô tả tính năng đã hoàn tất.
 * Đồng bộ thông tin tài khoản/hồ sơ khách; thống nhất địa chỉ tối đa 512 ký tự với Customer/SQL.
 * Hoàn thiện dữ liệu hồ sơ/thẻ/lịch sử cho màn hình cá nhân; giữ kiểm tra giấy tờ trùng và mật khẩu nguyên văn.
 * Chi tiết, phụ thuộc và tiêu chí xong: docs/PHAN_CONG_3_NGUOI.md.
 */
/** Khách cập nhật đúng hồ sơ của mình; không thay đổi vai trò qua trang hồ sơ. */
const v = require("../../core/validation/fields");
const passwords = require("../../core/auth/passwords");
const { ensure } = require("../../core/errors/AppError");
const { audit } = require("../_shared/stayRules");
const customerFields = require("../customers/customer.validation");
module.exports = (repo) => ({
  async update(user, b) {
    const contact = customerFields.contact(b);
    return repo.transaction(async (tx) => {
      const account = await tx.find("accounts", user.id);
      ensure(account?.isActive, "Tài khoản không còn hoạt động.", 409);
      const allAccounts = await tx.list("accounts");
      ensure(
        !allAccounts.some(
          (x) => x.id !== user.id && x.phone === contact.phone,
        ),
        "Số điện thoại đã thuộc tài khoản khác.",
        409,
      );
      const customers = await tx.list("customers");
      const c = customers.find((x) => x.accountId === user.id);
      let values;
      if (c) {
        values = customerFields.profile(b, c);
        ensure(
          !values.identityNo ||
            !customers.some(
              (x) =>
                x.id !== c.id &&
                customerFields.identityKey(x.identityNo) ===
                  customerFields.identityKey(values.identityNo),
            ),
          "Giấy tờ đã thuộc hồ sơ khách khác.",
          409,
        );
      }
      await tx.update("accounts", user.id, contact);
      if (c) await tx.update("customers", c.id, values);
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
