/** Routes stays. Middleware xác thực trước controller; model vẫn kiểm tra quyền ghi. */
const { Router } = require("express"),
  { required } = require("../../core/auth/security");
module.exports = (models) => {
  const router = Router(),
    c = require("../../controllers/stays/stays.controller")(models);
  router.get("/app/stays", required, c.index);
  router.post("/api/action/stay.checkin", required, c.checkIn);
  router.post("/api/action/stay.walkin", required, c.walkIn);
  router.post("/api/action/stay.surcharge", required, c.addSurcharge);
  router.post("/api/action/stay.move-preview", required, c.previewMove);
  router.post("/api/action/stay.move", required, c.changeRoom);
  router.post("/api/action/stay.extend-preview", required, c.previewExtend);
  router.post("/api/action/stay.extend", required, c.extend);
  return router;
};
