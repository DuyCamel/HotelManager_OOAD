/** Routes customers. Middleware xác thực trước controller; model vẫn kiểm tra quyền ghi. */
const { Router } = require("express"),
  { required } = require("../../core/auth/security");
module.exports = (models) => {
  const router = Router(),
    c = require("../../controllers/customers/customers.controller")(models);
  router.get("/app/customers", required, c.index);
  router.post("/api/action/customer.save", required, c.save);
  router.post("/api/action/customer.archive", required, c.archive);
  return router;
};
