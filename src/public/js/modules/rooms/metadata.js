const DEFAULT_GALLERY_POOL = [
  "/assets/img/room-single.jpg",
  "/assets/img/room-double.jpg",
  "/assets/img/room-vip.jpg",
  "/assets/img/banner-suite.jpg",
  "/assets/img/banner-pool.jpg",
];

const TYPE_PRIMARY_IMAGE = {
  LP01: "/assets/img/room-single.jpg",
  DON: "/assets/img/room-single.jpg",
  STD: "/assets/img/room-single.jpg",
  LP02: "/assets/img/room-double.jpg",
  DOI: "/assets/img/room-double.jpg",
  SUP: "/assets/img/room-double.jpg",
  LP03: "/assets/img/room-vip.jpg",
  VIP: "/assets/img/room-vip.jpg",
  DLX: "/assets/img/room-vip.jpg",
};

export function roomDetails(value = {}) {
  let galleryUrls = [];
  try {
    galleryUrls = value.imageGalleryJson ? JSON.parse(value.imageGalleryJson) : [];
  } catch {}
  return {
    note: String(value.note || ""),
    viewName: String(value.viewName || ""),
    amenities: String(value.amenities || ""),
    galleryUrls: Array.isArray(galleryUrls)
      ? galleryUrls.filter((url) => typeof url === "string")
      : [],
  };
}

export function safeImageUrl(value) {
  const text = String(value || "").trim();
  if (text.startsWith("/") && !text.startsWith("//") && !text.includes("\\"))
    return text;
  try {
    const parsed = new URL(text);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password
      ? parsed.href
      : "";
  } catch {
    return "";
  }
}

export function galleryFromInput(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map(safeImageUrl)
    .filter(Boolean)
    .slice(0, 4);
}

export function defaultRoomImages(typeId) {
  const primary = TYPE_PRIMARY_IMAGE[typeId] || DEFAULT_GALLERY_POOL[0];
  return [
    primary,
    ...DEFAULT_GALLERY_POOL.filter((url) => url !== primary),
  ].slice(0, 5);
}

export function effectiveRoomImages(room = {}) {
  const details = roomDetails(room);
  const saved = [
    safeImageUrl(room.imagePath),
    ...details.galleryUrls.map(safeImageUrl),
  ].filter(Boolean);
  const defaults = defaultRoomImages(room.typeId);
  const combined = [...saved];
  for (const url of defaults) {
    if (combined.length >= 5) break;
    if (!combined.includes(url)) combined.push(url);
  }
  while (combined.length < 5) {
    combined.push(defaults[combined.length % defaults.length]);
  }
  return combined.slice(0, 5);
}
