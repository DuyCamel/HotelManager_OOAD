const { ensure } = require("../../core/errors/AppError");

function optionalText(value, label, max, singleLine = false) {
  const text = String(value || "").trim();
  ensure(text.length <= max, `${label} tối đa ${max} ký tự.`);
  return singleLine ? text.replace(/\s+/g, " ") : text;
}

function imageUrl(value, label = "URL ảnh") {
  const text = String(value || "").trim();
  if (!text) return "";
  ensure(text.length <= 300, `${label} tối đa 300 ký tự.`);
  if (text.startsWith("/") && !text.startsWith("//") && !text.includes("\\"))
    return text;
  let parsed;
  try {
    parsed = new URL(text);
  } catch {
    ensure(false, `${label} không hợp lệ.`);
  }
  ensure(
    parsed.protocol === "https:" && !parsed.username && !parsed.password,
    `${label} phải dùng HTTPS hoặc đường dẫn nội bộ bắt đầu bằng /.`,
  );
  return parsed.href;
}

function galleryUrls(value) {
  let values = value;
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) values = [];
    else if (text.startsWith("[")) {
      try {
        values = JSON.parse(text);
      } catch {
        ensure(false, "Bộ sưu tập ảnh không hợp lệ.");
      }
    } else values = text.split(/\r?\n/);
  }
  ensure(Array.isArray(values), "Bộ sưu tập ảnh không hợp lệ.");
  const urls = [];
  for (const value of values) {
    const url = imageUrl(value, "URL ảnh bộ sưu tập");
    if (url) urls.push(url);
  }
  ensure(urls.length <= 4, "Mỗi phòng có tối đa 4 ảnh trong bộ sưu tập.");
  return urls;
}

function parseDetails(value = {}) {
  let images = [];
  try {
    images = value.imageGalleryJson ? JSON.parse(value.imageGalleryJson) : [];
  } catch {}
  return {
    note: String(value.note || ""),
    viewName: String(value.viewName || ""),
    amenities: String(value.amenities || ""),
    galleryUrls: Array.isArray(images)
      ? images.filter((item) => typeof item === "string")
      : [],
  };
}

function buildDetails(body) {
  const note = optionalText(body.note, "Ghi chú", 1000);
  const viewName = optionalText(body.viewName, "Hướng nhìn", 100, true);
  const amenities = optionalText(body.amenities, "Tiện nghi riêng", 1000);
  const images = galleryUrls(body.galleryUrls);
  const imageGalleryJson = images.length ? JSON.stringify(images) : null;
  ensure(
    !imageGalleryJson || imageGalleryJson.length <= 2000,
    "Bộ sưu tập ảnh vượt quá dung lượng lưu trữ.",
  );
  return { note, viewName, amenities, galleryUrls: images, imageGalleryJson };
}

module.exports = {
  buildDetails,
  galleryUrls,
  imageUrl,
  optionalText,
  parseDetails,
};
