/** Mapping cột SQL của rooms. TODO TV3 C1: giữ đúng kiểu/độ dài trong database/01_schema.sql. */
module.exports = {
  rooms: [
    "Room",
    "RoomId",
    {
      name: "Name",
      typeId: "RoomTypeId",
      status: "StatusCode",
      imagePath: "ImagePath",
      note: "Note",
    },
  ],
};
