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
    const kind = "types";
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
        row = {
          id: old?.id || v.id("LP"),
          name: v.text(body.name, "Tên loại", 100),
          capacity: v.number(body.capacity, "Sức chứa", 1, 20),
          beds: v.number(body.beds, "Số giường", 1, 20),
          hourlyPrice: v.number(body.hourlyPrice, "Giá giờ", 1),
          nightlyPrice: v.number(body.nightlyPrice, "Giá đêm", 1),
          dailyPrice: v.number(body.dailyPrice, "Giá ngày", 1),
          amenities: String(body.amenities || "").slice(0, 1000),
        };
        const rooms = (await tx.list("rooms")).filter(
          (r) => r.typeId === row.id,
        );
        ensure(
          !(await tx.list("bookings")).some(
            (b) =>
              h.active(b) &&
              rooms.some((r) => r.id === b.roomId) &&
              b.guests > row.capacity,
          ),
          "Sức chứa mới không đủ cho phiếu đang giữ phòng.",
        );
      }

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
});
