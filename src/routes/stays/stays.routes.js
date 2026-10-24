/** Routes stays. Middleware xác thực trước controller; model vẫn kiểm tra quyền ghi. */
const { Router } = require("express"),
  { required } = require("../../core/auth/security");
module.exports = (models) => {
  const router = Router(),
    c = require("../../controllers/stays/stays.controller")(models);
  router.get("/app/stays", required, c.index);
  router.post("/api/action/stay.checkin", required, c.checkIn);
  router.post("/api/action/stay.move", required, c.changeRoom);
  return router;
};
