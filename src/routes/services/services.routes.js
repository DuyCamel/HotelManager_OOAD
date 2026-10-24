/** Routes services. Middleware xác thực trước controller; model vẫn kiểm tra quyền ghi. */
const { Router } = require("express"),
  { required } = require("../../core/auth/security");
module.exports = (models) => {
  const router = Router(),
    c = require("../../controllers/services/services.controller")(models);
  router.get("/app/services", required, c.index);
  router.post("/api/action/catalog.save", required, (req, res, next) =>
    req.body.kind === "services" ? c.save(req, res) : next(),
  );
  router.post("/api/action/catalog.toggle", required, (req, res, next) =>
    req.body.kind === "services" ? c.toggle(req, res) : next(),
  );
  return router;
};
