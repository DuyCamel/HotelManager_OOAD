/** Routes dashboard. Middleware xác thực trước controller; model vẫn kiểm tra quyền ghi. */
const { Router } = require("express"),
  { required } = require("../../core/auth/security");
module.exports = (models) => {
  const router = Router(),
    c = require("../../controllers/dashboard/dashboard.controller")(models);
  router.get("/app/dashboard", required, c.index);
  return router;
};
