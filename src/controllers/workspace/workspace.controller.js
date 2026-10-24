/** Điểm vào workspace và dữ liệu đã lọc quyền. TODO TV1 A6: phân trang API từng màn. */
const page = require("../../core/http/page"),
  { ensure } = require("../../core/errors/AppError");
module.exports = (models) => ({
  index(req, res) {
    res.redirect(
      req.user.role === "CUSTOMER"
        ? "/app/search"
        : ["RECEPTIONIST", "HOUSEKEEPER"].includes(req.user.role)
          ? "/app/housekeeping"
          : "/app/dashboard",
    );
  },
  async data(req, res) {
    res.json(await models.workspace.workspace(req.user));
  },
  search: page("bookings/search", "search", "self"),
  mybookings: page("bookings/mine", "mybookings", "self"),
  mycard: page("memberships/mine", "mycard", "self"),
  customerInvoices(req, res) {
    ensure(req.user.role === "CUSTOMER", "Không có quyền.", 403);
    res.render("invoices/index", {
      initialPage: "invoices",
      catalogKind: null,
    });
  },
});
