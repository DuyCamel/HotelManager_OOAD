/** Lắp Express, session, CSRF, router và lỗi; khởi động nằm tại server.js. */
const express = require("express"),
  session = require("express-session"),
  helmet = require("helmet"),
  path = require("node:path");
const config = require("./config/env");
const security = require("./middleware/security");
module.exports = (repo, services) => {
  const app = express();
  if (config.production)
    throw new Error(
      "Bản đồ án local: cần triển khai session store dùng chung và SMS thật trước khi bật production.",
    );
  global.hotelEpoch = Date.now();
  app.disable("x-powered-by");
  app.locals.config = config;
  if (config.trustProxy) app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", "data:"],
          upgradeInsecureRequests: null,
        },
      },
    }),
  );
  app.set("views", path.join(config.root, "frontend/views"));
  app.set("view engine", "ejs");
  app.use("/assets", express.static(path.join(config.root, "frontend/public")));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));
  app.use(
    session({
      name: "hotel.sid",
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: config.production,
        maxAge: config.sessionHours * 3600000,
      },
    }),
  );
  app.use(security.csrf);
  app.use(security.auth(repo));
  app.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  app.use(require("./routes/webRoutes")(services));
  app.use((req, res) =>
    req.path.startsWith("/api/")
      ? res.status(404).json({ error: "Không có API này." })
      : res.status(404).render("error", { message: "Trang không tồn tại." }),
  );
  app.use((err, req, res, next) => {
    const status = err.status || 400;
    const message = err.status
      ? err.message
      : "Không thể thực hiện. Kiểm tra dữ liệu và kết nối database.";
    if (!err.status) console.error(err.name, err.number || "", err.message);
    req.path.startsWith("/api/")
      ? res.status(status).json({ error: message })
      : res.status(status).render("error", { message });
  });
  return app;
};
