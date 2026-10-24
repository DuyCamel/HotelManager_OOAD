/** Routes room-types. Middleware xác thực trước controller; model vẫn kiểm tra quyền ghi. */
const { Router } = require("express"),
  { required } = require("../../core/auth/security");
module.exports = (models) => {
  const router = Router(),
    c = require("../../controllers/room-types/room-types.controller")(models);
  router.get("/app/room-types", required, c.index);
  router.post("/api/action/catalog.save", required, (req, res, next) =>
    req.body.kind === "types" ? c.save(req, res) : next(),
  );

  return router;
};
