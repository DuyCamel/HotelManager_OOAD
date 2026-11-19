/** Routes backups. Middleware xác thực trước controller; model vẫn kiểm tra quyền ghi. */
const { Router } = require("express"),
  { required } = require("../../core/auth/security");
module.exports = (models) => {
  const router = Router(),
    c = require("../../controllers/backups/backups.controller")(models);
  router.get("/app/backups", required, c.index);
  router.get("/api/modules/backups", required, c.data);
  router.post("/api/action/system.backup", required, c.backup);
  router.post("/api/action/system.restore", required, c.restore);
  return router;
};
