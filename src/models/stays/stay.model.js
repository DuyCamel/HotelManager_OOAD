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
const customerFields = require("../customers/customer.validation");
const config = require("../../config/env");
const shortTime = (value) => String(value || "").slice(0, 5);

async function planMove(tx, b) {
  const st = await tx.find("stays", b.id);
  ensure(st && !st.checkOutAt, "Phiếu thuê đã kết thúc.");
  const booking = await tx.find("bookings", st.bookingId);
  const next = await tx.find("rooms", b.roomId);
  const now = new Date().toISOString();
  ensure(
    booking?.status === "CHECKED_IN",
    "Phiếu đặt không còn đang lưu trú.",
  );
  const openHistory = (await tx.list("history")).find(
    (item) => item.stayId === st.id && !item.toAt,
  );
  ensure(openHistory, "Không tìm thấy phòng đang lưu trú.");
  const currentRoomId = openHistory.roomId;
  ensure(
    next && next.id !== currentRoomId && next.status === "AVAILABLE",
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
      (await h.quote(tx, currentRoomId, now, booking.endAt)),
  );
  return { st, booking, next, now, openHistory, currentRoomId, extra };
}

async function planExtension(tx, b) {
  const endDate = v.calendarDate(b.endDate, "Ngày trả mới");
  const requestedRoomId = b.roomId ? v.text(b.roomId, "Phòng thay thế", 20) : null;
  const stay = await tx.find("stays", b.id);
  ensure(stay && !stay.checkOutAt, "Phiếu thuê đã kết thúc.");
  const booking = await tx.find("bookings", stay.bookingId);
  ensure(booking?.status === "CHECKED_IN", "Phiếu đặt không còn đang lưu trú.");
  const policy = (await tx.list("settings"))[0];
  ensure(policy, "Chưa cấu hình giờ nhận/trả phòng.");
  const { endAt } = h.fixedStayTimes(h.localDatePart(booking.startAt), endDate, policy);
  ensure(Date.parse(endAt) > Date.parse(booking.endAt), "Ngày trả mới phải sau ngày trả hiện tại.");
  const assignment = (await tx.list("history")).find(
    (item) => item.stayId === stay.id && !item.toAt,
  );
  ensure(assignment, "Không tìm thấy phòng đang lưu trú.");
  const currentAvailable = await h.available(tx, assignment.roomId, booking.endAt, endAt, booking.id);
  let targetRoomId = assignment.roomId;
  let moveExtra = 0;
  const wantsMove = requestedRoomId && requestedRoomId !== assignment.roomId;
  if (!currentAvailable || wantsMove) {
    if (!wantsMove) {
      const alternatives = [];
      for (const room of await tx.list("rooms")) {
        if (room.id === assignment.roomId || room.status !== "AVAILABLE") continue;
        const type = await tx.find("types", room.typeId);
        if (
          type &&
          booking.guests <= type.capacity &&
          (await h.available(tx, room.id, new Date().toISOString(), endAt, booking.id))
        )
          alternatives.push(room.name || room.id);
      }
      ensure(
        false,
        alternatives.length
          ? `Phòng hiện tại có lịch trùng khi gia hạn. Có thể đổi ngay sang: ${alternatives.join(", ")}.`
          : "Phòng hiện tại có lịch trùng khi gia hạn và chưa có phòng thay thế phù hợp.",
        409,
      );
    }
    const next = await tx.find("rooms", requestedRoomId);
    ensure(next?.status === "AVAILABLE", "Phòng thay thế phải đang sẵn sàng.");
    const nextType = await tx.find("types", next.typeId);
    ensure(nextType, "Không tìm thấy loại phòng thay thế.");
    ensure(booking.guests <= nextType.capacity, "Phòng thay thế không đủ sức chứa.");
    const now = new Date().toISOString();
    ensure(
      await h.available(tx, next.id, now, endAt, booking.id),
      "Phòng thay thế có lịch trùng.",
      409,
    );
    if (Date.parse(booking.endAt) > Date.parse(now))
      moveExtra = Math.max(
        0,
        (await h.quote(tx, next.id, now, booking.endAt)) -
          (await h.quote(tx, assignment.roomId, now, booking.endAt)),
      );
    targetRoomId = next.id;
  }
  const extensionCharge = await h.quote(tx, targetRoomId, booking.endAt, endAt);
  return {
    stay,
    booking,
    assignment,
    endAt,
    targetRoomId,
    extensionCharge,
    moveExtra,
  };
}

