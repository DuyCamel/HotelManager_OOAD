/** Mapping cột SQL của services. TODO TV3 C1: giữ đúng kiểu/độ dài trong database/01_schema.sql. */
module.exports = {
  services: [
    "HotelService",
    "ServiceId",
    {
      name: "Name",
      description: "Description",
      unit: "UnitName",
      price: "Price",
      isActive: "IsActive",
    },
  ],
};
