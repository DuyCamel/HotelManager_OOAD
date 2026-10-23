/** Danh mục và giá chỉ Admin/Quản lý sửa; nhân viên chỉ đọc dịch vụ để ghi phát sinh. */
const v = require("../shared/validation");
const { ensure } = require("../shared/errors");
const { allow } = require("../shared/permissions");
const h = require("./helpers");
module.exports = (repo) => ({
  async save(user, kind, body) {
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
      if (kind === "rooms") {
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
      if (kind === "types") {
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
      if (kind === "services")
        row = {
          id: old?.id || v.id("DV"),
          name: v.text(body.name, "Tên dịch vụ", 100),
          description: String(body.description || "").slice(0, 512),
          unit: v.text(body.unit, "Đơn vị", 30),
          price: v.number(body.price, "Giá", 1),
          isActive: old?.isActive ?? true,
        };
      if (kind === "holidays") {
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
      if (kind !== "holidays")
        ensure(
          !(await tx.list(kind)).some(
            (x) =>
              x.id !== row.id &&
              x.name.toLowerCase() === row.name.toLowerCase(),
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
  async toggle(user, kind, body) {
    allow(user, "catalog");
    ensure(
      ["rooms", "services", "holidays"].includes(kind),
      "Không thể đổi trạng thái danh mục này.",
    );
    return repo.transaction(async (tx) => {
      const old = await tx.find(kind, body.id);
      ensure(old, "Không tìm thấy.", 404);
      if (kind === "rooms") {
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
      } else {
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
