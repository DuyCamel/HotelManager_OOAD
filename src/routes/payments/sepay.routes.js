module.exports = (models) => {
  const router = require("express").Router();
  router.post("/api/webhooks/sepay", require("../../controllers/payments/payments.controller")(models).webhook);
  return router;
};
