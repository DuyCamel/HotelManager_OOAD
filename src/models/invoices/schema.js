/** Mapping cột SQL của invoices. TODO TV3 C1: giữ đúng kiểu/độ dài trong database/01_schema.sql. */
module.exports = {
  invoices: [
    "Invoice",
    "InvoiceId",
    {
      stayId: "StayId",
      issuedAt: "IssuedAt",
      roomCharge: "RoomCharge",
      serviceCharge: "ServiceCharge",
      surcharge: "Surcharge",
      discount: "DiscountAmount",
      deposit: "DepositAmount",
      status: "StatusCode",
      method: "PaymentMethod",
      amountDue: "AmountDue",
    },
  ],
  lines: [
    "InvoiceLine",
    "InvoiceLineId",
    {
      invoiceId: "InvoiceId",
      lineType: "LineType",
      serviceId: "ServiceId",
      description: "Description",
      quantity: "Quantity",
      unitPrice: "UnitPrice",
      lineAmount: "LineAmount",
    },
    true,
  ],
};
