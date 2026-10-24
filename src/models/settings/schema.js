/** Mapping cột SQL của settings. TODO TV3 C1: giữ đúng kiểu/độ dài trong database/01_schema.sql. */
module.exports = {
  settings: [
    "HotelSetting",
    "SettingId",
    {
      hotelName: "HotelName",
      address: "Address",
      hotline: "Hotline",
      checkInTime: "CheckInTime",
      checkOutTime: "CheckOutTime",
      lateFeeFrom: "LateFeeFrom",
      lateFeePercent: "LateFeePercent",
      bankCode: "BankCode",
      bankAccount: "BankAccount",
      bankOwner: "BankOwner",
      logoPath: "LogoPath",
    },
  ],
};
