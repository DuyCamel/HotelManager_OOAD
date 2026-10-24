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
  async issueCard(user, b) {
    allow(user, "cards");
    return repo.transaction(async (tx) => {
      const c = await tx.find("customers", b.customerId);
      ensure(c?.isActive, "Hồ sơ không hợp lệ.");
      ensure(
        !(await tx.list("cards")).some((x) => x.customerId === c.id),
        "Khách đã có thẻ, vui lòng tra cứu.",
        409,
      );
      const row = {
        id: v.id("TV"),
        customerId: c.id,
        points: 0,
        isActive: true,
        issuedAt: new Date().toISOString(),
      };
      await tx.insert("cards", row);
      await h.audit(tx, user, "Cấp thẻ", "MEMBERSHIP", row.id);
      return row;
    });
  },
  async disableCard(user, b) {
    allow(user, "cards");
    return repo.transaction(async (tx) => {
      const card = await tx.find("cards", b.id);
      ensure(card?.isActive, "Thẻ không hoạt động.");
      await tx.update("cards", card.id, { isActive: false });
      await h.audit(tx, user, "Vô hiệu hóa thẻ", "MEMBERSHIP", card.id);
      return { ok: true };
    });
  },
});
