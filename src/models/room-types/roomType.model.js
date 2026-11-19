/**
 * TASK-BAN-GIAO (TODO) | Phụ trách: TV3 | Mã việc: C2
 * Đây là việc còn lại/nghiệm thu, không phải mô tả tính năng đã hoàn tất.
 * Hoàn thiện ảnh phòng và liên kết dịch vụ/tiện ích/minibar theo loại phòng; RoomTypeService có ở SQL nhưng chưa có luồng ghi/đọc JS.
 * Phân biệt dịch vụ đi kèm với dịch vụ phát sinh tính tiền; không tạo tồn kho minibar theo từng phòng.
 * Giữ kiểm tra sức chứa/lịch đặt, khóa phòng, giá lễ chồng lấn; phạm vi thêm phòng cần đối chiếu báo cáo trước thay đổi.
 * Chi tiết, phụ thuộc và tiêu chí xong: docs/PHAN_CONG_3_NGUOI.md.
 */
/** RoomType sở hữu giá đêm cơ bản và cấu hình dịch vụ áp dụng cho cả loại. */
const v = require("../../core/validation/fields");
const { ensure } = require("../../core/errors/AppError");
const { allow } = require("../../core/auth/rbac");
const h = require("../_shared/stayRules");
const { optionalText } = require("../rooms/catalogMetadata");

function parseServiceConfig(value, services) {
  let config = value;
  if (typeof config === "string") {
    try {
      config = JSON.parse(config || "[]");
    } catch {
      ensure(false, "Cấu hình dịch vụ không hợp lệ.");
    }
  }
  ensure(Array.isArray(config), "Cấu hình dịch vụ không hợp lệ.");
  const known = new Set(services.map((service) => String(service.id)));
  const seen = new Set();
  return config.map((entry) => {
    const serviceId = String(entry?.serviceId || "");
    ensure(known.has(serviceId), "Cấu hình chứa dịch vụ không tồn tại.");
    ensure(!seen.has(serviceId), "Dịch vụ bị lặp trong cấu hình loại phòng.");
    ensure(
      typeof entry.included === "boolean",
      "Trạng thái bao gồm của dịch vụ không hợp lệ.",
    );
    seen.add(serviceId);
    return { serviceId, included: entry.included };
  });
}

module.exports = (repo) => ({
  async save(user, body) {
    const kind = "types";
    allow(user, "catalog");
    return repo.transaction(async (tx) => {
      const creating = !body.id;
      const old = body.id ? await tx.find(kind, body.id) : null;
      ensure(creating || old, "Bản ghi không tồn tại.", 404);
      const nightlyPrice = v.number(body.nightlyPrice, "Giá đêm", 1);
      const row = {
        id: old?.id || v.id("LP"),
        name: v.text(body.name, "Tên loại", 100),
        capacity: v.number(body.capacity, "Sức chứa", 1, 20),
        beds: v.number(body.beds, "Số giường", 1, 20),
        hourlyPrice: Math.max(1, Math.round(nightlyPrice / 4)),
        nightlyPrice,
        // Legacy columns remain synchronized until the shared schema removes them.
        dailyPrice: nightlyPrice,
        amenities: optionalText(body.amenities, "Tiện nghi", 1000),
      };
      const rooms = (await tx.list("rooms")).filter((r) => r.typeId === row.id);
      ensure(
        !(await tx.list("bookings")).some(
          (b) =>
            h.active(b) &&
            rooms.some((r) => r.id === b.roomId) &&
            b.guests > row.capacity,
        ),
        "Sức chứa mới không đủ cho phiếu đang giữ phòng.",
      );

      const configTouched = String(body.serviceConfigTouched || "0") === "1";
      let serviceConfig = Array.isArray(old?.serviceConfig)
        ? old.serviceConfig
        : [];
      if (configTouched)
        serviceConfig = parseServiceConfig(
          body.serviceConfig,
          await tx.list("services"),
        );

      const canEmbedConfig = repo.mode !== "sqlserver";
      const canReplaceConfig =
        typeof tx.listRoomTypeServices === "function" &&
        typeof tx.replaceRoomTypeServices === "function";
      ensure(
        !configTouched || canEmbedConfig || canReplaceConfig,
        "Cấu hình dịch vụ chưa thể lưu trong SQL: cần adapter list/replaceRoomTypeServices cho khóa ghép RoomTypeService.",
        501,
      );
      if (canEmbedConfig) row.serviceConfig = serviceConfig;

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
      if (configTouched && canReplaceConfig)
        await tx.replaceRoomTypeServices(row.id, serviceConfig);
      await h.audit(
        tx,
        user,
        creating ? "Thêm loại phòng" : "Cập nhật loại phòng",
        "ROOM_TYPE",
        row.id,
        `${row.name}; giá đêm=${row.nightlyPrice}; ${configTouched ? `dịch vụ=${serviceConfig.length}` : "dịch vụ=giữ nguyên"}`,
      );
      return row;
    });
  },
});
