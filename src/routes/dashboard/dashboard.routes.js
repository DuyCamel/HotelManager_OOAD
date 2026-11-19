/** Routes dashboard. Middleware xác thực trước controller; model vẫn kiểm tra quyền ghi. */
const { Router } = require("express"),
  { required } = require("../../core/auth/security");
module.exports = (models) => {
  const router = Router(),
    c = require("../../controllers/dashboard/dashboard.controller")(models);
  router.get("/app/dashboard", required, c.index);
  router.get("/app/services", required, (req, res, next) =>
    req.user.role === "RECEPTIONIST" ? c.services(req, res) : next(),
  );
  router.get("/api/modules/dashboard", required, c.data);
  return router;
};
