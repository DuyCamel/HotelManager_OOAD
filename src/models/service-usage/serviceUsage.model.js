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
    const batch = Object.hasOwn(b, "items");
    ensure(
      !batch ||
        (Array.isArray(b.items) && b.items.length >= 1 && b.items.length <= 50),
      "Chọn từ 1 đến 50 dịch vụ mỗi lần ghi nhận.",
    );
    const items = batch ? b.items : [b];
    return repo.transaction(async (tx) => {
      const st = await tx.find("stays", b.stayId);
      ensure(st && !st.checkOutAt, "Chỉ ghi dịch vụ khi khách đang lưu trú.");
      const assignment = (await tx.list("history")).find(
        (item) => item.stayId === st.id && !item.toAt,
      );
      ensure(assignment, "Không tìm thấy phòng đang lưu trú.");
      const room = await tx.find("rooms", assignment.roomId);
      const type = room && (await tx.find("types", room.typeId));
      ensure(type, "Không tìm thấy loại phòng đang lưu trú.");
      const seen = new Set();
      const createdRows = [];
      for (const item of items) {
        ensure(
          item && typeof item === "object" && !Array.isArray(item),
          "Dịch vụ không hợp lệ.",
        );
        const serviceId = v.text(item.serviceId, "Mã dịch vụ", 30);
        const service = await tx.find("services", serviceId);
        ensure(service?.isActive, "Dịch vụ ngừng cung cấp.");
        ensure(!seen.has(service.id), "Không chọn trùng dịch vụ.");
        seen.add(service.id);
        const serviceRule = (type.serviceConfig || []).find(
          (rule) => rule.serviceId === service.id,
        );
        ensure(
          serviceRule,
          "Dịch vụ này chưa được cấu hình cho loại phòng đang lưu trú.",
        );
        ensure(
          !batch || !serviceRule.included,
          "Dịch vụ đã gồm trong giá phòng, không ghi thêm phát sinh.",
        );
        const quantity = batch && item.quantity === undefined ? 1 : item.quantity;
        ensure(
          !batch || ["number", "string"].includes(typeof quantity),
          "Số lượng không hợp lệ.",
        );
        const row = {
          id: v.id("SD"),
          stayId: st.id,
          serviceId: service.id,
          quantity: v.number(quantity, "Số lượng", 1, 1000),
          unitPrice: serviceRule.included ? 0 : service.price,
          usedAt: new Date().toISOString(),
          recordedBy: user.id,
          isVoided: false,
          invoiceId: null,
        };
        const created = await tx.insert("usage", row);
        await h.audit(
          tx,
          user,
          "Ghi dịch vụ sử dụng",
          "STAY",
          st.id,
          `${service.name}${serviceRule.included ? " (đã gồm trong giá phòng)" : ""}`,
        );
        createdRows.push(created);
      }
      return batch
        ? {
            items: createdRows,
            total: createdRows.reduce((sum, row) => sum + row.quantity * row.unitPrice, 0),
          }
        : createdRows[0];
    });
  },
  async voidUsage(user, b) {
    allow(user, "usage");
    return repo.transaction(async (tx) => {
      const row = await tx.find("usage", b.id);
      ensure(
        row && !row.isVoided,
        "Dịch vụ không tồn tại hoặc đã hủy.",
      );
      const st = await tx.find("stays", row.stayId);
      ensure(!st.checkOutAt, "Phiếu thuê đã kết thúc.");
      await tx.update("usage", row.id, { isVoided: true });
      await h.audit(tx, user, "Hủy ghi nhận dịch vụ", "STAY", st.id, row.id);
      return { ok: true };
    });
  },
});
