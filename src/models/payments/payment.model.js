const { randomBytes } = require("node:crypto");
const config = require("../../config/env");
const { ensure } = require("../../core/errors/AppError");
const { allow } = require("../../core/auth/rbac");
const v = require("../../core/validation/fields");
const h = require("../_shared/stayRules");
const bookings = require("../bookings/booking.model");
const invoices = require("../invoices/invoice.model");
const gateway = require("./sepay.gateway");

async function authorize(tx, user, intent) {
  if (user.role !== "CUSTOMER") {
    allow(user, intent.kind === "DEPOSIT" ? "bookings" : "stays");
    return;
  }
  ensure(intent.kind === "DEPOSIT", "Khách không có quyền chốt trả phòng.", 403);
  const booking = await tx.find("bookings", intent.bookingId);
  const customer = booking && await tx.find("customers", booking.customerId);
  ensure(customer?.accountId === user.id, "Không có quyền với phiếu này.", 403);
}

function view(intent, sepay) {
  return {
    id: intent.id, kind: intent.kind, amount: intent.amount, status: intent.status,
    expiresAt: intent.expiresAt, bankId: sepay.bankId,
    accountNo: intent.accountNo, accountName: sepay.accountName,
    invoiceId: intent.invoiceId || null,
    qrUrl: intent.status === "PENDING" ? gateway.qr(sepay, intent) : null,
    reviewReason: intent.status === "REVIEW"
      ? "Giao dịch cần nhân viên đối soát. Không chuyển thêm tiền." : null,
  };
}

async function depositLedger(tx, booking) {
  const payments = (await tx.list("payments")).filter((p) => p.bookingId === booking.id && p.kind === "DEPOSIT");
  return payments.every((p) => Number.isSafeInteger(p.amount) && p.amount > 0) &&
    payments.reduce((sum, p) => sum + p.amount, 0) === booking.deposit;
}

