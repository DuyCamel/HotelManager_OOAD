/** Tìm phòng, giữ chỗ, cọc, nhận và đổi phòng trong transaction; khách chỉ thao tác phiếu của mình. */
const v = require("../shared/validation");
const { ensure } = require("../shared/errors");
const { allow } = require("../shared/permissions");
const h = require("./helpers");
module.exports = (repo) => ({
  async expire() {
    return repo.transaction((tx) => h.expire(tx));
  },
  async available(b) {
    const startDate = v.calendarDate(b.startAt, "Ngày nhận"),
      endDate = v.calendarDate(b.endAt, "Ngày trả"),
      { startAt, endAt } = h.fixedStayTimes(startDate, endDate),
      guests = v.number(b.guests || 1, "Số người", 1, 20);
    ensure(
      Date.parse(endAt) > Date.parse(startAt),
      "Ngày trả phải sau ngày nhận.",
    );
    // Một lần đọc mỗi bảng cho trang tìm kiếm; chốt lại lịch/giá trong transaction khi đặt.
    const keys = ["rooms", "types", "bookings", "holidays"];
    const loaded = Object.fromEntries(
      await Promise.all(keys.map(async (key) => [key, await repo.list(key)])),
    );
    const snapshot = {
      list: async (key) => loaded[key],
      find: async (key, id) => loaded[key].find((x) => x.id === id),
    };
    const types = loaded.types;
    const result = [];
    for (const room of loaded.rooms) {
      const type = types.find((t) => t.id === room.typeId);
      if (
        type.capacity >= guests &&
        (await h.available(snapshot, room.id, startAt, endAt))
      )
        result.push({
          ...room,
          type,
          quote: await h.quote(snapshot, room.id, startAt, endAt),
        });
    }
    return result;
  },
  async create(user, b) {
    if (user.role !== "CUSTOMER") allow(user, "bookings");
    const startDate = v.calendarDate(b.startAt, "Ngày nhận"),
      endDate = v.calendarDate(b.endAt, "Ngày trả"),
      { startAt, endAt } = h.fixedStayTimes(startDate, endDate),
      guests = v.number(b.guests, "Số người", 1, 20);
    ensure(
      Date.parse(startAt) >= Date.now() - 300000 &&
        Date.parse(endAt) > Date.parse(startAt),
      "Ngày nhận không được ở quá khứ, ngày trả phải sau ngày nhận.",
    );
    return repo.transaction(async (tx) => {
      await h.expire(tx);
      const customer =
        user.role === "CUSTOMER"
          ? (await tx.list("customers")).find((c) => c.accountId === user.id)
          : await tx.find("customers", b.customerId);
      ensure(customer?.isActive, "Hồ sơ khách không hợp lệ.");
      const room = await tx.find("rooms", b.roomId),
        type = room && (await tx.find("types", room.typeId));
      ensure(type && guests <= type.capacity, "Phòng không đủ sức chứa.");
      ensure(
        await h.available(tx, room.id, startAt, endAt),
        "Phòng vừa được giữ hoặc không khả dụng.",
        409,
      );
      const roomCharge = await h.quote(tx, room.id, startAt, endAt),
        online = user.role === "CUSTOMER",
        deposit = online ? 0 : v.number(b.deposit, "Tiền cọc", 1, roomCharge);
      const now = new Date().toISOString();
      const row = {
        id: v.id("DP"),
        customerId: customer.id,
        roomId: room.id,
        startAt,
        endAt,
        guests,
        status: online ? "PENDING" : "CONFIRMED",
        channel: online ? "ONLINE" : "COUNTER",
        roomCharge,
        deposit,
        holdUntil: new Date(Date.now() + 1800000).toISOString(),
        createdAt: now,
        createdBy: user.id,
      };
      await tx.insert("bookings", row);
      if (deposit)
        await tx.insert("payments", {
          id: v.id("GD"),
          bookingId: row.id,
          invoiceId: null,
          kind: "DEPOSIT",
          amount: deposit,
          method: "CASH",
          externalReference: null,
          paidAt: now,
          createdBy: user.id,
        });
      await h.audit(tx, user, "Đặt phòng", "BOOKING", row.id, room.id);
      return row;
    });
  },
  async deposit(user, b) {
    allow(user, "bookings");
    return repo.transaction(async (tx) => {
      await h.expire(tx);
      const booking = await tx.find("bookings", b.id);
      ensure(booking?.status === "PENDING", "Phiếu không còn chờ cọc.");
      const amount = v.number(b.amount, "Tiền cọc", 1, booking.roomCharge);
      ensure(
        ["CASH", "TRANSFER", "CARD"].includes(b.method),
        "Phương thức không hợp lệ.",
      );
      await tx.update("bookings", booking.id, {
        deposit: amount,
        status: "CONFIRMED",
      });
      await tx.insert("payments", {
        id: v.id("GD"),
        bookingId: booking.id,
        invoiceId: null,
        kind: "DEPOSIT",
        amount,
        method: b.method,
        externalReference: b.reference
          ? v.text(b.reference, "Mã giao dịch", 100)
          : null,
        paidAt: new Date().toISOString(),
        createdBy: user.id,
      });
      await h.audit(tx, user, "Xác nhận cọc thủ công", "BOOKING", booking.id);
      return { ok: true };
    });
  },
  async cancel(user, b) {
    if (user.role !== "CUSTOMER") allow(user, "bookings");
    return repo.transaction(async (tx) => {
      const booking = await tx.find("bookings", b.id);
      ensure(booking, "Không có phiếu.", 404);
      if (user.role === "CUSTOMER") {
        const customer = await tx.find("customers", booking.customerId);
        ensure(
          customer.accountId === user.id,
          "Không có quyền với phiếu này.",
          403,
        );
      }
      ensure(
        booking.status === "PENDING" && booking.deposit === 0,
        "Chỉ hủy phiếu chưa cọc; hoàn cọc cần quy trình được chốt riêng.",
      );
      await tx.update("bookings", booking.id, { status: "CANCELLED" });
      await h.audit(tx, user, "Hủy phiếu chưa cọc", "BOOKING", booking.id);
      return { ok: true };
    });
  },
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
