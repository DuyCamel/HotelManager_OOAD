/** Routes accounts. Middleware xác thực trước controller; model vẫn kiểm tra quyền ghi. */
const { Router } = require("express"),
  { required } = require("../../core/auth/security");
module.exports = (models) => {
  const router = Router(),
    c = require("../../controllers/accounts/accounts.controller")(models);
  router.get("/app/accounts", required, c.index);
  router.post("/api/action/account.create", required, c.create);
  router.post("/api/action/account.update", required, c.update);
  router.post("/api/action/account.toggle", required, c.toggle);
  router.post("/api/action/account.role", required, c.role);
  return router;
};
