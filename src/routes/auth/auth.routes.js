/** Route xác thực riêng. */
const { Router } = require("express"),
  { required, loginLimit } = require("../../core/auth/security");
module.exports = (models) => {
  const r = Router(),
    c = require("../../controllers/auth/auth.controller")(models);
  r.get("/login", c.loginPage);
  r.get("/register", c.registerPage);
  r.post("/api/login", loginLimit, c.login);
  r.post("/api/register", loginLimit, c.register);
  r.post("/api/logout", required, c.logout);
  r.post("/api/action/admin.challenge", required, c.challenge);
  r.post("/api/action/admin.transfer", required, c.transfer);
  return r;
};
