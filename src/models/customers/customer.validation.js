const v = require("../../core/validation/fields");
const { ensure } = require("../../core/errors/AppError");

const limits = Object.freeze({
  name: 120,
  phone: 15,
  identityNo: 30,
  address: 512,
});

function optionalText(value, label, max, emptyValue) {
  if (value === null || value === undefined) return emptyValue;
  ensure(typeof value === "string", `${label} không hợp lệ.`);
  const normalized = value.trim();
  if (!normalized) return emptyValue;
  ensure(
    normalized.length <= max,
    `${label} tối đa ${max} ký tự.`,
  );
  return normalized;
}

function contact(body) {
  return {
    name: v.text(body.name, "Họ tên", limits.name),
    phone: v.phone(body.phone),
  };
}

function profile(body, current = {}) {
  const has = (key) => Object.prototype.hasOwnProperty.call(body, key);
  return {
    ...contact(body),
    identityNo: optionalText(
      has("identityNo") ? body.identityNo : current.identityNo,
      "CCCD/Hộ chiếu",
      limits.identityNo,
      null,
    ),
    address: optionalText(
      has("address") ? body.address : current.address,
      "Địa chỉ",
      limits.address,
      "",
    ),
  };
}

const identityKey = (value) =>
  String(value || "")
    .trim()
    .toLocaleUpperCase("vi-VN");

module.exports = { contact, profile, identityKey, limits };
