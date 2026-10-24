/** Chỉ cấu hình multipart. Kiểm tra chữ ký/tên tệp do controller thực hiện. */
const multer = require("multer");
module.exports = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
});
