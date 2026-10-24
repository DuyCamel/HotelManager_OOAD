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
});
