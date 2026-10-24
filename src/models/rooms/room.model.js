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
    const kind = "rooms";
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
        const typeId = v.text(body.typeId, "Loại phòng", 20);
        ensure(await tx.find("types", typeId), "Không có loại phòng.");
        if (old) {
          ensure(old.status !== "OCCUPIED", "Không sửa phòng đang có khách.");
          ensure(
            old.typeId === typeId ||
              !(await tx.list("bookings")).some(
                (b) => b.roomId === old.id && h.active(b),
              ),
            "Không đổi loại phòng còn phiếu chưa hoàn tất.",
          );
        }
        const code = creating ? v.text(body.code, "Mã phòng", 20) : old.id;
        ensure(
          /^[A-Za-z0-9_-]+$/.test(code),
          "Mã phòng chỉ gồm chữ, số, gạch ngang.",
        );
        ensure(
          !creating || !(await tx.find(kind, code)),
          "Mã phòng đã tồn tại.",
          409,
        );
        row = {
          id: code,
          name: v.text(body.name, "Tên phòng", 100),
          typeId,
          status: old?.status || "AVAILABLE",
          imagePath: old?.imagePath || null,
          note: String(body.note || "").slice(0, 1000),
        };
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
  async toggle(user, body) {
    const kind = "rooms";
    allow(user, "catalog");
    ensure(
      ["rooms", "services", "holidays"].includes(kind),
      "Không thể đổi trạng thái danh mục này.",
    );
    return repo.transaction(async (tx) => {
      const old = await tx.find(kind, body.id);
      ensure(old, "Không tìm thấy.", 404);
      {
        ensure(
          !(await tx.list("bookings")).some(
            (b) => b.roomId === old.id && h.active(b),
          ),
          "Phòng còn giao dịch chưa hoàn tất.",
        );
        ensure(
          ["AVAILABLE", "DISABLED"].includes(old.status),
          "Chỉ khóa/mở phòng trống hoặc ngừng hoạt động.",
        );
        await tx.update(kind, old.id, {
          status: old.status === "DISABLED" ? "AVAILABLE" : "DISABLED",
        });
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
