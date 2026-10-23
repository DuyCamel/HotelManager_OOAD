/** Tuyến HTML và JSON. Phân quyền nghiệp vụ được kiểm tra thêm trong service. */
const express = require("express");
const { required, loginLimit } = require("../middleware/security");
const { ensure } = require("../shared/errors");
const { has, labels } = require("../shared/permissions");
const config = require("../config/env");
module.exports = (s) => {
  const router = express.Router(),
    api = require("../controllers/apiController")(s);
  router.get("/", async (req, res) =>
    res.render("public", { data: await s.read.public(), config }),
  );
  router.get(["/login", "/register"], (req, res) =>
    res.render("auth", { register: req.path === "/register", config }),
  );
  router.get("/api/availability", async (req, res) =>
    res.json(await s.booking.available(req.query)),
  );
  router.post("/api/login", loginLimit, api.login);
  router.post("/api/register", loginLimit, api.register);
  router.post("/api/logout", required, api.logout);
  router.get(["/app", "/portal"], required, (req, res) =>
    res.render("workspace", {
      config,
      labels,
      user: req.user,
      has: (p) => has(req.user, p),
    }),
  );
  router.get("/api/data", required, api.data);
  router.post("/api/action/:command", required, api.command);
  // Ảnh hư hỏng: giới hạn quyền, kích thước và chữ ký file; tên do máy chủ sinh.
  const multer = require("multer"),
    fs = require("node:fs/promises"),
    path = require("node:path"),
    { randomUUID } = require("node:crypto");
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 3 * 1024 * 1024, files: 1 },
  });
  router.post(
    "/api/damage",
    required,
    (req, res, next) => {
      ensure(has(req.user, "clean"), "Không có quyền.", 403);
      next();
    },
    upload.single("photo"),
    async (req, res) => {
      const f = req.file;
      ensure(f, "Chọn ảnh hiện trạng.");
      const png = f.buffer
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      const jpg =
        f.buffer[0] === 255 && f.buffer[1] === 216 && f.buffer[2] === 255;
      ensure(png || jpg, "Chỉ nhận ảnh PNG/JPEG có chữ ký hợp lệ.");
      const file = "data/uploads/" + randomUUID() + "." + (png ? "png" : "jpg");
      await fs.mkdir(path.join(config.root, "data/uploads"), {
        recursive: true,
      });
      await fs.writeFile(path.join(config.root, file), f.buffer, {
        mode: 0o600,
      });
      try {
        res.json(
          await s.housekeeping.damage(req.user, {
            ...req.body,
            photoPath: file,
          }),
        );
      } catch (e) {
        await fs.unlink(path.join(config.root, file));
        throw e;
      }
    },
  );
  router.get("/damage-photo/:id", required, async (req, res) => {
    ensure(has(req.user, "board"), "Không có quyền.", 403);
    const data = await s.read.workspace(req.user);
    const row = data.damages?.find((x) => x.id === req.params.id);
    ensure(
      row && /^data\/uploads\/[a-f0-9-]+\.(png|jpg)$/.test(row.photoPath),
      "Không có ảnh hiện trạng.",
      404,
    );
    res.sendFile(path.join(config.root, row.photoPath));
  });
  router.get("/api/invoice/:id", required, async (req, res) => {
    const data = await s.read.workspace(req.user);
    const invoice = data.invoices?.find((x) => x.id === req.params.id);
    ensure(invoice, "Không tìm thấy hóa đơn.", 404);
    res.render("invoice", {
      invoice,
      lines: data.lines.filter((l) => l.invoiceId === invoice.id),
      customer: data.customers.find((c) => c.id === invoice.customerId),
      hotel: data.settings[0],
    });
  });
  return router;
};
