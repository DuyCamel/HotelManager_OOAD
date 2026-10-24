/** Routes bookings. Middleware xác thực trước controller; model vẫn kiểm tra quyền ghi. */
const { Router } = require("express"),
  { required } = require("../../core/auth/security");
module.exports = (models) => {
  const router = Router(),
    c = require("../../controllers/bookings/bookings.controller")(models);
  router.get("/app/bookings", required, c.index);
  router.post("/api/action/booking.create", required, c.create);
  router.post("/api/action/booking.deposit", required, c.deposit);
  router.post("/api/action/booking.cancel", required, c.cancel);
  return router;
};
