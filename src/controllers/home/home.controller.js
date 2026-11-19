/** Public hotel landing page and availability endpoint. */
const { allow } = require("../../core/auth/rbac");
module.exports = (models) => ({
  async index(req, res) {
    const customer = req.user?.role === "CUSTOMER";
    const experienceHref = req.user
      ? customer
        ? "/app/search"
        : "/portal"
      : "/login";

    res.render("home/index", {
      data: await models.home.public(),
      experienceHref,
      experienceLabel: req.user
        ? customer
          ? "Tìm phòng"
          : "Không gian làm việc"
        : "Đăng nhập",
      viewer: req.user
        ? { name: req.user.name, isCustomer: customer }
        : null,
    });
  },
  async availability(req, res) {
    allow(req.user, req.user.role === "CUSTOMER" ? "self" : "bookings");
    res.json(await models.bookings.available(req.query));
  },
});
