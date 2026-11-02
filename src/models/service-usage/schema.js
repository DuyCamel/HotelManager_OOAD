/** Mapping cột SQL của service-usage. TODO TV3 C1: giữ đúng kiểu/độ dài trong database/01_schema.sql. */
module.exports = {
  usage: [
    "ServiceUsage",
    "UsageId",
    {
      stayId: "StayId",
      serviceId: "ServiceId",
      quantity: "Quantity",
      unitPrice: "UnitPrice",
      usedAt: "UsedAt",
      isVoided: "IsVoided",
    },
  ],
};
