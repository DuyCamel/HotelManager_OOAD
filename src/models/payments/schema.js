/** Mapping cột SQL của payments. TODO TV3 C1: giữ đúng kiểu/độ dài trong database/01_schema.sql. */
module.exports = {
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
    },
  ],
};
