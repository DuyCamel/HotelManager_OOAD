/** Mapping cột SQL của holiday-rates. TODO TV3 C1: giữ đúng kiểu/độ dài trong database/01_schema.sql. */
module.exports = {
  holidays: [
    "HolidayRate",
    "HolidayRateId",
    {
      name: "Name",
      typeId: "RoomTypeId",
      startDate: "StartDate",
      endDate: "EndDate",
      percent: "IncreasePercent",
      isActive: "IsActive",
    },
  ],
};
