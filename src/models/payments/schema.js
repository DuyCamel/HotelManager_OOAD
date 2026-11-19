/** Mapping cột SQL của payments. TODO TV3 C1: giữ đúng kiểu/độ dài trong database/01_schema.sql. */
module.exports = {
  paymentIntents: [
    "PaymentIntent",
    "IntentId",
    {
      kind: "IntentKind",
      bookingId: "BookingId",
      stayId: "StayId",
      amount: "Amount",
      fingerprint: "Fingerprint",
      accountNo: "AccountNo",
      status: "StatusCode",
      expiresAt: "ExpiresAt",
      createdAt: "CreatedAt",
      createdBy: "CreatedBy",
      invoiceId: "InvoiceId",
    },
  ],
  sepayReceipts: [
    "SepayReceipt",
    "ReceiptId",
    {
      intentId: "IntentId",
      amount: "Amount",
      accountNo: "AccountNo",
      code: "Code",
      outcome: "Outcome",
      reason: "Reason",
      paymentId: "PaymentId",
      createdAt: "CreatedAt",
    },
  ],
  payments: [
    "Payment",
    "PaymentId",
    {
      bookingId: "BookingId",
      invoiceId: "InvoiceId",
      kind: "PaymentKind",
      amount: "Amount",
      method: "MethodCode",
      externalReference: "ExternalReference",
      paidAt: "PaidAt",
      createdBy: "CreatedBy",
    },
  ],
};
