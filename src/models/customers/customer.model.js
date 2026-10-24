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

module.exports = (repo) => ({
  async save(user, b) {
    allow(user, "customers");
    return repo.transaction(async (tx) => {
      const old = b.id ? await tx.find("customers", b.id) : null;
      ensure(!b.id || old?.isActive, "Hồ sơ không tồn tại hoặc đã lưu trữ.");
      const identityNo = v.text(b.identityNo, "CCCD/Hộ chiếu", 30);
      ensure(
        !(await tx.list("customers")).some(
          (c) => c.id !== old?.id && c.identityNo === identityNo,
        ),
        "Giấy tờ đã thuộc hồ sơ khác.",
        409,
      );
      const row = {
        id: old?.id || v.id("KH"),
        name: v.text(b.name, "Họ tên", 120),
        phone: v.phone(b.phone),
        identityNo,
        address: String(b.address || "").slice(0, 512),
        accountId: old?.accountId || null,
        isActive: true,
        createdAt: old?.createdAt || new Date().toISOString(),
      };
      if (old) await tx.update("customers", old.id, row);
      else await tx.insert("customers", row);
      await h.audit(tx, user, "Lưu hồ sơ", "CUSTOMER", row.id);
      return row;
    });
  },
  async archive(user, b) {
    allow(user, "catalog");
    return repo.transaction(async (tx) => {
      const c = await tx.find("customers", b.id);
      ensure(c, "Không có hồ sơ.", 404);
      ensure(
        !(await tx.list("bookings")).some(
          (x) => x.customerId === c.id && h.active(x),
        ),
        "Khách còn giao dịch dang dở.",
      );
      await tx.update("customers", c.id, { isActive: false });
      await h.audit(tx, user, "Lưu trữ hồ sơ", "CUSTOMER", c.id);
      return { ok: true };
    });
  },
});
