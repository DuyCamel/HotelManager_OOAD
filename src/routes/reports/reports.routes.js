/** Routes reports. Middleware xác thực trước controller; model vẫn kiểm tra quyền ghi. */
const { Router } = require("express"),
  { required } = require("../../core/auth/security");
module.exports = (models) => {
  const router = Router(),
    c = require("../../controllers/reports/reports.controller")(models);
  router.get("/app/reports", required, c.index);
  router.get("/api/modules/reports", required, c.data);
  router.get("/api/modules/reports.csv", required, c.csv);
  return router;
};
