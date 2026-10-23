/** CSRF, kiểm tra tài khoản ở mỗi request và giới hạn lần đăng nhập trong cửa sổ 15 phút. */
const { randomBytes, timingSafeEqual } = require("node:crypto");
const { ensure } = require("../shared/errors");
exports.csrf = (req, res, next) => {
  req.session.csrf ||= randomBytes(32).toString("hex");
  res.locals.csrf = req.session.csrf;
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const t = req.get("X-CSRF-Token") || req.body?._csrf;
    const a = Buffer.from(String(t || "")),
      b = Buffer.from(req.session.csrf);
    if (a.length !== b.length || !timingSafeEqual(a, b))
      return res
        .status(403)
        .json({ error: "Phiên biểu mẫu hết hạn. Tải lại trang." });
  }
  next();
};
exports.auth = (repo) => async (req, res, next) => {
  try {
    if (req.session.user) {
      const u = await repo.find("accounts", req.session.user.id);
      if (
        !u?.isActive ||
        u.authVersion !== req.session.user.authVersion ||
        req.session.epoch !== global.hotelEpoch
      ) {
        delete req.session.user;
      } else req.user = u;
    }
    res.locals.user = req.user;
    next();
  } catch (e) {
    next(e);
  }
};
exports.required = (req, res, next) => {
  if (req.user) return next();
  if (req.path.startsWith("/api/"))
    return res.status(401).json({ error: "Vui lòng đăng nhập." });
  res.redirect("/login");
};
const limits = new Map();
setInterval(() => {
  for (const [k, v] of limits) if (v.until < Date.now()) limits.delete(k);
}, 60000).unref();
exports.loginLimit = (req, res, next) => {
  const key = req.ip;
  let row = limits.get(key);
  if (!row || row.until < Date.now())
    limits.set(key, (row = { n: 0, until: Date.now() + 900000 }));
  if (++row.n > 30)
    return res
      .status(429)
      .json({ error: "Quá nhiều yêu cầu. Thử lại sau 15 phút." });
  next();
};
