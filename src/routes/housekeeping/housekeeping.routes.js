/** Routes housekeeping. Middleware xác thực trước controller; model vẫn kiểm tra quyền ghi. */
const { Router } = require("express"),
  { required } = require("../../core/auth/security");
module.exports = (models) => {
  const router = Router(),
    c = require("../../controllers/housekeeping/housekeeping.controller")(
      models,
    );
  router.get("/app/housekeeping", required, c.index);
  router.post("/api/action/room.clean", required, c.clean);
  router.post("/api/action/room.resolve", required, c.resolve);
  router.post("/api/action/room.urge", required, c.urge);
  router.post(
    "/api/damage",
    required,
    (req, res, next) => {
      require("../../core/auth/rbac").allow(req.user, "clean");
      next();
    },
    require("../../core/http/upload").single("photo"),
    c.damage,
  );
  router.get("/damage-photo/:id", required, c.photo);
  return router;
};
