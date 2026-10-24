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
const h = require("../_shared/stayRules");
async function preview(tx, id) {
  const st = await tx.find("stays", id);
  ensure(st && !st.checkOutAt, "Phiếu thuê không còn đang lưu trú.");
  const booking = await tx.find("bookings", st.bookingId);
  const usage = (await tx.list("usage")).filter(
    (x) => x.stayId === id && !x.isVoided && !x.invoiceId,
  );
  const services = await tx.list("services");
  const lines = usage.map((x) => ({
    ...x,
    name: services.find((s) => s.id === x.serviceId)?.name || x.serviceId,
    total: x.quantity * x.unitPrice,
  }));
  const serviceCharge = lines.reduce((sum, x) => sum + x.total, 0);
  return {
    stayId: id,
    roomCharge: st.roomCharge,
    serviceCharge,
    surcharge: st.surcharge,
    discount: 0,
    deposit: booking.deposit,
    due: st.roomCharge + serviceCharge + st.surcharge - booking.deposit,
    lines,
  };
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
      ensure(
        v.number(b.expectedDue, "Số tiền đối chiếu") === bill.due,
        "Bảng kê đã thay đổi. Hãy xem lại trước khi thu tiền.",
        409,
      );
      ensure(
        ["CASH", "TRANSFER", "CARD"].includes(b.method),
        "Phương thức không hợp lệ.",
      );
      const st = await tx.find("stays", b.id),
        booking = await tx.find("bookings", st.bookingId),
        now = new Date().toISOString(),
        id = v.id("HD");
      const inv = {
        id,
        stayId: st.id,
        customerId: booking.customerId,
        issuedAt: now,
        roomCharge: bill.roomCharge,
        serviceCharge: bill.serviceCharge,
        surcharge: bill.surcharge,
        discount: 0,
        deposit: bill.deposit,
        status: "DRAFT",
        method: b.method,
        createdBy: user.id,
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
      await tx.insert("payments", {
        id: v.id("GD"),
        bookingId: null,
        invoiceId: id,
        kind: "SETTLEMENT",
        amount: bill.due,
        method: b.method,
        externalReference: b.reference
          ? v.text(b.reference, "Mã giao dịch", 100)
          : null,
        paidAt: now,
        createdBy: user.id,
      });
      await tx.finalizeInvoice(id);
      await tx.update("stays", st.id, { checkOutAt: now });
      for (const hist of await tx.list("history"))
        if (hist.stayId === st.id && !hist.toAt)
          await tx.update("history", hist.id, { toAt: now });
      await tx.update("bookings", booking.id, { status: "COMPLETED" });
      await tx.update("rooms", st.roomId, { status: "DIRTY" });
      await h.createTask(tx, st.roomId, st.id, now);
      await h.audit(tx, user, "Thanh toán và trả phòng", "INVOICE", id);
      return { id, message: "Đã lập hóa đơn và chuyển phòng sang Cần dọn." };
    });
  },
});
