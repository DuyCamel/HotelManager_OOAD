/** Routes settings. Middleware xác thực trước controller; model vẫn kiểm tra quyền ghi. */
const { Router } = require("express"),
  { required } = require("../../core/auth/security");
module.exports = (models) => {
  const router = Router(),
    c = require("../../controllers/settings/settings.controller")(models);
  router.get("/app/settings", required, c.index);
  router.post("/api/action/system.settings", required, c.settings);
  return router;
};
