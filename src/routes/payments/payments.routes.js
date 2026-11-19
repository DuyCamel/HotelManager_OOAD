const { Router } = require("express");
const { required } = require("../../core/auth/security");
module.exports = (models) => {
  const router = Router();
  const controller = require("../../controllers/payments/payments.controller")(models);
  router.post("/api/action/payments.create", required, controller.create);
  router.get("/api/payments/:id", required, controller.status);
  return router;
};
