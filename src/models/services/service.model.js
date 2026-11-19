/**
 * TASK-BAN-GIAO (TODO) | Phụ trách: TV3 | Mã việc: C2
 * Đây là việc còn lại/nghiệm thu, không phải mô tả tính năng đã hoàn tất.
 * Hoàn thiện ảnh phòng và liên kết dịch vụ/tiện ích/minibar theo loại phòng; RoomTypeService có ở SQL nhưng chưa có luồng ghi/đọc JS.
 * Phân biệt dịch vụ đi kèm với dịch vụ phát sinh tính tiền; không tạo tồn kho minibar theo từng phòng.
 * Giữ kiểm tra sức chứa/lịch đặt, khóa phòng, giá lễ chồng lấn; phạm vi thêm phòng cần đối chiếu báo cáo trước thay đổi.
 * Chi tiết, phụ thuộc và tiêu chí xong: docs/PHAN_CONG_3_NGUOI.md.
 */
/** Dịch vụ được nhân viên nghiệp vụ đọc; chỉ Admin/Quản lý được ghi. */
const v = require("../../core/validation/fields");
const { ensure } = require("../../core/errors/AppError");
const { allow } = require("../../core/auth/rbac");
const h = require("../_shared/stayRules");
const { optionalText } = require("../rooms/catalogMetadata");

module.exports = (repo) => ({
  async save(user, body) {
    const kind = "services";
    allow(user, "catalog");
    return repo.transaction(async (tx) => {
      const creating = !body.id;
      const old = body.id ? await tx.find(kind, body.id) : null;
      ensure(creating || old, "Bản ghi không tồn tại.", 404);

      const row = {
        id: old?.id || v.id("DV"),
        name: v.text(body.name, "Tên dịch vụ", 100),
        description: optionalText(body.description, "Mô tả", 512),
        unit: v.text(body.unit, "Đơn vị", 30),
        price: v.number(body.price, "Giá", 0),
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
        creating ? "Thêm dịch vụ" : "Cập nhật dịch vụ",
        "SERVICE",
        row.id,
        `${row.name}; giá=${row.price}; đơn vị=${row.unit}`,
      );
      return row;
    });
  },
  async toggle(user, body) {
    const kind = "services";
    allow(user, "catalog");
    return repo.transaction(async (tx) => {
      const old = await tx.find(kind, body.id);
      ensure(old, "Không tìm thấy.", 404);
      await tx.update(kind, old.id, { isActive: !old.isActive });
      await h.audit(
        tx,
        user,
        "Đổi trạng thái dịch vụ",
        "SERVICE",
        old.id,
        old.isActive ? "Ngừng cung cấp" : "Mở cung cấp",
      );
      return { ok: true };
    });
  },
});
