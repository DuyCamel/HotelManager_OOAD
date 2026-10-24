/** Routes invoices. Middleware xác thực trước controller; model vẫn kiểm tra quyền ghi. */
const { Router } = require("express"),
  { required } = require("../../core/auth/security");
module.exports = (models) => {
  const router = Router(),
    c = require("../../controllers/invoices/invoices.controller")(models);
  router.get("/app/invoices", required, c.index);
  router.post("/api/action/stay.preview", required, c.preview);
  router.post("/api/action/stay.checkout", required, c.checkout);
  router.get("/api/invoice/:id", required, c.print);
  return router;
};
