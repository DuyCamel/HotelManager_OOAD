/** Routes memberships. Middleware xác thực trước controller; model vẫn kiểm tra quyền ghi. */
const { Router } = require("express"),
  { required } = require("../../core/auth/security");
module.exports = (models) => {
  const router = Router(),
    c = require("../../controllers/memberships/memberships.controller")(models);
  router.get("/app/memberships", required, c.index);
  router.get("/api/memberships/data", required, c.data);
  router.post("/api/action/card.issue", required, c.issueCard);
  router.post("/api/action/card.disable", required, c.disableCard);
  router.post("/api/action/card.requestDisable", required, c.requestDisable);
  router.post("/api/action/card.approveDisable", required, c.approveDisable);
  router.post("/api/action/card.rejectDisable", required, c.rejectDisable);
  router.post("/api/action/card.reactivate", required, c.reactivateCard);
  return router;
};
