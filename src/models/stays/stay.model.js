/**
 * TASK-BAN-GIAO (TODO) | Phụ trách: TV2 | Mã việc: B1, B2, B3, B5, B6
 * Đây là việc còn lại/nghiệm thu, không phải mô tả tính năng đã hoàn tất.
 * P0/B1: sửa create() từ chối ngày hôm nay vì fixedStayTimes() trả 00:00 rồi so với Date.now(); giữ API chọn ngày.
 * B2: bổ sung gia hạn trong transaction, kiểm tra lịch/capacity và đề xuất đổi phòng khi trùng; khách từ chối thì giữ nguyên phiếu.
 * B3/B5: bổ sung dữ liệu chi tiết phiếu thuê/giữ chỗ để UI tra cứu và in; nghiệm thu tranh chấp phòng/hết hạn với TV3.
 * Chi tiết, phụ thuộc và tiêu chí xong: docs/PHAN_CONG_3_NGUOI.md.
 */
/** Tìm phòng, giữ chỗ, cọc, nhận và đổi phòng trong transaction; khách chỉ thao tác phiếu của mình. */
const v = require("../../core/validation/fields");
const { ensure } = require("../../core/errors/AppError");
const { allow } = require("../../core/auth/rbac");
const h = require("../_shared/stayRules");

module.exports = (repo) => ({
  async checkIn(user, b) {
    allow(user, "stays");
    return repo.transaction(async (tx) => {
      const booking = await tx.find("bookings", b.id);
      ensure(
        booking?.status === "CONFIRMED",
        "Chỉ nhận phòng với phiếu đã xác nhận cọc.",
      );
      const now = new Date().toISOString();
      ensure(
        Date.parse(now) >= Date.parse(booking.startAt) &&
          Date.parse(now) < Date.parse(booking.endAt),
        "Chưa đến giờ nhận hoặc đã hết khoảng lưu trú.",
      );
      ensure(
        !h.isHousekeepingWindow(new Date(now)),
        "Không thể nhận phòng trong khung giờ buồng phòng 12:00–14:00.",
      );
      const room = await tx.find("rooms", booking.roomId);
      ensure(room?.status === "AVAILABLE", "Phòng chưa sạch/sẵn sàng.");
      await tx.update("bookings", booking.id, { status: "CHECKED_IN" });
      const row = {
        id: v.id("PT"),
        bookingId: booking.id,
        roomId: room.id,
        identityNo: v.text(b.identityNo, "Giấy tờ khách lưu trú", 30),
        checkInAt: now,
        checkOutAt: null,
        roomCharge: booking.roomCharge,
        surcharge: 0,
        createdBy: user.id,
      };
      await tx.insert("stays", row);
      await tx.insert("history", {
        stayId: row.id,
        roomId: room.id,
        fromAt: now,
        toAt: null,
        extraCharge: 0,
      });
      await tx.update("rooms", room.id, { status: "OCCUPIED" });
      await h.audit(tx, user, "Nhận phòng", "STAY", row.id);
      return row;
    });
  },
  async changeRoom(user, b) {
    allow(user, "stays");
    return repo.transaction(async (tx) => {
      const st = await tx.find("stays", b.id);
      ensure(st && !st.checkOutAt, "Phiếu thuê đã kết thúc.");
      const booking = await tx.find("bookings", st.bookingId),
        next = await tx.find("rooms", b.roomId),
        now = new Date().toISOString();
      ensure(
        next && next.id !== st.roomId && next.status === "AVAILABLE",
        "Phòng mới phải khác phòng hiện tại và sẵn sàng.",
      );
      ensure(
        await h.available(tx, next.id, now, booking.endAt, booking.id),
        "Phòng mới có lịch trùng.",
        409,
      );
      const type = await tx.find("types", next.typeId);
      ensure(booking.guests <= type.capacity, "Phòng mới không đủ sức chứa.");
      const extra = Math.max(
        0,
        (await h.quote(tx, next.id, now, booking.endAt)) -
          (await h.quote(tx, st.roomId, now, booking.endAt)),
      );
      await tx.update("bookings", booking.id, { roomId: next.id });
      await tx.update("stays", st.id, {
        roomId: next.id,
        surcharge: st.surcharge + extra,
      });
      for (const hist of await tx.list("history"))
        if (hist.stayId === st.id && !hist.toAt)
          await tx.update("history", hist.id, { toAt: now });
      await tx.insert("history", {
        stayId: st.id,
        roomId: next.id,
        fromAt: now,
        toAt: null,
        extraCharge: extra,
      });
      await tx.update("rooms", st.roomId, { status: "DIRTY" });
      await tx.update("rooms", next.id, { status: "OCCUPIED" });
      await h.createTask(tx, st.roomId, st.id, now);
      await h.audit(
        tx,
        user,
        "Đổi phòng",
        "STAY",
        st.id,
        st.roomId + " → " + next.id,
      );
      return { extra };
    });
  },
});
