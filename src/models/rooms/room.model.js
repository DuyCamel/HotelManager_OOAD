/**
 * TASK-BAN-GIAO (TODO) | Phụ trách: TV3 | Mã việc: C2
 * Đây là việc còn lại/nghiệm thu, không phải mô tả tính năng đã hoàn tất.
 * Hoàn thiện ảnh phòng và liên kết dịch vụ/tiện ích/minibar theo loại phòng; RoomTypeService có ở SQL nhưng chưa có luồng ghi/đọc JS.
 * Phân biệt dịch vụ đi kèm với dịch vụ phát sinh tính tiền; không tạo tồn kho minibar theo từng phòng.
 * Giữ kiểm tra sức chứa/lịch đặt, khóa phòng, giá lễ chồng lấn; phạm vi thêm phòng cần đối chiếu báo cáo trước thay đổi.
 * Chi tiết, phụ thuộc và tiêu chí xong: docs/PHAN_CONG_3_NGUOI.md.
 */
/** Danh mục phòng tách khỏi sơ đồ vận hành; chỉ Admin/Quản lý được ghi. */
const v = require("../../core/validation/fields");
const { ensure } = require("../../core/errors/AppError");
const { allow } = require("../../core/auth/rbac");
const h = require("../_shared/stayRules");
const metadata = require("./catalogMetadata");

const MANAGED_STATUSES = new Set(["AVAILABLE", "MAINTENANCE", "DISABLED"]);
const OPERATIONAL_STATUSES = new Set(["OCCUPIED", "DIRTY"]);

