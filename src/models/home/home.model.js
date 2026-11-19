/** Public landing-page data. Operational catalogs stay out of the homepage. */
const config = require("../../config/env");
const fallback = {
  hotelName: "Aurora Hotel",
  address: "TP. Hồ Chí Minh",
  hotline: "028 1234 567",
  checkInTime: "14:00",
  checkOutTime: "12:00",
};

const shortTime = (value, defaultValue) =>
  /^\d{2}:\d{2}/.test(String(value || ""))
    ? String(value).slice(0, 5)
    : defaultValue;

module.exports = (repo) => ({
  async public() {
    const [settings = {}] = await repo.list("settings");
    const hotel = {
      hotelName: settings.hotelName || fallback.hotelName,
      address: settings.address || fallback.address,
      hotline: settings.hotline || fallback.hotline,
      checkInTime: shortTime(config.checkInTime, fallback.checkInTime),
      checkOutTime: shortTime(config.checkOutTime, fallback.checkOutTime),
    };

    return {
      hotel,
      phoneHref: `tel:${String(hotel.hotline).replace(/[^+\d]/g, "")}`,
    };
  },
});
