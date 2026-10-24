/** Mapping cột SQL của room-types. TODO TV3 C1: giữ đúng kiểu/độ dài trong database/01_schema.sql. */
module.exports = {
  types: [
    "RoomType",
    "RoomTypeId",
    {
      name: "Name",
      capacity: "Capacity",
      beds: "Beds",
      hourlyPrice: "HourlyPrice",
      nightlyPrice: "NightlyPrice",
      dailyPrice: "DailyPrice",
      amenities: "Amenities",
    },
  ],
};
