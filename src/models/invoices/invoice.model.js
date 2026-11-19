/**
 * TASK-BAN-GIAO (TODO) | Phụ trách: TV2 | Mã việc: B4, B6
 * Đây là việc còn lại/nghiệm thu, không phải mô tả tính năng đã hoàn tất.
 * Cung cấp bảng kê chi tiết cho UI trước thu tiền: phòng, từng dịch vụ, phụ thu, cọc và còn thu; giá chốt luôn ở server.
 * Nghiệm thu rollback, snapshot đơn giá, trả phòng hai lần, hóa đơn PAID và cộng điểm một lần trong cả SQL/demo.
 * Phụ thu trễ/giờ/đêm, hoàn cọc và giảm giá chỉ làm sau khi chốt chính sách; không tự thêm công thức.
 * Chi tiết, phụ thuộc và tiêu chí xong: docs/PHAN_CONG_3_NGUOI.md.
 */
/** Ghi dịch vụ tại phiếu thuê; bảng kê luôn tính phía server trước khi tạo hóa đơn một lần. */
const v = require("../../core/validation/fields");
const { ensure } = require("../../core/errors/AppError");
const { allow } = require("../../core/auth/rbac");
const { createHash } = require("node:crypto");
const h = require("../_shared/stayRules");
function fingerprint(bill) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        stayId: bill.stayId,
        roomCharge: bill.roomCharge,
        serviceCharge: bill.serviceCharge,
        surcharge: bill.surcharge,
        discount: bill.discount,
        deposit: bill.deposit,
        due: bill.due,
        lines: bill.lines
          .map((line) => ({
            id: line.id,
            serviceId: line.serviceId,
            name: line.name,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            total: line.total,
          }))
          .sort((left, right) => String(left.id).localeCompare(String(right.id))),
      }),
    )
    .digest("hex");
}
async function preview(tx, id) {
  const st = await tx.find("stays", id);
  ensure(st && !st.checkOutAt, "Phiếu thuê không còn đang lưu trú.");
  const booking = await tx.find("bookings", st.bookingId);
  const usage = (await tx.list("usage")).filter(
    (x) => x.stayId === id && !x.isVoided,
  );
  const services = await tx.list("services");
  const lines = usage.map((x) => ({
    ...x,
    name: services.find((s) => s.id === x.serviceId)?.name || x.serviceId,
    total: x.quantity * x.unitPrice,
  }));
  const serviceCharge = lines.reduce((sum, x) => sum + x.total, 0);
  const cards = (await tx.list("cards")) || [];
  const anyCard = cards.find(
    (c) => String(c.customerId) === String(booking.customerId),
  );
  const card = anyCard?.isActive ? anyCard : null;
  const tier = card ? h.tierForPoints(card.points) : null;
  const gross = st.roomCharge + serviceCharge + st.surcharge;
  const discount = tier?.percent ? Math.round((gross * tier.percent) / 100) : 0;
  const net = gross - discount;
  const earnedPoints = card || !anyCard ? Math.floor(net / 10000) : 0;
  const bill = {
    stayId: id,
    roomCharge: st.roomCharge,
    serviceCharge,
    surcharge: st.surcharge,
    discount,
    deposit: booking.deposit,
    due: net - booking.deposit,
    earnedPoints,
    canIssueCard: !anyCard,
    tier: tier ? { ...tier, cardId: card.id, earnedPoints } : null,
    lines,
  };
  return { ...bill, fingerprint: fingerprint(bill) };
}

