/** Routes memberships. Middleware xác thực trước controller; model vẫn kiểm tra quyền ghi. */
const { Router } = require("express"),
  { required } = require("../../core/auth/security");
module.exports = (models) => {
  const router = Router(),
    c = require("../../controllers/memberships/memberships.controller")(models);
  router.get("/app/memberships", required, c.index);
  router.post("/api/action/card.issue", required, c.issueCard);
  router.post("/api/action/card.disable", required, c.disableCard);
  return router;
};
