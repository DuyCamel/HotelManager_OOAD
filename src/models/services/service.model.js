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
    const kind = "services";
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

      row = {
        id: old?.id || v.id("DV"),
        name: v.text(body.name, "Tên dịch vụ", 100),
        description: String(body.description || "").slice(0, 512),
        unit: v.text(body.unit, "Đơn vị", 30),
        price: v.number(body.price, "Giá", 1),
        isActive: old?.isActive ?? true,
      };

      ensure(
        !(await tx.list(kind)).some(
          (x) =>
            x.id !== row.id && x.name.toLowerCase() === row.name.toLowerCase(),
        ),
        "Tên đã tồn tại.",
        409,
      );
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
    const kind = "services";
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