async function settle(tx, user, bill, method, reference, options = {}) {
  const st = await tx.find("stays", bill.stayId),
    booking = await tx.find("bookings", st.bookingId),
    now = new Date().toISOString(),
    id = v.id("HD");
  const openHistory = (await tx.list("history")).find(
    (item) => item.stayId === st.id && !item.toAt,
  );
  ensure(openHistory, "Không tìm thấy phòng đang lưu trú.");
  const customer = await tx.find("customers", booking.customerId);
  const room = await tx.find("rooms", openHistory.roomId);
  const [setting] = await tx.list("settings");
  ensure(customer && room && setting, "Thiếu dữ liệu để chốt hóa đơn.");
  const inv = {
    id,
    stayId: st.id,
    customerId: booking.customerId,
    issuedAt: now,
    roomCharge: bill.roomCharge,
    serviceCharge: bill.serviceCharge,
    surcharge: bill.surcharge,
    discount: bill.discount || 0,
    deposit: bill.deposit,
    amountDue: bill.due,
    status: "DRAFT",
    method,
    customerName: customer.name,
    customerIdentity: customer.identityNo,
    customerPhone: customer.phone,
    roomName: room.name,
    hotelName: setting.hotelName,
    hotelAddress: setting.address,
    hotelHotline: setting.hotline,
    paymentReference: reference,
    createdBy: user?.id || null,
  };
  await tx.insert("invoices", inv);
  await tx.insert("lines", {
    invoiceId: id,
    lineType: "ROOM",
    serviceId: null,
    description: "Tiền lưu trú",
    quantity: 1,
    unitPrice: bill.roomCharge,
  });
  if (bill.surcharge)
    await tx.insert("lines", {
      invoiceId: id,
      lineType: "SURCHARGE",
      serviceId: null,
      description: "Phụ thu đổi phòng",
      quantity: 1,
      unitPrice: bill.surcharge,
    });
  for (const line of bill.lines) {
    await tx.insert("lines", {
      invoiceId: id,
      lineType: "SERVICE",
      serviceId: line.serviceId,
      description: line.name,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
    });
    await tx.update("usage", line.id, { invoiceId: id });
  }
  if (bill.discount)
    await tx.insert("lines", {
      invoiceId: id,
      lineType: "DISCOUNT",
      serviceId: null,
      description: bill.tier
        ? `Ưu đãi hạng ${bill.tier.name} (-${bill.tier.percent}%)`
        : "Giảm giá thành viên",
      quantity: 1,
      unitPrice: bill.discount,
    });
  let paymentId = null;
  if (bill.due > 0) {
    paymentId = v.id("GD");
    await tx.insert("payments", {
      id: paymentId,
      bookingId: null,
      invoiceId: id,
      kind: "SETTLEMENT",
      amount: bill.due,
      method,
      externalReference: reference,
      paidAt: now,
      createdBy: user?.id || null,
    });
  }
  const existingCards = (await tx.list("cards")) || [];
  const hasCard = existingCards.some(
    (c) => String(c.customerId) === String(booking.customerId),
  );
  if (!hasCard && options.issueCard !== false) {
    const cardId = v.id("TV");
    await tx.insert("cards", {
      id: cardId,
      customerId: booking.customerId,
      points: 0,
      isActive: true,
      issuedAt: now,
    });
    await h.audit(tx, user, "Cấp thẻ thành viên khi trả phòng", "CARD", cardId, booking.customerId);
  }
  await tx.finalizeInvoice(id);
  await tx.update("stays", st.id, { checkOutAt: now });
  await tx.update("history", openHistory.id, { toAt: now });
  await tx.update("bookings", booking.id, { status: "COMPLETED" });
  await tx.update("rooms", openHistory.roomId, { status: "DIRTY" });
  await h.createTask(tx, openHistory.roomId, st.id, now);
  await h.audit(tx, user, "Thanh toán và trả phòng", "INVOICE", id);
  return { id, paymentId, message: "Đã lập hóa đơn và chuyển phòng sang Cần dọn." };
}

module.exports = (repo) => ({
  async preview(user, id) {
    allow(user, "stays");
    return preview(repo, id);
  },
  async checkout(user, b) {
    allow(user, "stays");
    return repo.transaction(async (tx) => {
      const bill = await preview(tx, b.id);
      ensure(bill.due >= 0, "Tiền cọc vượt quá tổng tiền phải trả; cần xử lý hoàn cọc trước.");
      ensure(v.number(b.expectedDue, "Số tiền đối chiếu") === bill.due,
        "Bảng kê đã thay đổi. Hãy xem lại trước khi thu tiền.", 409);
      ensure(v.text(b.fingerprint, "Mã đối chiếu bảng kê", 64) === bill.fingerprint,
        "Nội dung bảng kê đã thay đổi. Hãy xem lại trước khi thu tiền.", 409);
      ensure(["CASH", "TRANSFER", "CARD"].includes(b.method), "Phương thức không hợp lệ.");
      ensure(b.receiptConfirmed === true,
        "Phải xác nhận đã nhận hoặc đối soát tiền trước khi tạo hóa đơn.");
      const reference = ["TRANSFER", "CARD"].includes(b.method)
        ? v.text(b.reference, "Mã giao dịch", 100) : null;
      return settle(tx, user, bill, b.method, reference, {
        issueCard: b.issueCard !== false,
      });
    });
  },
});
module.exports.preview = preview;
module.exports.settle = settle;
