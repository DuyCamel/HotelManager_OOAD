/** Mapping cột SQL của stays. TODO TV3 C1: giữ đúng kiểu/độ dài trong database/01_schema.sql. */
module.exports = {
  stays: [
    "Stay",
    "StayId",
    {
      bookingId: "BookingId",
      identityNo: "IdentityNo",
      checkInAt: "CheckInAt",
      checkOutAt: "CheckOutAt",
      roomCharge: "RoomCharge",
      surcharge: "Surcharge",
    },
  ],
  history: [
    "StayRoomHistory",
    "HistoryId",
    {
      stayId: "StayId",
      roomId: "RoomId",
      fromAt: "FromAt",
      toAt: "ToAt",
      extraCharge: "ExtraCharge",
    },
    true,
  ],
};
