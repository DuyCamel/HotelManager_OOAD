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
const config = require("../../config/env");

async function applyDeposit(tx, user, booking, amount, method, reference) {
  ensure(booking?.status === "PENDING" && booking.deposit === 0, "Phiếu không còn chờ cọc.", 409);
  v.number(amount, "Tiền cọc", 1, booking.roomCharge);
  ensure(!(await tx.list("payments")).some((p) => p.bookingId === booking.id && p.kind === "DEPOSIT"),
    "Phiếu đã có giao dịch cọc; cần đối soát trước.", 409);
  await tx.update("bookings", booking.id, { deposit: amount, status: "CONFIRMED" });
  const payment = await tx.insert("payments", {
    id: v.id("GD"), bookingId: booking.id, invoiceId: null,
    kind: "DEPOSIT", amount, method, externalReference: reference,
    paidAt: new Date().toISOString(), createdBy: user?.id || null,
  });
  await h.audit(tx, user, user ? "Xác nhận cọc thủ công" : "SePay xác nhận cọc", "BOOKING", booking.id, reference || "");
  return payment;
}

module.exports = (repo) => ({
  async expire() {
    return repo.transaction((tx) => h.expire(tx));
  },
  async available(b) {
    const startDate = v.calendarDate(b.startAt, "Ngày nhận"),
      endDate = v.calendarDate(b.endAt, "Ngày trả"),
      guests = v.number(b.guests || 1, "Số người", 1, 20);
    ensure(
      startDate >= h.localDatePart(new Date()) && endDate > startDate,
      "Ngày nhận không được ở quá khứ, ngày trả phải sau ngày nhận.",
    );
    // Một lần đọc mỗi bảng cho trang tìm kiếm; chốt lại lịch/giá trong transaction khi đặt.
    const keys = [
      "rooms",
      "types",
      "bookings",
      "stays",
      "history",
      "holidays",
      "settings",
    ];
    const loaded = Object.fromEntries(
      await Promise.all(keys.map(async (key) => [key, await repo.list(key)])),
    );
    const policy = loaded.settings[0];
    ensure(policy, "Chưa cấu hình giờ nhận/trả phòng.");
    const { startAt, endAt } = h.fixedStayTimes(
      startDate,
      endDate,
      policy,
    );
    ensure(
      Date.parse(endAt) > Date.parse(startAt),
      "Ngày trả phải sau ngày nhận.",
    );
    ensure(
      !h.isNoShowExpired(
        { status: "CONFIRMED", startAt, endAt },
        Date.now(),
      ),
      `Đã quá giờ nhận phòng (${config.noShowTime}); không thể đặt cho hôm nay.`,
      409,
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
      guests = v.number(b.guests, "Số người", 1, 20);
    return repo.transaction(async (tx) => {
      const nowDate = new Date();
      ensure(
        startDate >= h.localDatePart(nowDate) && endDate > startDate,
        "Ngày nhận không được ở quá khứ, ngày trả phải sau ngày nhận.",
      );
      const policy = (await tx.list("settings"))[0];
      ensure(policy, "Chưa cấu hình giờ nhận/trả phòng.");
      const { startAt, endAt } = h.fixedStayTimes(
        startDate,
        endDate,
        policy,
      );
      ensure(
        Date.parse(endAt) > Date.parse(startAt),
        "Ngày trả phải sau ngày nhận.",
      );
      ensure(
        !h.isNoShowExpired({ status: "CONFIRMED", startAt, endAt }, nowDate.getTime()),
        `Đã quá giờ nhận phòng (${config.noShowTime}); hãy dùng luồng Nhận phòng ngay nếu còn phòng.`,
        409,
      );
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
        method = b.method ?? "CASH";
      if (!online)
        ensure(["CASH", "TRANSFER"].includes(method), "Chọn cọc tiền mặt hoặc chuyển khoản.");
      const requestedDeposit = online ? 0 : v.number(b.deposit, "Tiền cọc", 1, roomCharge),
        pending = online || method === "TRANSFER",
        deposit = pending ? 0 : requestedDeposit;
      if (!pending)
        ensure(
          b.receiptConfirmed === true,
          "Phải xác nhận đã nhận tiền cọc trước khi tạo phiếu tại quầy.",
        );
      const now = nowDate.toISOString();
      const holdUntil = new Date(
        Math.min(
          nowDate.getTime() + config.bookingHoldMinutes * 60000,
          h.noShowDeadline({ startAt, endAt }),
        ),
      ).toISOString();
      const row = {
        id: v.id("DP"),
        customerId: customer.id,
        roomId: room.id,
        startAt,
        endAt,
        guests,
        status: pending ? "PENDING" : "CONFIRMED",
        channel: online ? "ONLINE" : "COUNTER",
        roomCharge,
        deposit,
        holdUntil,
        createdAt: now,
        createdBy: user.id,
      };
      const created = await tx.insert("bookings", row);
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
      return created;
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
      ensure(
        b.receiptConfirmed === true,
        "Phải xác nhận đã nhận hoặc đối soát tiền cọc.",
      );
      const reference = ["TRANSFER", "CARD"].includes(b.method)
        ? v.text(b.reference, "Mã giao dịch", 100)
        : null;
      await applyDeposit(tx, user, booking, amount, b.method, reference);
      return { ok: true };
    });
  },
  async cancel(user, b) {
    if (user.role !== "CUSTOMER") allow(user, "bookings");
    return repo.transaction(async (tx) => {
      await h.expire(tx);
      const booking = await tx.find("bookings", b.id);
      ensure(booking, "Không có phiếu.", 404);
      let isRefunded = false;
      const originalDeposit = Number(booking.deposit || 0);

      if (user.role === "CUSTOMER") {
        const customer = await tx.find("customers", booking.customerId);
        ensure(
          customer && customer.accountId === user.id,
          "Không có quyền với phiếu này.",
          403,
        );
        if (booking.status === "PENDING" && originalDeposit === 0) {
          // Phiếu giữ chỗ chưa cọc
        } else if (booking.status === "CONFIRMED") {
          // Khách đổi ý định trong vòng 2 tiếng kể từ khi đặt: được hủy và hoàn cọc
          const createdTime = Date.parse(booking.createdAt || booking.startAt);
          const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
          const isWithin2Hours =
            Number.isFinite(createdTime) && (Date.now() - createdTime <= TWO_HOURS_MS);
          ensure(
            isWithin2Hours,
            "Đã quá thời hạn 2 tiếng để hủy miễn phí và hoàn cọc. Vui lòng liên hệ quầy lễ tân để được hỗ trợ.",
            400,
          );
          isRefunded = true;
        } else {
          ensure(false, "Không thể hủy đặt phòng ở trạng thái này.", 400);
        }
      } else {
        ensure(
          (booking.status === "PENDING" && originalDeposit === 0) ||
            booking.status === "CONFIRMED",
          "Chỉ hủy phiếu đang giữ chỗ hoặc phiếu đã cọc khi khách không đến (giữ cọc).",
        );
      }

      if (isRefunded && originalDeposit > 0) {
        // Khách đổi ý trong 2 tiếng: hoàn cọc tượng trưng, trừ tiền trong tiền tổng (deposit = 0) để đồng bộ báo cáo
        await tx.update("bookings", booking.id, {
          status: "CANCELLED",
          deposit: 0,
        });
        await h.audit(
          tx,
          user,
          "Khách hủy đặt phòng trong 2h (hoàn cọc)",
          "BOOKING",
          booking.id,
          `Đã hoàn cọc=${originalDeposit}`,
        );
      } else {
        // Lễ tân hủy (khách không đến / quá hạn / no-show -> giữ cọc) hoặc hủy phiếu chưa cọc
        const hadDeposit = originalDeposit > 0;
        await tx.update("bookings", booking.id, { status: "CANCELLED" });
        await h.audit(
          tx,
          user,
          hadDeposit
            ? "Hủy đặt phòng do khách không đến (giữ cọc)"
            : "Hủy phiếu chưa cọc",
          "BOOKING",
          booking.id,
          hadDeposit ? `Cọc không hoàn=${originalDeposit}` : "",
        );
      }
      return {
        ok: true,
        refunded: isRefunded,
        refundAmount: isRefunded ? originalDeposit : 0,
      };
    });
  },
});
module.exports.applyDeposit = applyDeposit;
