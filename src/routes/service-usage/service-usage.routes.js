/** Routes service-usage. Middleware xác thực trước controller; model vẫn kiểm tra quyền ghi. */
const { Router } = require("express"),
  { required } = require("../../core/auth/security");
module.exports = (models) => {
  const router = Router(),
    c = require("../../controllers/service-usage/service-usage.controller")(
      models,
    );
  router.get("/app/service-usage", required, c.index);
  router.post("/api/action/usage.add", required, c.addUsage);
  router.post("/api/action/usage.void", required, c.voidUsage);
  return router;
};
