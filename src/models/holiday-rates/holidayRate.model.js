/**
 * TASK-BAN-GIAO (TODO) | Phụ trách: TV3 | Mã việc: C2
 * Đây là việc còn lại/nghiệm thu, không phải mô tả tính năng đã hoàn tất.
 * Hoàn thiện ảnh phòng và liên kết dịch vụ/tiện ích/minibar theo loại phòng; RoomTypeService có ở SQL nhưng chưa có luồng ghi/đọc JS.
 * Phân biệt dịch vụ đi kèm với dịch vụ phát sinh tính tiền; không tạo tồn kho minibar theo từng phòng.
 * Giữ kiểm tra sức chứa/lịch đặt, khóa phòng, giá lễ chồng lấn; phạm vi thêm phòng cần đối chiếu báo cáo trước thay đổi.
 * Chi tiết, phụ thuộc và tiêu chí xong: docs/PHAN_CONG_3_NGUOI.md.
 */
/** Danh mục và giá chỉ Admin/Quản lý sửa; nhân viên chỉ đọc dịch vụ để ghi phát sinh. */
const v = require("../../core/validation/fields");
const { ensure } = require("../../core/errors/AppError");
const { allow } = require("../../core/auth/rbac");
const h = require("../_shared/stayRules");

module.exports = (repo) => ({
  async save(user, body) {
    const kind = "holidays";
    allow(user, "catalog");
    ensure(
      ["rooms", "types", "services", "holidays"].includes(kind),
      "Danh mục không hợp lệ.",
    );
    return repo.transaction(async (tx) => {
      const creating = !body.id;
      let row;
      const old = body.id ? await tx.find(kind, body.id) : null;
      ensure(creating || old, "Bản ghi không tồn tại.", 404);

      {
        const startDate = v.date(body.startDate, "Ngày bắt đầu").slice(0, 10),
          endDate = v.date(body.endDate, "Ngày kết thúc").slice(0, 10);
        ensure(startDate <= endDate, "Khoảng ngày không hợp lệ.");
        const typeId = v.text(body.typeId, "Loại phòng", 20);
        ensure(await tx.find("types", typeId), "Loại phòng không tồn tại.");
        ensure(
          !(await tx.list(kind)).some(
            (x) =>
              x.id !== old?.id &&
              x.isActive &&
              x.typeId === typeId &&
              startDate <= x.endDate.slice(0, 10) &&
              x.startDate.slice(0, 10) <= endDate,
          ),
          "Đợt giá lễ chồng lấn.",
        );
        row = {
          id: old?.id || v.id("GL"),
          name: v.text(body.name, "Tên đợt lễ", 120),
          typeId,
          startDate,
          endDate,
          percent: v.number(body.percent, "Mức tăng %", 0, 1000),
          isActive: old?.isActive ?? true,
        };
      }

      if (creating) await tx.insert(kind, row);
      else await tx.update(kind, row.id, row);
      await h.audit(
        tx,
        user,
        "Lưu " + kind,
        kind.toUpperCase(),
        row.id,
        row.name,
      );
      return row;
    });
  },
  async toggle(user, body) {
    const kind = "holidays";
    allow(user, "catalog");
    ensure(
      ["rooms", "services", "holidays"].includes(kind),
      "Không thể đổi trạng thái danh mục này.",
    );
    return repo.transaction(async (tx) => {
      const old = await tx.find(kind, body.id);
      ensure(old, "Không tìm thấy.", 404);
      {
        if (kind === "holidays" && !old.isActive)
          ensure(
            !(await tx.list(kind)).some(
              (x) =>
                x.id !== old.id &&
                x.isActive &&
                x.typeId === old.typeId &&
                old.startDate <= x.endDate &&
                x.startDate <= old.endDate,
            ),
            "Đợt giá lễ chồng lấn.",
          );
        await tx.update(kind, old.id, { isActive: !old.isActive });
      }
      await h.audit(
        tx,
        user,
        "Đổi trạng thái " + kind,
        kind.toUpperCase(),
        old.id,
      );
      return { ok: true };
    });
  },
});
