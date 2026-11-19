/**
 * TASK-BAN-GIAO (TODO) | Phụ trách: TV1 | Mã việc: A2
 * Đây là việc còn lại/nghiệm thu, không phải mô tả tính năng đã hoàn tất.
 * Bổ sung tra cứu/lịch sử khách và thẻ theo hợp đồng truy vấn A6; tái sử dụng save/issueCard/disableCard đã có.
 * Nghiệm thu hồ sơ không tài khoản, cấp thẻ một lần, vô hiệu hóa không xóa và điểm chỉ đến từ hóa đơn PAID; phối hợp TV2/B6.
 * Chi tiết, phụ thuộc và tiêu chí xong: docs/PHAN_CONG_3_NGUOI.md.
 */
/** Hồ sơ khách không bắt buộc tài khoản. Thẻ không xóa, không có API chỉnh điểm. */
const v = require("../../core/validation/fields");
const { ensure } = require("../../core/errors/AppError");
const { allow } = require("../../core/auth/rbac");
const h = require("../_shared/stayRules");
const fields = require("./customer.validation");

module.exports = (repo) => ({
  async save(user, b) {
    allow(user, "customers");
    return repo.transaction(async (tx) => {
      const old = b.id ? await tx.find("customers", b.id) : null;
      ensure(!b.id || old?.isActive, "Hồ sơ không tồn tại hoặc đã lưu trữ.");
      const values = fields.profile(b, old || {});
      const customers = await tx.list("customers");
      ensure(
        !values.identityNo ||
          !customers.some(
            (c) =>
              c.id !== old?.id &&
              fields.identityKey(c.identityNo) ===
                fields.identityKey(values.identityNo),
          ),
        "Giấy tờ đã thuộc hồ sơ khác.",
        409,
      );
      const row = {
        id: old?.id || v.id("KH"),
        ...values,
        accountId: old?.accountId || null,
        isActive: true,
        createdAt: old?.createdAt || new Date().toISOString(),
      };
      if (old) await tx.update("customers", old.id, row);
      else await tx.insert("customers", row);
      if (row.accountId) {
        const account = await tx.find("accounts", row.accountId);
        ensure(
          account?.role === "CUSTOMER",
          "Liên kết tài khoản khách không hợp lệ.",
          409,
        );
        ensure(
          !(await tx.list("accounts")).some(
            (x) => x.id !== account.id && x.phone === row.phone,
          ),
          "Số điện thoại đã thuộc tài khoản khác.",
          409,
        );
        await tx.update("accounts", account.id, {
          name: row.name,
          phone: row.phone,
        });
      }
      await h.audit(tx, user, "Lưu hồ sơ", "CUSTOMER", row.id);
      return row;
    });
  },
  async archive(user, b) {
    allow(user, "customers");
    return repo.transaction(async (tx) => {
      const id = v.text(b.id, "Mã khách hàng", 20);
      const c = await tx.find("customers", id);
      ensure(c?.isActive, "Hồ sơ không tồn tại hoặc đã lưu trữ.", 404);
      const bookings = (await tx.list("bookings")).filter(
        (x) => x.customerId === c.id,
      );
      ensure(
        !bookings.some(h.active),
        "Khách còn giao dịch dang dở.",
      );
      const bookingIds = new Set(bookings.map((x) => x.id));
      const stays = (await tx.list("stays")).filter((x) =>
        bookingIds.has(x.bookingId),
      );
      ensure(
        !stays.some((x) => !x.checkOutAt),
        "Khách đang lưu trú, không thể lưu trữ hồ sơ.",
      );
      const stayIds = new Set(stays.map((x) => x.id));
      ensure(
        !(await tx.list("invoices")).some(
          (x) =>
            (x.customerId === c.id || stayIds.has(x.stayId)) &&
            x.status !== "PAID",
        ),
        "Khách còn hóa đơn chưa hoàn tất.",
      );
      for (const card of (await tx.list("cards")).filter(
        (x) => x.customerId === c.id && x.isActive,
      ))
        await tx.update("cards", card.id, { isActive: false });
      if (c.accountId) {
        const account = await tx.find("accounts", c.accountId);
        ensure(
          account?.role === "CUSTOMER",
          "Liên kết tài khoản khách không hợp lệ.",
          409,
        );
        await tx.update("accounts", account.id, {
          isActive: false,
          authVersion: Number(account.authVersion || 0) + 1,
        });
      }
      await tx.update("customers", c.id, { isActive: false });
      await h.audit(tx, user, "Lưu trữ hồ sơ", "CUSTOMER", c.id);
      return { ok: true };
    });
  },
});
