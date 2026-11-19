/** Đăng nhập, đăng ký và chuyển quyền Quản lý. TODO TV1 A1/A4: giữ provider demo rõ ràng. */
const respond = require("../../core/http/respond");
const config = require("../../config/env");
const safeNext = (value) => {
  const next = String(value || "");
  return /^\/(app|portal)(\/|$)/.test(next) ? next : "";
};
module.exports = (models) => ({
  loginPage(req, res) {
    if (req.user) return res.redirect("/app");
    res.render("auth/login", { nextPath: safeNext(req.query.next) });
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
    if (req.session.cookie) {
      req.session.cookie.maxAge =
        u.role === "CUSTOMER"
          ? config.sessionHours * 3600000
          : 365 * 24 * 3600000;
    }
    res.json({
      redirect:
        (u.role === "CUSTOMER" && safeNext(req.body.next)) ||
        (u.role === "CUSTOMER" ? "/portal" : "/app"),
    });
  },
  async register(req, res) {
    res.json(await models.auth.register(req.body));
  },
  async forgotPassword(req, res) {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Vui lòng nhập địa chỉ email hợp lệ" });
    }
    res.json({
      ok: true,
      message: "Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi qua email.",
      email,
    });
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