module.exports = (repo, sepay = config.sepay) => ({
  async create(user, body) {
    gateway.configured(sepay);
    ensure(["DEPOSIT", "SETTLEMENT"].includes(body.kind), "Loại thanh toán không hợp lệ.");
    return repo.transaction(async (tx) => {
      const target = { kind: body.kind, bookingId: body.bookingId || null, stayId: body.stayId || null };
      await authorize(tx, user, target);
      await h.expire(tx);
      let amount, fingerprint = null, expiresAt;
      if (body.kind === "DEPOSIT") {
        const booking = await tx.find("bookings", body.bookingId);
        ensure(booking?.status === "PENDING" && booking.deposit === 0, "Phiếu không còn chờ cọc.", 409);
        ensure(Date.parse(booking.holdUntil) >= Date.now(), "Phiếu giữ phòng đã hết hạn.", 409);
        ensure(await depositLedger(tx, booking), "Cọc hiện tại chưa khớp sổ giao dịch; cần đối soát.", 409);
        amount = v.number(body.amount, "Tiền cọc", 1, booking.roomCharge);
        expiresAt = booking.holdUntil;
        target.stayId = null;
      } else {
        target.bookingId = null;
        const bill = await invoices.preview(tx, body.stayId);
        ensure(Number.isSafeInteger(bill.due) && bill.due > 0,
          "Số còn thu phải lớn hơn 0; không tạo QR cho hóa đơn đã đủ cọc hoặc cần hoàn tiền.");
        ensure(body.expectedDue === bill.due && body.fingerprint === bill.fingerprint,
          "Bảng kê đã thay đổi. Hãy xem lại trước khi tạo QR.", 409);
        const stay = await tx.find("stays", body.stayId);
        const booking = await tx.find("bookings", stay.bookingId);
        ensure(await depositLedger(tx, booking), "Cọc hiện tại chưa khớp sổ giao dịch; cần đối soát.", 409);
        amount = bill.due;
        fingerprint = bill.fingerprint;
        expiresAt = new Date(Date.now() + 15 * 60000).toISOString();
      }
      const previous = (await tx.list("paymentIntents")).filter((p) =>
        p.kind === target.kind && p.bookingId === target.bookingId && p.stayId === target.stayId);
      ensure(!previous.some((p) => p.status === "REVIEW"),
        "Đã có giao dịch cần đối soát cho phiếu này. Không chuyển thêm tiền.", 409);
      for (const pending of previous.filter((p) => p.status === "PENDING")) {
        if (Date.parse(pending.expiresAt) < Date.now()) {
          await tx.update("paymentIntents", pending.id, { status: "EXPIRED" });
        } else if (pending.fingerprint === fingerprint && pending.accountNo === sepay.accountNo) {
          ensure(pending.amount === amount, "Đã có QR với số tiền cọc khác; hãy dùng QR hiện tại hoặc liên hệ nhân viên.", 409);
          return view(pending, sepay);
        } else {
          await tx.update("paymentIntents", pending.id, { status: "CANCELLED" });
        }
      }
      const intent = await tx.insert("paymentIntents", {
        id: "HT" + randomBytes(12).toString("hex").toUpperCase(), ...target,
        amount, fingerprint, accountNo: sepay.accountNo,
        status: "PENDING", expiresAt, createdAt: new Date().toISOString(),
        createdBy: user.id, invoiceId: null,
      });
      return view(intent, sepay);
    });
  },

  async status(user, id) {
    return repo.transaction(async (tx) => {
      const intent = await tx.find("paymentIntents", id);
      ensure(intent, "Không có yêu cầu thanh toán.", 404);
      await authorize(tx, user, intent);
      if (intent.status === "PENDING") {
        let status = Date.parse(intent.expiresAt) < Date.now() ? "EXPIRED" : "PENDING";
        if (intent.accountNo !== sepay.accountNo) status = "CANCELLED";
        if (intent.kind === "DEPOSIT") {
          const booking = await tx.find("bookings", intent.bookingId);
          if (booking?.status !== "PENDING" || booking.deposit !== 0) status = "CANCELLED";
        } else {
          const stay = await tx.find("stays", intent.stayId);
          if (!stay || stay.checkOutAt) status = "CANCELLED";
        }
        if (status !== intent.status) {
          await tx.update("paymentIntents", id, { status });
          intent.status = status;
        }
      }
      return view(intent, sepay);
    });
  },

  async receive(body, authorization) {
    const transfer = gateway.receive(sepay, authorization, body);
    return repo.transaction(async (tx) => {
      const previous = await tx.find("sepayReceipts", transfer.transactionId);
      if (previous) {
        ensure(previous.amount === transfer.amount && previous.accountNo === transfer.accountNo && previous.code === transfer.code,
          "Mã giao dịch SePay đã tồn tại với nội dung khác.", 409);
        return { duplicate: true, outcome: previous.outcome };
      }
      await h.expire(tx);
      const intent = transfer.code ? await tx.find("paymentIntents", transfer.code) : null;
      let reason = !intent ? "Không tìm thấy yêu cầu thanh toán." :
        intent.status !== "PENDING" ? "Yêu cầu không còn chờ thanh toán." :
        Date.parse(intent.expiresAt) < Date.now() ? "Yêu cầu thanh toán đã hết hạn." :
        intent.accountNo !== transfer.accountNo ? "Tài khoản nhận đã thay đổi." :
        intent.amount !== transfer.amount ? "Số tiền chuyển không khớp yêu cầu." : null;
      let booking, bill;
      if (!reason && intent.kind === "DEPOSIT") {
        booking = await tx.find("bookings", intent.bookingId);
        if (booking?.status !== "PENDING" || booking.deposit !== 0 || Date.parse(booking.holdUntil) < Date.now())
          reason = "Phiếu đặt phòng không còn chờ cọc hoặc đã hết hạn.";
        else if (!(await depositLedger(tx, booking))) reason = "Tiền cọc không khớp sổ giao dịch.";
      } else if (!reason) {
        const stay = await tx.find("stays", intent.stayId);
        if (!stay || stay.checkOutAt) reason = "Phiếu thuê đã trả phòng hoặc không tồn tại.";
        else {
          bill = await invoices.preview(tx, intent.stayId);
          booking = await tx.find("bookings", stay.bookingId);
          if (bill.due !== intent.amount || bill.fingerprint !== intent.fingerprint)
            reason = "Bảng kê đã thay đổi sau khi tạo QR.";
          else if (!(await depositLedger(tx, booking))) reason = "Tiền cọc không khớp sổ giao dịch.";
        }
      }
      let paymentId = null, invoiceId = null;
      if (!reason) {
        const reference = "SEPAY:" + transfer.transactionId;
        if (intent.kind === "DEPOSIT") {
          const payment = await bookings.applyDeposit(tx, null, booking, transfer.amount, "TRANSFER", reference);
          paymentId = payment.id;
        } else {
          const result = await invoices.settle(tx, null, bill, "TRANSFER", reference);
          paymentId = result.paymentId;
          invoiceId = result.id;
        }
        await tx.update("paymentIntents", intent.id, { status: "APPLIED", invoiceId });
      } else if (intent && intent.status !== "APPLIED") {
        await tx.update("paymentIntents", intent.id, { status: "REVIEW" });
      }
      const outcome = reason ? "REVIEW" : "APPLIED";
      await tx.insert("sepayReceipts", {
        id: transfer.transactionId, intentId: intent?.id || null,
        amount: transfer.amount, accountNo: transfer.accountNo, code: transfer.code,
        outcome, reason, paymentId, createdAt: new Date().toISOString(),
      });
      await h.audit(tx, null, "SePay " + outcome, "PAYMENT", transfer.transactionId, reason || intent.id);
      return { duplicate: false, outcome };
    });
  },
});
