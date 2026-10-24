/** Controller housekeeping: nhận HTTP, gọi model, render view. TODO TV3: hoàn thiện task tại docs/MODULES.md. */
const page = require("../../core/http/page"),
  respond = require("../../core/http/respond");
module.exports = (models) => {
  const model = models.housekeeping;
  return {
    async damage(req, res) {
      const fs = require("node:fs/promises"),
        path = require("node:path"),
        { randomUUID } = require("node:crypto"),
        config = require("../../config/env"),
        { ensure } = require("../../core/errors/AppError");
      const f = req.file;
      ensure(f, "Chọn ảnh hiện trạng.");
      const png = f.buffer
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
        jpg = f.buffer[0] === 255 && f.buffer[1] === 216 && f.buffer[2] === 255;
      ensure(png || jpg, "Chỉ nhận ảnh PNG/JPEG hợp lệ.");
      const file = "data/uploads/" + randomUUID() + "." + (png ? "png" : "jpg");
      await fs.mkdir(path.join(config.root, "data/uploads"), {
        recursive: true,
      });
      await fs.writeFile(path.join(config.root, file), f.buffer, {
        mode: 0o600,
      });
      try {
        res.json(
          await model.damage(req.user, { ...req.body, photoPath: file }),
        );
      } catch (e) {
        await fs.unlink(path.join(config.root, file));
        throw e;
      }
    },
    async photo(req, res) {
      const { allow } = require("../../core/auth/rbac"),
        { ensure } = require("../../core/errors/AppError"),
        path = require("node:path"),
        config = require("../../config/env");
      allow(req.user, "board");
      const d = await models.workspace.workspace(req.user),
        row = d.damages?.find((x) => x.id === req.params.id);
      ensure(
        row && /^data\/uploads\/[a-f0-9-]+\.(png|jpg)$/.test(row.photoPath),
        "Không có ảnh hiện trạng.",
        404,
      );
      res.sendFile(path.join(config.root, row.photoPath));
    },
    index: page("housekeeping/index", "board", "board", { catalogKind: null }),
    async clean(req, res) {
      await respond(req, res, () => model.clean(req.user, req.body));
    },
  };
};
