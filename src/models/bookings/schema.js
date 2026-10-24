/** Mapping cột SQL của bookings. TODO TV3 C1: giữ đúng kiểu/độ dài trong database/01_schema.sql. */
module.exports = {
  bookings: [
    "Booking",
    "BookingId",
    {
      customerId: "CustomerId",
      roomId: "RoomId",
      startAt: "StartAt",
      endAt: "EndAt",
      guests: "GuestCount",
      status: "StatusCode",
      channel: "ChannelCode",
      roomCharge: "RoomCharge",
      deposit: "DepositAmount",
      holdUntil: "HoldUntil",
      createdAt: "CreatedAt",
      createdBy: "CreatedBy",
    },
  ],
};
