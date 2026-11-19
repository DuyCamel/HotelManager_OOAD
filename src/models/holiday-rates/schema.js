/** Mapping cột SQL của holiday-rates. TODO TV3 C1: giữ đúng kiểu/độ dài trong database/01_schema.sql. */
module.exports = {
  holidays: [
    "HolidayRate",
    "HolidayRateId",
    {
      name: "Name",
      typeId: "RoomTypeId",
      scheduleType: "ScheduleType",
      startDate: "StartDate",
      endDate: "EndDate",
      startMonthDay: "StartMonthDay",
      endMonthDay: "EndMonthDay",
      percent: "IncreasePercent",
      isActive: "IsActive",
    },
  ],
};