module.exports = (repo) => ({
  async checkIn(user, b) {
    allow(user, "stays");
    return repo.transaction(async (tx) => {
      await h.expire(tx);
      const booking = await tx.find("bookings", b.id);
      const policy = (await tx.list("settings"))[0];
      ensure(
        booking?.status === "CONFIRMED",
        "Chỉ nhận phòng với phiếu đã xác nhận cọc (hoặc phiếu đã tự hủy do quá giờ nhận phòng).",
      );
      const now = new Date().toISOString();
      ensure(
        h.localDatePart(new Date(now)) >= h.localDatePart(booking.startAt) &&
          Date.parse(now) < Date.parse(booking.endAt),
        "Chưa đến ngày nhận hoặc đã hết khoảng lưu trú.",
      );
      const targetRoomId = b.roomId
        ? v.text(b.roomId, "Phòng nhận", 20)
        : booking.roomId;
      const room = await tx.find("rooms", targetRoomId);
      ensure(room?.status === "AVAILABLE", "Phòng chưa sạch/sẵn sàng.");
      let extra = 0;
      if (String(room.id) !== String(booking.roomId)) {
        const type = await tx.find("types", room.typeId);
        ensure(type && booking.guests <= type.capacity, "Phòng mới không đủ sức chứa.");
        const checkFrom =
          Date.parse(now) < Date.parse(booking.startAt) ? now : booking.startAt;
        ensure(
          await h.available(tx, room.id, checkFrom, booking.endAt, booking.id),
          "Phòng mới có lịch trùng.",
          409,
        );
        extra = Math.max(
          0,
          (await h.quote(tx, room.id, booking.startAt, booking.endAt)) -
            (await h.quote(tx, booking.roomId, booking.startAt, booking.endAt)),
        );
      } else {
        ensure(
          Date.parse(now) >= Date.parse(booking.startAt) ||
            !h.isHousekeepingWindow(new Date(now)),
          `Không thể nhận phòng trong khung giờ buồng phòng ${shortTime(config.checkOutTime)}–${shortTime(config.checkInTime)}.`,
        );
      }
      const identityNo = v.text(b.identityNo, "Giấy tờ khách lưu trú", 30);
      if (booking.customerId) {
        const customer = await tx.find("customers", booking.customerId);
        if (customer) {
          const taken = (await tx.list("customers")).some(
            (c) =>
              String(c.id) !== String(customer.id) &&
              customerFields.identityKey(c.identityNo) === customerFields.identityKey(identityNo),
          );
          ensure(!taken, "Giấy tờ đã thuộc hồ sơ khác.", 409);
          if (customer.identityNo !== identityNo)
            await tx.update("customers", customer.id, { identityNo });
        }
      }
      await tx.update("bookings", booking.id, {
        status: "CHECKED_IN",
        roomId: room.id,
      });
      const row = {
        id: v.id("PT"),
        bookingId: booking.id,
        identityNo,
        checkInAt: now,
        checkOutAt: null,
        roomCharge: booking.roomCharge,
        surcharge: extra,
        createdBy: user.id,
      };
      const created = await tx.insert("stays", row);
      await tx.insert("history", {
        stayId: row.id,
        roomId: room.id,
        fromAt: now,
        toAt: null,
        extraCharge: extra,
      });
      await tx.update("rooms", room.id, { status: "OCCUPIED" });
      await h.audit(tx, user, "Nhận phòng", "STAY", row.id, room.id);
      return { ...created, roomId: room.id, currentRoomId: room.id };
    });
  },
  async walkIn(user, b) {
    allow(user, "stays");
    const endDate = v.calendarDate(b.endAt, "Ngày trả");
    const guests = v.number(b.guests || 1, "Số khách", 1, 20);
    const identityNo = v.text(b.identityNo, "CCCD / Hộ chiếu", 30);
    return repo.transaction(async (tx) => {
      // Free reservations whose local check-in cutoff passed before checking
      // availability, so the arriving walk-in can claim the released room.
      await h.expire(tx);
      const nowDate = new Date();
      const today = h.localDatePart(nowDate);
      ensure(endDate > today, "Ngày trả phải sau ngày hôm nay.");
      const policy = (await tx.list("settings"))[0];
      ensure(policy, "Chưa cấu hình giờ nhận/trả phòng.");
      const { startAt, endAt } = h.fixedStayTimes(today, endDate, policy);
      const room = await tx.find("rooms", b.roomId);
      ensure(room?.status === "AVAILABLE", "Phòng chưa sạch hoặc không sẵn sàng.");
      const type = await tx.find("types", room.typeId);
      ensure(type && guests <= type.capacity, "Phòng không đủ sức chứa.");
      ensure(
        await h.available(tx, room.id, startAt, endAt),
        "Phòng có lịch đặt trùng trong khoảng ngày này.",
        409,
      );
      let customer = b.customerId ? await tx.find("customers", b.customerId) : null;
      if (!customer) {
        const name = v.text(b.customerName, "Họ tên khách", 120);
        const phone = v.phone(b.customerPhone);
        const allCustomers = await tx.list("customers");
        customer = allCustomers.find(
          (c) =>
            c.isActive &&
            (String(c.identityNo || "").toLowerCase() === identityNo.toLowerCase() ||
              String(c.phone || "") === phone),
        );
        if (!customer) {
          customer = await tx.insert("customers", {
            id: v.id("KH"),
            accountId: null,
            name,
            phone,
            identityNo,
            address: "",
            isActive: true,
            createdAt: nowDate.toISOString(),
          });
        }
      }
      const identityKey = customerFields.identityKey(identityNo);
      const duplicate = (await tx.list("customers")).some(
        (item) =>
          String(item.id) !== String(customer.id) &&
          customerFields.identityKey(item.identityNo) === identityKey,
      );
      ensure(!duplicate, "Giấy tờ đã thuộc hồ sơ khác.", 409);
      if (customer.identityNo !== identityNo)
        await tx.update("customers", customer.id, { identityNo });
      const roomCharge = await h.quote(tx, room.id, startAt, endAt);
      const deposit = b.deposit ? v.number(b.deposit, "Tiền cọc", 0, roomCharge) : 0;
      const now = nowDate.toISOString();
      const booking = await tx.insert("bookings", {
        id: v.id("DP"),
        customerId: customer.id,
        roomId: room.id,
        startAt,
        endAt,
        guests,
        status: "CHECKED_IN",
        channel: "COUNTER",
        roomCharge,
        deposit,
        holdUntil: null,
        createdAt: now,
        createdBy: user.id,
      });
      if (deposit > 0) {
        await tx.insert("payments", {
          id: v.id("GD"),
          bookingId: booking.id,
          invoiceId: null,
          kind: "DEPOSIT",
          amount: deposit,
          method: "CASH",
          externalReference: null,
          paidAt: now,
          createdBy: user.id,
        });
      }
      const stay = await tx.insert("stays", {
        id: v.id("PT"),
        bookingId: booking.id,
        identityNo,
        checkInAt: now,
        checkOutAt: null,
        roomCharge,
        surcharge: 0,
        createdBy: user.id,
      });
      await tx.insert("history", {
        stayId: stay.id,
        roomId: room.id,
        fromAt: now,
        toAt: null,
        extraCharge: 0,
      });
      await tx.update("rooms", room.id, { status: "OCCUPIED" });
      await h.audit(tx, user, "Nhận phòng trực tiếp (Walk-in)", "STAY", stay.id, room.id);
      return { ...stay, roomId: room.id, currentRoomId: room.id };
    });
  },
  async addSurcharge(user, b) {
    allow(user, "stays");
    const amount = v.number(b.amount, "Số tiền phụ thu", 0, 100000000);
    const note = b.note ? v.text(b.note, "Lý do phụ thu", 200) : "Cập nhật phụ thu";
    return repo.transaction(async (tx) => {
      const stay = await tx.find("stays", b.id);
      ensure(stay && !stay.checkOutAt, "Phiếu thuê không còn lưu trú.");
      await tx.update("stays", stay.id, { surcharge: amount });
      await h.audit(tx, user, "Cập nhật phụ thu lưu trú", "STAY", stay.id, `${amount}: ${note}`);
      return { id: stay.id, surcharge: amount };
    });
  },
  async previewMove(user, b) {
    allow(user, "stays");
    const plan = await planMove(repo, b);
    return {
      extra: plan.extra,
      currentRoomId: plan.currentRoomId,
      nextRoomId: plan.next.id,
    };
  },
  async previewExtend(user, b) {
    allow(user, "stays");
    const plan = await planExtension(repo, b);
    return {
      endAt: plan.endAt,
      targetRoomId: plan.targetRoomId,
      extensionCharge: plan.extensionCharge,
      moveExtra: plan.moveExtra,
      totalExtra: plan.extensionCharge + plan.moveExtra,
    };
  },
  async changeRoom(user, b) {
    allow(user, "stays");
    return repo.transaction(async (tx) => {
      const { st, booking, next, now, openHistory, currentRoomId, extra } =
        await planMove(tx, b);
      ensure(
        v.number(b.expectedExtra, "Phụ thu dự kiến") === extra,
        "Phụ thu đổi phòng đã thay đổi. Hãy xem lại trước khi xác nhận.",
        409,
      );
      await tx.update("stays", st.id, {
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
      await tx.update("bookings", booking.id, { roomId: next.id });
      await tx.update("rooms", currentRoomId, { status: "DIRTY" });
      await tx.update("rooms", next.id, { status: "OCCUPIED" });
      await h.createTask(tx, currentRoomId, st.id, now);
      await h.audit(
        tx,
        user,
        "Đổi phòng",
        "STAY",
        st.id,
        currentRoomId + " → " + next.id,
      );
      return { extra, currentRoomId: next.id };
    });
  },
  async extend(user, b) {
    allow(user, "stays");
    const endDate = v.calendarDate(b.endDate, "Ngày trả mới");
    const requestedRoomId = b.roomId
      ? v.text(b.roomId, "Phòng thay thế", 20)
      : null;
    return repo.transaction(async (tx) => {
      const stay = await tx.find("stays", b.id);
      ensure(stay && !stay.checkOutAt, "Phiếu thuê đã kết thúc.");
      const booking = await tx.find("bookings", stay.bookingId);
      ensure(
        booking?.status === "CHECKED_IN",
        "Phiếu đặt không còn đang lưu trú.",
      );
      const policy = (await tx.list("settings"))[0];
      ensure(policy, "Chưa cấu hình giờ nhận/trả phòng.");
      const { endAt } = h.fixedStayTimes(
        h.localDatePart(booking.startAt),
        endDate,
        policy,
      );
      ensure(
        Date.parse(endAt) > Date.parse(booking.endAt),
        "Ngày trả mới phải sau ngày trả hiện tại.",
      );
      const assignment = (await tx.list("history")).find(
        (item) => item.stayId === stay.id && !item.toAt,
      );
      ensure(assignment, "Không tìm thấy phòng đang lưu trú.");
      const currentAvailable = await h.available(
        tx,
        assignment.roomId,
        booking.endAt,
        endAt,
        booking.id,
      );
      let targetRoomId = assignment.roomId;
      let moveExtra = 0;
      const wantsMove =
        requestedRoomId && requestedRoomId !== assignment.roomId;
      if (!currentAvailable || wantsMove) {
        if (!wantsMove) {
          const alternatives = [];
          for (const room of await tx.list("rooms")) {
            if (
              room.id === assignment.roomId ||
              room.status !== "AVAILABLE"
            )
              continue;
            const type = await tx.find("types", room.typeId);
            if (
              type &&
              booking.guests <= type.capacity &&
              (await h.available(tx, room.id, new Date().toISOString(), endAt))
            )
              alternatives.push(room.name || room.id);
          }
          ensure(
            false,
            alternatives.length
              ? `Phòng hiện tại có lịch trùng khi gia hạn. Có thể đổi ngay sang: ${alternatives.join(", ")}.`
              : "Phòng hiện tại có lịch trùng khi gia hạn và chưa có phòng thay thế phù hợp.",
            409,
          );
        }
        const next = await tx.find("rooms", requestedRoomId);
        ensure(
          next?.status === "AVAILABLE",
          "Phòng thay thế phải đang sẵn sàng.",
        );
        const nextType = await tx.find("types", next.typeId);
        ensure(nextType, "Không tìm thấy loại phòng thay thế.");
        ensure(
          booking.guests <= nextType.capacity,
          "Phòng thay thế không đủ sức chứa.",
        );
        const now = new Date().toISOString();
        ensure(
          await h.available(tx, next.id, now, endAt, booking.id),
          "Phòng thay thế có lịch trùng.",
          409,
        );
        if (Date.parse(booking.endAt) > Date.parse(now))
          moveExtra = Math.max(
            0,
            (await h.quote(tx, next.id, now, booking.endAt)) -
              (await h.quote(tx, assignment.roomId, now, booking.endAt)),
          );
        await tx.update("history", assignment.id, { toAt: now });
        await tx.insert("history", {
          stayId: stay.id,
          roomId: next.id,
          fromAt: now,
          toAt: null,
          extraCharge: moveExtra,
        });
        await tx.update("rooms", assignment.roomId, { status: "DIRTY" });
        await tx.update("rooms", next.id, { status: "OCCUPIED" });
        await h.createTask(tx, assignment.roomId, stay.id, now);
        targetRoomId = next.id;
      }
      const extensionCharge = await h.quote(
        tx,
        targetRoomId,
        booking.endAt,
        endAt,
      );
      if (b.expectedExtensionCharge !== undefined)
        ensure(
          v.number(b.expectedExtensionCharge, "Tiền phòng tăng dự kiến") === extensionCharge,
          "Chi phí gia hạn đã thay đổi. Hãy xem lại trước khi xác nhận.",
          409,
        );
      if (b.expectedMoveExtra !== undefined)
        ensure(
          v.number(b.expectedMoveExtra, "Chênh lệch đổi phòng dự kiến") === moveExtra,
          "Chênh lệch đổi phòng đã thay đổi. Hãy xem lại trước khi xác nhận.",
          409,
        );
      const roomCharge = Number(booking.roomCharge || 0) + extensionCharge;
      await tx.update("bookings", booking.id, {
        endAt,
        roomCharge,
        roomId: targetRoomId,
      });
      await tx.update("stays", stay.id, {
        roomCharge: Number(stay.roomCharge || 0) + extensionCharge,
        surcharge: Number(stay.surcharge || 0) + moveExtra,
      });
      await h.audit(
        tx,
        user,
        "Gia hạn lưu trú",
        "STAY",
        stay.id,
        `${booking.endAt} → ${endAt}; phòng ${assignment.roomId} → ${targetRoomId}; +${extensionCharge}; phụ thu đổi ${moveExtra}`,
      );
      return {
        message: "Đã gia hạn lưu trú.",
        endAt,
        extensionCharge,
        moveExtra,
        currentRoomId: targetRoomId,
      };
    });
  },
});
