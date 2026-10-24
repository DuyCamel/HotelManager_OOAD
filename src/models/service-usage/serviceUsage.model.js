/**
 * TASK-BAN-GIAO (TODO) | Phụ trách: TV2 | Mã việc: B4, B6
 * Đây là việc còn lại/nghiệm thu, không phải mô tả tính năng đã hoàn tất.
 * Cung cấp bảng kê chi tiết cho UI trước thu tiền: phòng, từng dịch vụ, phụ thu, cọc và còn thu; giá chốt luôn ở server.
 * Nghiệm thu rollback, snapshot đơn giá, trả phòng hai lần, hóa đơn PAID và cộng điểm một lần trong cả SQL/demo.
 * Phụ thu trễ/giờ/đêm, hoàn cọc và giảm giá chỉ làm sau khi chốt chính sách; không tự thêm công thức.
 * Chi tiết, phụ thuộc và tiêu chí xong: docs/PHAN_CONG_3_NGUOI.md.
 */
/** Ghi dịch vụ tại phiếu thuê; bảng kê luôn tính phía server trước khi tạo hóa đơn một lần. */
const v = require("../../core/validation/fields");
const { ensure } = require("../../core/errors/AppError");
const { allow } = require("../../core/auth/rbac");
const h = require("../_shared/stayRules");

module.exports = (repo) => ({
  async addUsage(user, b) {
    allow(user, "usage");
    return repo.transaction(async (tx) => {
      const st = await tx.find("stays", b.stayId),
        service = await tx.find("services", b.serviceId);
      ensure(st && !st.checkOutAt, "Chỉ ghi dịch vụ khi khách đang lưu trú.");
      ensure(service?.isActive, "Dịch vụ ngừng cung cấp.");
      const row = {
        id: v.id("SD"),
        stayId: st.id,
        serviceId: service.id,
        quantity: v.number(b.quantity, "Số lượng", 1, 1000),
        unitPrice: service.price,
        usedAt: new Date().toISOString(),
        recordedBy: user.id,
        isVoided: false,
        invoiceId: null,
      };
      await tx.insert("usage", row);
      await h.audit(
        tx,
        user,
        "Ghi dịch vụ sử dụng",
        "STAY",
        st.id,
        service.name,
      );
      return row;
    });
  },
  async voidUsage(user, b) {
    allow(user, "usage");
    return repo.transaction(async (tx) => {
      const row = await tx.find("usage", b.id);
      ensure(
        row && !row.invoiceId && !row.isVoided,
        "Dịch vụ đã lên hóa đơn hoặc đã hủy.",
      );
      const st = await tx.find("stays", row.stayId);
      ensure(!st.checkOutAt, "Phiếu thuê đã kết thúc.");
      await tx.update("usage", row.id, { isVoided: true });
      await h.audit(tx, user, "Hủy ghi nhận dịch vụ", "STAY", st.id, row.id);
      return { ok: true };
    });
  },
});
