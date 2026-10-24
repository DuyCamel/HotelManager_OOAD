/** Routes profile. Middleware xác thực trước controller; model vẫn kiểm tra quyền ghi. */
const { Router } = require("express"),
  { required } = require("../../core/auth/security");
module.exports = (models) => {
  const router = Router(),
    c = require("../../controllers/profile/profile.controller")(models);
  router.get("/app/profile", required, c.index);
  router.post("/api/action/profile.update", required, c.update);
  router.post("/api/action/profile.password", required, c.password);
  return router;
};
