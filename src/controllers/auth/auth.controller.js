/** Đăng nhập, đăng ký và chuyển Admin. TODO TV1 A1/A4: giữ provider demo rõ ràng. */
const respond = require("../../core/http/respond");
module.exports = (models) => ({
  loginPage(req, res) {
    res.render("auth/login");
  },
  registerPage(req, res) {
    res.render("auth/register");
  },
  async login(req, res) {
    const u = await models.auth.login(req.body);
    await new Promise((resolve, reject) =>
      req.session.regenerate((e) => (e ? reject(e) : resolve())),
    );
    req.session.user = { id: u.id, authVersion: u.authVersion };
    req.session.epoch = global.hotelEpoch;
    res.json({ redirect: u.role === "CUSTOMER" ? "/portal" : "/app" });
  },
  async register(req, res) {
    res.json(await models.auth.register(req.body));
  },
  async logout(req, res) {
    await new Promise((resolve, reject) =>
      req.session.destroy((e) => (e ? reject(e) : resolve())),
    );
    res.json({ redirect: "/login" });
  },
  async challenge(req, res) {
    res.json(await models.auth.challenge(req.user, req.sessionID, req.body));
  },
  async transfer(req, res) {
    await respond(
      req,
      res,
      () => models.auth.transfer(req.user, req.sessionID, req.body),
      { transfer: true },
    );
  },
});
