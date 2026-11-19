/** Controller rooms: nhận HTTP, gọi model, render view. TODO TV3: hoàn thiện task tại docs/MODULES.md. */
const fs = require("node:fs/promises"),
  path = require("node:path"),
  { randomBytes } = require("node:crypto"),
  config = require("../../config/env"),
  { allow } = require("../../core/auth/rbac"),
  { ensure } = require("../../core/errors/AppError"),
  page = require("../../core/http/page"),
  respond = require("../../core/http/respond");

function detectImageExtension(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return "";
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  )
    return "png";
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)
    return "jpg";
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  )
    return "gif";
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  )
    return "webp";
  return "";
}

module.exports = (models) => {
  const model = models.rooms;
  return {
    index: page("rooms/index", "catalog", "catalog", { catalogKind: "rooms" }),
    async save(req, res) {
      await respond(req, res, () => model.save(req.user, req.body));
    },
    async bulkEdit(req, res) {
      await respond(req, res, () => model.bulkEdit(req.user, req.body));
    },
    async toggle(req, res) {
      await respond(req, res, () => model.toggle(req.user, req.body));
    },
    async uploadImage(req, res) {
      await respond(req, res, async () => {
        allow(req.user, "catalog");
        ensure(req.file?.buffer, "Vui lòng chọn tệp ảnh để tải lên.");
        const ext = detectImageExtension(req.file.buffer);
        ensure(ext, "Chỉ hỗ trợ tệp ảnh PNG, JPG, WEBP hoặc GIF hợp lệ.");
        const dir = path.join(config.root, "src/public/uploads/rooms");
        await fs.mkdir(dir, { recursive: true });
        const name = `room-${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
        await fs.writeFile(path.join(dir, name), req.file.buffer);
        return { url: `/assets/uploads/rooms/${name}` };
      });
    },
  };
};
