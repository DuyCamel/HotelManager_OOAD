/**
 * TASK-BAN-GIAO (TODO) | Phụ trách: TV1 | Mã việc: A1
 * Đây là việc còn lại/nghiệm thu, không phải mô tả tính năng đã hoàn tất.
 * Nghiệm thu tài khoản seed/tài khoản mới/đổi mật khẩu dùng cùng định dạng hash; không ghi mật khẩu/hash ra API/log.
 * File đã có PBKDF2 và salt ngẫu nhiên: không viết lại hoặc đổi định dạng nếu không có kế hoạch chuyển dữ liệu.
 * Chi tiết, phụ thuộc và tiêu chí xong: docs/PHAN_CONG_3_NGUOI.md.
 */
/** PBKDF2 SHA-256, 120000 vòng; tương thích hash SQL mẫu, salt ngẫu nhiên cho tài khoản mới. */
const { randomBytes, pbkdf2, timingSafeEqual } = require("node:crypto");
const { promisify } = require("node:util");
const derive = promisify(pbkdf2);
async function hash(password) {
  const salt = randomBytes(16);
  const key = await derive(password, salt, 120000, 32, "sha256");
  return salt.toString("base64") + ":" + key.toString("base64");
}
async function verify(password, encoded) {
  if (typeof password !== "string" || typeof encoded !== "string") return false;
  try {
    // SQL/demo and application accounts must share exactly salt:hash Base64.
    const parts = encoded.split(":");
    if (parts.length !== 2) return false;
    const [saltText, hashText] = parts;
    const validBase64 = (value) =>
      /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value);
    if (!validBase64(saltText) || !validBase64(hashText)) return false;
    const salt = Buffer.from(saltText, "base64");
    const expected = Buffer.from(hashText, "base64");
    if (salt.length !== 16 || expected.length !== 32) return false;
    if (salt.toString("base64") !== saltText || expected.toString("base64") !== hashText)
      return false;
    const actual = await derive(password, salt, 120000, 32, "sha256");
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
module.exports = { hash, verify };
