/**
 * TASK-BAN-GIAO (TODO) | Phụ trách: TV2 | Mã việc: B1, B4, A2
 * Đây là việc còn lại/nghiệm thu, không phải mô tả tính năng đã hoàn tất.
 * Chuẩn hóa kiểm tra ngày thật/same-day/biên thời gian cho API chỉ chọn ngày; giữ password() không trim.
 * Thống nhất độ dài/giới hạn trường giữa UI/service/SQL với TV1 và TV3; không rút ngắn địa chỉ từ 512 thành 250.
 * Chi tiết, phụ thuộc và tiêu chí xong: docs/PHAN_CONG_3_NGUOI.md.
 */
/** Kiểm tra đầu vào dùng chung; tiền là số nguyên đồng và thời gian truyền ISO UTC. */
const { ensure } = require("../errors/AppError");
const { randomUUID } = require("node:crypto");
const text = (v, label, max = 200) => {
  ensure(
    typeof v === "string" && v.trim().length > 0 && v.trim().length <= max,
    `${label} bắt buộc và tối đa ${max} ký tự.`,
  );
  return v.trim();
};
const email = (v) => {
  v = text(v, "Email", 254).toLowerCase();
  ensure(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Email không hợp lệ.");
  return v;
};
const phone = (v) => {
  v = text(v, "Số điện thoại", 15);
  ensure(
    /^0[0-9]{9}$/.test(v),
    "Số điện thoại không hợp lệ. Phải gồm 10 chữ số và bắt đầu bằng số 0.",
  );
  return v;
};
const number = (v, label, min = 0, max = 1e12) => {
  const n = Number(v);
  ensure(
    v !== "" &&
      v !== null &&
      v !== undefined &&
      Number.isSafeInteger(n) &&
      n >= min &&
      n <= max,
    `${label} phải là số nguyên từ ${min} đến ${max}.`,
  );
  return n;
};
const date = (v, label) => {
  ensure(typeof v === "string" && v.length > 0, `${label} bắt buộc.`);
  const d = new Date(v);
  ensure(Number.isFinite(d.getTime()), `${label} không hợp lệ.`);
  return d.toISOString();
};
const calendarDate = (v, label) => {
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(v || "")
    ? new Date(`${v}T00:00:00Z`)
    : null;
  ensure(
    typeof v === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(v) &&
      parsed &&
      parsed.toISOString().slice(0, 10) === v,
    `${label} không hợp lệ.`,
  );
  return v;
};
const id = (prefix) =>
  prefix + randomUUID().replaceAll("-", "").slice(0, 14).toUpperCase();
const overlap = (a, b, c, d) =>
  new Date(a) < new Date(d) && new Date(c) < new Date(b);
const safeAccount = (a) =>
  a
    ? {
        id: a.id,
        email: a.email,
        name: a.name,
        phone: a.phone,
        role: a.role,
        isActive: a.isActive,
      }
    : null;
module.exports = { text, email, phone, number, date, id, overlap, safeAccount };
module.exports.calendarDate = calendarDate;

// Mật khẩu không trim: khoảng trắng là một phần bí mật ở mọi luồng.
module.exports.password = (value) => {
  ensure(
    typeof value === "string" && value.length > 0 && value.length <= 200,
    "Mật khẩu phải dài 1–200 ký tự.",
  );
  return value;
};
