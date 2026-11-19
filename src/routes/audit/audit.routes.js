/** Routes audit. Middleware xác thực trước controller; model vẫn kiểm tra quyền ghi. */
const { Router } = require("express"),
  { required } = require("../../core/auth/security");
module.exports = (models) => {
  const router = Router(),
    c = require("../../controllers/audit/audit.controller")(models);
  router.get("/app/audit", required, c.index);
  router.get("/api/modules/audit", required, c.data);
  router.get("/api/modules/audit.csv", required, c.csv);
  return router;
};
