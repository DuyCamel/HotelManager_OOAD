/**
 * TASK-BAN-GIAO (TODO) | Phụ trách: TV1 | Mã việc: A6
 * Đây là việc còn lại/nghiệm thu, không phải mô tả tính năng đã hoàn tất.
 * Ghép route/session/error sau khi các module hoàn thiện; xử lý lỗi upload/JSON theo thông báo an toàn, không lộ stack hoặc secret.
 * Production hiện bị chặn có chủ ý: chỉ mở sau session store và OTP thật; không tính đây là lỗi phải bỏ chặn cho demo.
 * Chi tiết, phụ thuộc và tiêu chí xong: docs/PHAN_CONG_3_NGUOI.md.
 */
/** Lắp Express, session, CSRF, router và lỗi; khởi động nằm tại server.js. */
const express = require("express"),
  session = require("express-session"),
  helmet = require("helmet"),
  path = require("node:path");
const config = require("./config/env");
const security = require("./core/auth/security");
const { AppError } = require("./core/errors/AppError");
module.exports = (repo, models) => {
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
          imgSrc: ["'self'", "data:", "https:"],
          upgradeInsecureRequests: null,
        },
      },
    }),
  );
  app.set("views", path.join(config.root, "src/views"));
  app.set("view engine", "ejs");
  app.use("/assets", express.static(path.join(config.root, "src/public")));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));
  // SePay authenticates with its API key, not a browser session/CSRF token.
  app.use(require("./routes/payments/sepay.routes")(models));
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
  app.use(require("./core/locals"));
  app.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  app.use(require("./routes")(models));
  app.use((req, res) =>
    req.path.startsWith("/api/")
      ? res.status(404).json({ error: "Không có API này." })
      : res
          .status(404)
          .render("errors/index", { message: "Trang không tồn tại." }),
  );
  app.use((err, req, res, next) => {
    const reportedStatus = Number(err.status || err.statusCode);
    const unavailable = err instanceof AppError && reportedStatus === 503;
    const status =
      err.code === "LIMIT_FILE_SIZE"
        ? 413
        : unavailable || (reportedStatus >= 400 && reportedStatus < 500)
          ? reportedStatus
          : 500;
    const message =
      status === 413
        ? "Tệp tải lên vượt quá dung lượng cho phép."
        : status < 500 || unavailable
          ? err.message
          : "Không thể thực hiện. Vui lòng thử lại hoặc liên hệ quản trị viên.";
    if (status >= 500)
      console.error(err.name, err.number || err.code || "", err.message);
    req.path.startsWith("/api/")
      ? res.status(status).json({ error: message })
      : res.status(status).render("errors/index", { message });
  });
  return app;
};
