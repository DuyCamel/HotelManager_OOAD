/** Trang khách sạn và tìm phòng công khai. */
module.exports = (models) => ({
  async index(req, res) {
    res.render("home/index", { data: await models.home.public() });
  },
  async availability(req, res) {
    res.json(await models.bookings.available(req.query));
  },
});