module.exports = (repo) => ({
  async save(user, body) {
    const kind = "rooms";
    allow(user, "catalog");
    return repo.transaction(async (tx) => {
      const creating = !body.id;
      const old = body.id ? await tx.find(kind, body.id) : null;
      ensure(creating || old, "Bản ghi không tồn tại.", 404);
      const typeId = v.text(body.typeId, "Loại phòng", 20);
      ensure(await tx.find("types", typeId), "Không có loại phòng.");
      let code;
      if (creating) {
        let candidate = String(body.code || "").trim();
        if (!candidate) {
          const numMatch = String(body.name || "").match(/\d+/);
          if (numMatch) {
            candidate = `P${numMatch[0]}`;
          } else {
            const allRooms = await tx.list(kind);
            const nums = allRooms
              .map((r) => {
                const m = String(r.id || "").match(/^P?(\d+)$/i);
                return m ? parseInt(m[1], 10) : 0;
              })
              .filter((n) => n > 0);
            const max = nums.length ? Math.max(...nums) : 100;
            candidate = `P${max + 1}`;
          }
          let finalCode = candidate;
          let counter = 1;
          while (await tx.find(kind, finalCode)) {
            finalCode = `${candidate}-${counter++}`;
          }
          candidate = finalCode;
        }
        code = v.text(candidate, "Mã phòng", 20);
        ensure(
          /^[A-Za-z0-9_-]+$/.test(code),
          "Mã phòng chỉ gồm chữ, số, gạch ngang.",
        );
        ensure(
          !(await tx.find(kind, code)),
          "Mã phòng đã tồn tại.",
          409,
        );
      } else {
        code = old.id;
      }

      const hasActiveBooking = (await tx.list("bookings")).some(
        (booking) => booking.roomId === code && h.active(booking),
      );
      ensure(
        !old || old.typeId === typeId || !hasActiveBooking,
        "Không đổi loại phòng còn phiếu chưa hoàn tất.",
      );

      const requestedStatus = String(body.status || old?.status || "AVAILABLE");
      const hasOpenMaintenance =
        old &&
        (await tx.list("tasks")).some(
          (task) => task.roomId === old.id && task.status === "MAINTENANCE",
        );
      ensure(
        !old ||
          (!hasOpenMaintenance && old.status !== "MAINTENANCE") ||
          requestedStatus === "MAINTENANCE",
        "Phòng bảo trì chỉ được mở lại sau khi xác nhận sửa chữa trên sơ đồ phòng.",
      );
      if (old && OPERATIONAL_STATUSES.has(old.status))
        ensure(
          requestedStatus === old.status,
          "Trạng thái đang ở/cần dọn chỉ thay đổi tại sơ đồ vận hành.",
        );
      else
        ensure(
          MANAGED_STATUSES.has(requestedStatus),
          "Trạng thái quản lý phòng không hợp lệ.",
        );
      ensure(
        !hasActiveBooking || !["MAINTENANCE", "DISABLED"].includes(requestedStatus),
        "Phòng còn giao dịch chưa hoàn tất nên không thể khóa hoặc bảo trì.",
      );

      const previousDetails = metadata.parseDetails(old || {});
      const details = metadata.buildDetails({
        note: Object.hasOwn(body, "note") ? body.note : previousDetails.note,
        viewName: Object.hasOwn(body, "viewName")
          ? body.viewName
          : previousDetails.viewName,
        amenities: Object.hasOwn(body, "amenities")
          ? body.amenities
          : previousDetails.amenities,
        galleryUrls: Object.hasOwn(body, "galleryUrls")
          ? body.galleryUrls
          : previousDetails.galleryUrls,
      });
      let imagePath = metadata.imageUrl(
        Object.hasOwn(body, "imageUrl") ? body.imageUrl : old?.imagePath,
        "Ảnh đại diện",
      );
      if (!imagePath && details.galleryUrls.length) imagePath = details.galleryUrls[0];
      const row = {
        id: code,
        name: v.text(body.name, "Tên phòng", 100),
        typeId,
        status: requestedStatus,
        imagePath: imagePath || null,
        imageGalleryJson: details.imageGalleryJson,
        viewName: details.viewName || null,
        amenities: details.amenities,
        note: details.note,
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
        creating ? "Thêm phòng" : "Cập nhật phòng",
        "ROOM",
        row.id,
        `${row.name}; loại=${row.typeId}; trạng thái=${row.status}`,
      );
      return row;
    });
  },
  async toggle(user, body) {
    const kind = "rooms";
    allow(user, "catalog");
    return repo.transaction(async (tx) => {
      const old = await tx.find(kind, body.id);
      ensure(old, "Không tìm thấy.", 404);
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
      const status = old.status === "DISABLED" ? "AVAILABLE" : "DISABLED";
      await tx.update(kind, old.id, { status });
      await h.audit(
        tx,
        user,
        "Đổi trạng thái phòng",
        "ROOM",
        old.id,
        `${old.status} -> ${status}`,
      );
      return { ok: true };
    });
  },
  async bulkEdit(user, body) {
    const kind = "rooms";
    allow(user, "catalog");
    return repo.transaction(async (tx) => {
      const roomIds = Array.isArray(body.roomIds)
        ? body.roomIds.map(String).filter(Boolean)
        : typeof body.roomIds === "string"
          ? body.roomIds.split(",").map((s) => s.trim()).filter(Boolean)
          : [];
      ensure(roomIds.length > 0, "Vui lòng chọn ít nhất một phòng để cập nhật.");

      const applyType = Boolean(body.applyType);
      const applyStatus = Boolean(body.applyStatus);
      const applyView = Boolean(body.applyView);
      ensure(
        applyType || applyStatus || applyView,
        "Vui lòng chọn ít nhất một thông tin cần sửa (Loại phòng, Trạng thái hoặc Hướng nhìn).",
      );

      let targetType = null;
      if (applyType) {
        const typeId = v.text(body.typeId, "Loại phòng", 20);
        targetType = await tx.find("types", typeId);
        ensure(targetType, "Loại phòng được chọn không tồn tại.");
      }

      let targetStatus = null;
      if (applyStatus) {
        targetStatus = String(body.status || "");
        ensure(
          MANAGED_STATUSES.has(targetStatus),
          "Trạng thái quản lý phòng không hợp lệ.",
        );
      }

      let targetView = null;
      if (applyView) {
        targetView = String(body.viewName || "").trim();
      }

      const allBookings = await tx.list("bookings");
      const allTasks = await tx.list("tasks");
      const updatedRooms = [];

      for (const id of roomIds) {
        const old = await tx.find(kind, id);
        ensure(old, `Không tìm thấy phòng có mã ${id}.`, 404);

        const hasActiveBooking = allBookings.some(
          (b) => b.roomId === old.id && h.active(b),
        );

        if (applyType && old.typeId !== targetType.id) {
          ensure(
            !hasActiveBooking,
            `Phòng ${old.name} (${old.id}) đang có phiếu lưu trú chưa hoàn tất nên không thể đổi loại phòng.`,
          );
        }

        let nextStatus = old.status;
        if (applyStatus) {
          if (OPERATIONAL_STATUSES.has(old.status)) {
            nextStatus = old.status;
          } else {
            const hasOpenMaintenance = allTasks.some(
              (t) => t.roomId === old.id && t.status === "MAINTENANCE",
            );
            ensure(
              !hasOpenMaintenance || old.status === "MAINTENANCE" || targetStatus === "MAINTENANCE",
              `Phòng ${old.name} (${old.id}) đang có sự cố bảo trì chưa đóng.`,
            );
            ensure(
              !hasActiveBooking || !["MAINTENANCE", "DISABLED"].includes(targetStatus),
              `Phòng ${old.name} (${old.id}) có giao dịch chưa hoàn tất nên không thể khóa hoặc bảo trì.`,
            );
            nextStatus = targetStatus;
          }
        }

        const patch = {};
        if (applyType) patch.typeId = targetType.id;
        if (applyStatus) patch.status = nextStatus;
        if (applyView) {
          patch.viewName = targetView || null;
          const prevDetails = metadata.parseDetails(old || {});
          const nextDetails = metadata.buildDetails({
            ...prevDetails,
            viewName: targetView || "",
          });
          patch.imageGalleryJson = nextDetails.imageGalleryJson;
        }

        await tx.update(kind, old.id, patch);
        updatedRooms.push({ id: old.id, ...patch });

        await h.audit(
          tx,
          user,
          "Sửa nhanh phòng",
          "ROOM",
          old.id,
          `Sửa nhanh: ${Object.keys(patch).map((k) => `${k}=${patch[k]}`).join(", ")}`,
        );
      }

      return {
        ok: true,
        count: updatedRooms.length,
        message: `Đã cập nhật thành công ${updatedRooms.length} phòng.`,
      };
    });
  },
});
