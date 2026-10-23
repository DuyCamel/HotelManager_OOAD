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
  try {
    const [s, h] = encoded.split(":");
    const expected = Buffer.from(h, "base64");
    const actual = await derive(
      password,
      Buffer.from(s, "base64"),
      120000,
      32,
      "sha256",
    );
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  } catch {
    return false;
  }
}
module.exports = { hash, verify };
