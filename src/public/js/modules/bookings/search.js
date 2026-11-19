/** Public carousel and the customer-safe room search/booking experience. */
import { defaultDeposit, openDeposit } from "../../core/payments.js";

const SEARCH_STORAGE_KEY = "aurora.customer-search";
const ROOM_IMAGES = [
  "/assets/img/room-single.jpg",
  "/assets/img/room-double.jpg",
  "/assets/img/room-vip.jpg",
];
const TYPE_DEFAULT_IMAGE = {
  LP01: "/assets/img/room-single.jpg",
  LP02: "/assets/img/room-double.jpg",
  LP03: "/assets/img/room-vip.jpg",
  DON: "/assets/img/room-single.jpg",
  DOI: "/assets/img/room-double.jpg",
  VIP: "/assets/img/room-vip.jpg",
  STD: "/assets/img/room-single.jpg",
  SUP: "/assets/img/room-double.jpg",
  DLX: "/assets/img/room-vip.jpg",
};
const STATUS_LABELS = {
  PENDING: "Đang giữ chỗ",
  CONFIRMED: "Đã xác nhận cọc",
  CHECKED_IN: "Đang lưu trú",
  COMPLETED: "Đã hoàn tất",
  CANCELLED: "Đã hủy / hết hạn",
};
const ROOM_VIEWS = {
  STD: "Vườn nhiệt đới",
  SUP: "Thành phố",
  DLX: "Chân trời",
  TWN: "Phố yên tĩnh",
  FAM: "Vườn nội khu",
  STE: "Toàn cảnh thành phố",
};

function getMemberTier(context) {
  const card = (context.d?.cards || []).find((c) => c.isActive);
  if (!card) return null;
  const pts = Math.max(0, Math.floor(Number(card.points || 0)));
  let tier = { code: "MEMBER", name: "Thành viên", percent: 0, points: pts, cardId: card.id };
  if (pts >= 1000) tier = { code: "DIAMOND", name: "Kim cương", percent: 15, points: pts, cardId: card.id };
  else if (pts >= 500) tier = { code: "GOLD", name: "Vàng", percent: 10, points: pts, cardId: card.id };
  else if (pts >= 100) tier = { code: "SILVER", name: "Bạc", percent: 5, points: pts, cardId: card.id };
  return tier;
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function createButton(text, className) {
  const button = createElement("button", className, text);
  button.type = "button";
  return button;
}

function createLink(text, href, className) {
  const link = createElement("a", className, text);
  link.href = href;
  return link;
}

function localDate(timestamp) {
  const date = new Date(timestamp);
  return new Date(timestamp - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function addDays(date, days) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return localDate(value.getTime());
}

function isCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const parsed = new Date(`${value}T12:00:00`);
  return !Number.isNaN(parsed.valueOf()) && localDate(parsed.valueOf()) === value;
}

function stayNights(startAt, endAt) {
  return Math.max(
    1,
    Math.round(
      (Date.parse(`${endAt}T12:00:00`) - Date.parse(`${startAt}T12:00:00`)) /
        86400000,
    ),
  );
}

function formatCalendarDate(value) {
  if (!value) return "—";
  const str = String(value).trim();
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m && str.length === 10) return `${m[3]}/${m[2]}/${m[1]}`;
  const date = new Date(str);
  if (Number.isNaN(date.valueOf())) return "—";
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).formatToParts(date);
    const p = Object.fromEntries(parts.map((item) => [item.type, item.value]));
    return `${p.day}/${p.month}/${p.year}`;
  } catch {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
}

function parseDMY(str) {
  if (!str) return null;
  const s = String(str).trim();
  const match = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (match) {
    let [, day, month, year] = match;
    if (year.length === 2) year = `20${year}`;
    day = day.padStart(2, "0");
    month = month.padStart(2, "0");
    const iso = `${year}-${month}-${day}`;
    return isCalendarDate(iso) ? iso : null;
  }
  if (isCalendarDate(s)) return s;
  return null;
}

function formatDateTime(value) {
  if (!value) return "—";
  const str = String(value).trim();
  const date = new Date(str);
  if (Number.isNaN(date.valueOf())) return "—";
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(date);
    const p = Object.fromEntries(parts.map((item) => [item.type, item.value]));
    return `${p.hour}:${p.minute} ${p.day}/${p.month}/${p.year}`;
  } catch {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes} ${day}/${month}/${year}`;
  }
}

function hashText(value) {
  return [...String(value || "")].reduce(
    (total, character) => (total * 31 + character.charCodeAt(0)) >>> 0,
    7,
  );
}

function safeImageUrl(value) {
  const candidate = String(value || "").trim().replaceAll("\\", "/");
  if (
    !candidate.includes("..") &&
    /^\/assets\/[a-zA-Z0-9_./-]+\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(
      candidate,
    )
  )
    return candidate;
  try {
    const url = new URL(candidate);
    if (url.protocol === "https:" && !url.username && !url.password)
      return url.href;
  } catch {
    // Invalid catalog URLs use the local illustrated fallback below.
  }
  return null;
}

function galleryImages(room) {
  try {
    const gallery = JSON.parse(room?.imageGalleryJson || "[]");
    return Array.isArray(gallery) ? gallery.map(safeImageUrl).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function safeRoomImage(room, index = 0) {
  const candidate =
    safeImageUrl(room?.imagePath) ||
    galleryImages(room)[0] ||
    TYPE_DEFAULT_IMAGE[room?.type?.id || room?.typeId];
  if (candidate) return candidate;
  return ROOM_IMAGES[(hashText(room?.id) + index) % ROOM_IMAGES.length];
}

function roomView(room) {
  return (
    room?.viewName ||
    ROOM_VIEWS[room?.type?.id || room?.typeId] ||
    ["Thành phố", "Vườn nội khu", "Chân trời"][hashText(room?.id) % 3]
  );
}

function amenitiesOf(room) {
  const amenities = String(room?.amenities || room?.type?.amenities || "")
    .split(/[·,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);
  return amenities.length
    ? amenities
    : ["Wi-Fi tốc độ cao", "Nước suối", "Điều hòa"];
}

const SHARED_SHOWCASE_PHOTOS = [
  [
    "/assets/img/room-single.jpg",
    "Không gian phòng ngủ ấm cúng & ánh sáng tự nhiên",
  ],
  [
    "/assets/img/room-double.jpg",
    "Góc nghỉ dưỡng rộng rãi & bàn trà thư giãn",
  ],
  [
    "/assets/img/room-vip.jpg",
    "Phòng khách Suite sang trọng & nội thất gỗ tự nhiên",
  ],
  [
    "/assets/img/banner-suite.jpg",
    "Tầm nhìn Panorama & ban công đón bình minh",
  ],
  [
    "/assets/img/banner-pool.jpg",
    "Hồ bơi vô cực & khu vực thư giãn ngoài trời",
  ],
  [
    "/assets/img/banner-arrival.jpg",
    "Kiến trúc mặt tiền & sảnh đón khách Aurora",
  ],
];

function roomGalleryEntries(room, index = 0) {
  const primary = safeRoomImage(room, index);
  const custom = galleryImages(room);
  const entries = [];
  const pushSlot = (url, caption) => {
    const clean = safeImageUrl(url);
    if (!clean) return;
    entries.push({ url: clean, caption });
  };
  pushSlot(
    primary,
    `${room?.name || "Phòng Aurora"} · Không gian chính (${roomView(room)})`,
  );
  custom.slice(0, 4).forEach((url, idx) =>
    pushSlot(url, `${room?.name || "Phòng Aurora"} · Góc nhìn chi tiết ${idx + 2}`),
  );
  SHARED_SHOWCASE_PHOTOS.forEach(([url, caption]) => {
    if (entries.length >= 5) return;
    if (!entries.some((item) => item.url === url)) pushSlot(url, caption);
  });
  return entries.slice(0, 5);
}

function roomFloorNumber(room) {
  const fromNote = String(room?.note || "").match(/tầng\s*(\d+)/i);
  if (fromNote) return fromNote[1];
  const fromName = String(room?.name || room?.id || "").match(/([1-9])\d{2}/);
  return fromName ? fromName[1] : "1";
}

function roomFloorLabel(room) {
  return `Tầng ${roomFloorNumber(room)}`;
}

function roomAreaLabel(room) {
  const typeId = room?.type?.id || room?.typeId;
  if (typeId === "LP03" || /vip|suite/i.test(room?.type?.name || ""))
    return "68 m²";
  if (typeId === "LP02" || /đôi|double|twin/i.test(room?.type?.name || ""))
    return "42 m²";
  return "28 m²";
}

function roomBedDescription(room) {
  const beds = Number(room?.type?.beds || 1);
  const typeId = room?.type?.id || room?.typeId;
  if (typeId === "LP03" || /vip|suite/i.test(room?.type?.name || ""))
    return `${beds} giường Super King (2m × 2m) & Sofa Lounge`;
  if (beds >= 2) return `${beds} giường lớn (Queen / Twin cao cấp)`;
  return "1 giường Queen tiêu chuẩn (1m8 × 2m)";
}

function roomStory(room) {
  const typeName = room?.type?.name || "Phòng nghỉ Aurora";
  const view = roomView(room);
  const floor = roomFloorLabel(room);
  return `${room?.name || "Phòng"} thuộc hạng ${typeName} nằm tại ${floor}, sở hữu tầm nhìn ${view.toLowerCase()} thoáng đãng. Không gian được thiết kế theo ngôn ngữ nghỉ dưỡng đương đại của Aurora với hệ cửa kính cách âm hai lớp, chăn ga cotton Ai Cập 400 sợi và ánh sáng ấm dịu giúp bạn tái tạo năng lượng trọn vẹn.`;
}

function fullRoomAmenities(room) {
  const base = amenitiesOf(room);
  const extras = [
    "Wi-Fi 6 tốc độ cao",
    "Điều hòa trung tâm độc lập",
    'Smart TV 4K 55"',
    "Trà & cà phê thủ công miễn phí",
    "Phòng tắm vòi sen mưa nhiệt đới",
    "Áo choàng tắm & máy sấy tóc",
    "Két sắt điện tử trong phòng",
    "Hệ cửa kính cách âm 2 lớp",
  ];
  const merged = [...base];
  for (const item of extras) {
    if (
      !merged.some((existing) => existing.toLowerCase() === item.toLowerCase())
    )
      merged.push(item);
  }
  return merged;
}

function roomImage(room, index, alt) {
  const visual = createElement("div", "room-card-image");
  const image = document.createElement("img");
  image.src = safeRoomImage(room, index);
  image.alt = alt;
  image.loading = "lazy";
  image.decoding = "async";
  image.addEventListener("error", () => {
    visual.classList.add("image-fallback");
    image.removeAttribute("src");
  });
  const view = createElement("span", "room-view-chip", roomView(room));
  const photoCount = createElement(
    "span",
    "room-photo-count-chip",
    `${roomGalleryEntries(room, index).length} ảnh`,
  );
  visual.append(image, view, photoCount);
  return visual;
}

function createField(labelText, input) {
  const label = createElement("label", "", labelText);
  label.append(input);
  return label;
}

function createDateInput(name, value, minimum) {
  const wrap = createElement("div", "custom-date-wrap");
  const textInput = createElement("input", "custom-date-text");
  textInput.type = "text";
  textInput.inputMode = "numeric";
  textInput.placeholder = "dd/mm/yyyy";
  textInput.autocomplete = "off";
  textInput.spellcheck = false;

  const pickerBtn = createElement("button", "custom-date-btn");
  pickerBtn.type = "button";
  pickerBtn.tabIndex = -1;
  pickerBtn.setAttribute("aria-label", "Chọn ngày");
  pickerBtn.innerHTML =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>';

  const nativeInput = document.createElement("input");
  nativeInput.type = "date";
  nativeInput.name = name;
  nativeInput.className = "custom-date-native";
  nativeInput.tabIndex = -1;
  nativeInput.setAttribute("aria-hidden", "true");
  nativeInput.required = true;
  if (minimum) nativeInput.min = minimum;
  if (value) {
    nativeInput.value = value;
    textInput.value = formatCalendarDate(value);
  }

  const nativeDescriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  );
  if (nativeDescriptor) {
    Object.defineProperty(nativeInput, "value", {
      get() {
        return nativeDescriptor.get.call(this);
      },
      set(val) {
        nativeDescriptor.set.call(this, val);
        textInput.value = val ? formatCalendarDate(val) : "";
      },
    });
  }

  const openPicker = () => {
    try {
      if (typeof nativeInput.showPicker === "function") {
        nativeInput.showPicker();
      } else {
        nativeInput.focus();
      }
    } catch {
      nativeInput.focus();
    }
  };

  pickerBtn.addEventListener("click", (e) => {
    e.preventDefault();
    openPicker();
  });

  textInput.addEventListener("click", () => {
    if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) {
      openPicker();
    }
  });

  nativeInput.addEventListener("change", () => {
    textInput.value = nativeInput.value ? formatCalendarDate(nativeInput.value) : "";
  });

  nativeInput.addEventListener("input", () => {
    textInput.value = nativeInput.value ? formatCalendarDate(nativeInput.value) : "";
  });

  const commitTextDate = () => {
    const raw = textInput.value.trim();
    if (!raw) {
      textInput.value = nativeInput.value ? formatCalendarDate(nativeInput.value) : "";
      return;
    }
    const iso = parseDMY(raw);
    if (iso) {
      const prev = nativeInput.value;
      nativeInput.value = iso;
      textInput.value = formatCalendarDate(iso);
      if (prev !== iso) {
        wrap.dispatchEvent(new Event("change", { bubbles: true }));
      }
    } else {
      textInput.value = nativeInput.value ? formatCalendarDate(nativeInput.value) : "";
    }
  };

  textInput.addEventListener("blur", commitTextDate);
  textInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      commitTextDate();
    } else if ((e.altKey && e.key === "ArrowDown") || e.key === "F4") {
      e.preventDefault();
      openPicker();
    }
  });

  wrap.append(textInput, pickerBtn, nativeInput);

  Object.defineProperty(wrap, "value", {
    get() {
      return nativeInput.value;
    },
    set(val) {
      nativeInput.value = val;
    },
  });
  Object.defineProperty(wrap, "min", {
    get() {
      return nativeInput.min;
    },
    set(val) {
      nativeInput.min = val;
    },
  });
  Object.defineProperty(wrap, "max", {
    get() {
      return nativeInput.max;
    },
    set(val) {
      nativeInput.max = val;
    },
  });
  Object.defineProperty(wrap, "name", {
    get() {
      return nativeInput.name;
    },
    set(val) {
      nativeInput.name = val;
    },
  });
  Object.defineProperty(wrap, "required", {
    get() {
      return nativeInput.required;
    },
    set(val) {
      nativeInput.required = Boolean(val);
    },
  });
  Object.defineProperty(wrap, "disabled", {
    get() {
      return nativeInput.disabled;
    },
    set(val) {
      nativeInput.disabled = Boolean(val);
      textInput.disabled = Boolean(val);
      pickerBtn.disabled = Boolean(val);
    },
  });
  wrap.focus = () => textInput.focus();

  return wrap;
}

function readSavedSearch() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SEARCH_STORAGE_KEY) || "null");
    return saved && typeof saved === "object" ? saved : null;
  } catch {
    return null;
  }
}

function initialSearch() {
  const query = new URLSearchParams(location.search);
  const saved = readSavedSearch();
  const today = localDate(Date.now());
  const queryStart = query.get("startAt");
  const queryEnd = query.get("endAt");
  const startAt = isCalendarDate(queryStart)
    ? queryStart
    : isCalendarDate(saved?.startAt) && saved.startAt >= today
      ? saved.startAt
      : addDays(today, 1);
  const endAt = isCalendarDate(queryEnd)
    ? queryEnd
    : isCalendarDate(saved?.endAt)
      ? saved.endAt
      : addDays(startAt, 1);
  const guests = Math.min(
    6,
    Math.max(1, Number(query.get("guests") || saved?.guests || 2) || 2),
  );
  return {
    startAt,
    endAt: endAt > startAt ? endAt : addDays(startAt, 1),
    guests: String(guests),
    shouldSearch: Boolean(
      (isCalendarDate(queryStart) && isCalendarDate(queryEnd)) || saved,
    ),
  };
}

function setCarouselSlide(carousel, nextIndex) {
  const track = carousel.querySelector("[data-carousel-track]");
  const slides = [...carousel.querySelectorAll("[data-carousel-slide]")];
  const dots = [...carousel.querySelectorAll("[data-carousel-dot]")];
  const status = carousel.querySelector("[data-carousel-status]");
  const index = (nextIndex + slides.length) % slides.length;

  track.classList.remove("is-at-0", "is-at-1", "is-at-2");
  track.classList.add(`is-at-${index}`);
  slides.forEach((slide, slideIndex) => {
    const active = slideIndex === index;
    slide.classList.toggle("is-active", active);
    slide.setAttribute("aria-hidden", String(!active));
    slide.tabIndex = active ? 0 : -1;
  });
  dots.forEach((dot, dotIndex) => {
    const active = dotIndex === index;
    dot.classList.toggle("is-active", active);
    if (active) dot.setAttribute("aria-current", "true");
    else dot.removeAttribute("aria-current");
  });
  status.textContent = `Banner ${index + 1} trên ${slides.length}`;
  carousel.dataset.slide = String(index);
  return index;
}

function installCarousel() {
  const carousel = document.querySelector("[data-carousel]");
  if (!carousel) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let current = setCarouselSlide(carousel, 0);
  let timer;
  let paused = false;

  const stop = () => {
    clearInterval(timer);
    timer = undefined;
    carousel.classList.add("is-paused");
  };
  const start = () => {
    stop();
    if (paused || reducedMotion.matches || document.hidden) return;
    carousel.classList.remove("is-paused");
    timer = setInterval(() => {
      current = setCarouselSlide(carousel, current + 1);
    }, 6500);
  };
  const go = (index) => {
    current = setCarouselSlide(carousel, index);
    start();
  };

  carousel
    .querySelector("[data-carousel-prev]")
    .addEventListener("click", () => go(current - 1));
  carousel
    .querySelector("[data-carousel-next]")
    .addEventListener("click", () => go(current + 1));
  carousel.querySelectorAll("[data-carousel-dot]").forEach((dot) => {
    dot.addEventListener("click", () => go(Number(dot.dataset.carouselDot)));
  });
  carousel.addEventListener("mouseenter", () => {
    paused = true;
    stop();
  });
  carousel.addEventListener("mouseleave", () => {
    paused = false;
    start();
  });
  carousel.addEventListener("focusin", () => {
    paused = true;
    stop();
  });
  carousel.addEventListener("focusout", (event) => {
    if (carousel.contains(event.relatedTarget)) return;
    paused = false;
    start();
  });
  document.addEventListener("visibilitychange", start);
  reducedMotion.addEventListener("change", start);
  start();
}

function installHomeReservation() {
  const form = document.querySelector("#home-reservation");
  if (!form) return;
  const today = localDate(Date.now());
  const saved = readSavedSearch();
  const oldStart = form.elements.startAt;
  const oldEnd = form.elements.endAt;
  const message = form.querySelector(".form-message");

  const startValue =
    isCalendarDate(saved?.startAt) && saved.startAt >= today
      ? saved.startAt
      : addDays(today, 1);
  const endValue =
    isCalendarDate(saved?.endAt) && saved.endAt > startValue
      ? saved.endAt
      : addDays(startValue, 1);

  const startInput = createDateInput("startAt", startValue, today);
  const endInput = createDateInput("endAt", endValue, addDays(startValue, 1));
  if (oldStart) oldStart.replaceWith(startInput);
  if (oldEnd) oldEnd.replaceWith(endInput);
  if (saved?.guests && form.elements.guests) form.elements.guests.value = saved.guests;

  startInput.addEventListener("change", () => {
    endInput.min = addDays(startInput.value, 1);
    if (endInput.value <= startInput.value) endInput.value = endInput.min;
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const search = Object.fromEntries(new FormData(form));
    if (search.startAt < today || search.endAt <= search.startAt) {
      message.textContent =
        "Ngày nhận không được ở quá khứ và ngày trả phải sau ngày nhận.";
      return;
    }
    message.textContent = "";
    sessionStorage.setItem(SEARCH_STORAGE_KEY, JSON.stringify(search));
    const target = document.body.dataset.experienceTarget || "/login";
    location.assign(
      target === "/app/search"
        ? `${target}?${new URLSearchParams(search)}`
        : target,
    );
  });
}

function installPublicHome() {
  if (!document.body.classList.contains("public-page")) return;
  installCarousel();
  installHomeReservation();
}

function shortPolicyTime(value, fallback) {
  return /^\d{2}:\d{2}/.test(String(value || ""))
    ? String(value).slice(0, 5)
    : fallback;
}

function createSearchForm(search, context) {
  const form = createElement("form", "customer-search-form");
  form.id = "customer-search-form";
  const today = localDate(Date.now());
  const startInput = createDateInput("startAt", search.startAt, today);
  const endInput = createDateInput(
    "endAt",
    search.endAt,
    addDays(search.startAt, 1),
  );
  const guests = document.createElement("select");
  guests.name = "guests";
  guests.required = true;
  for (let number = 1; number <= 6; number += 1) {
    const option = createElement("option", "", `${number} khách`);
    option.value = String(number);
    option.selected = String(number) === search.guests;
    guests.append(option);
  }
  const submit = createButton("Tìm phòng trống ↗", "primary");
  submit.type = "submit";
  startInput.addEventListener("change", () => {
    endInput.min = addDays(startInput.value, 1);
    if (endInput.value <= startInput.value) endInput.value = endInput.min;
  });
  form.append(
    createField("Ngày nhận phòng", startInput),
    createField(
      `Ngày trả phòng (${shortPolicyTime(context?.d?.settings?.[0]?.checkOutTime, "12:00")})`,
      endInput,
    ),
    createField("Số khách", guests),
    submit,
  );
  return form;
}

function createSelectControl(name, options) {
  const select = document.createElement("select");
  select.name = name;
  options.forEach(([value, label]) => {
    const option = createElement("option", "", label);
    option.value = value;
    select.append(option);
  });
  return select;
}

function createAdvancedFilterPanel() {
  const wrap = createElement("div", "customer-advanced-filters");
  const head = createElement("div", "advanced-filters-head");
  const titleGroup = createElement("div", "advanced-filters-title");
  const badge = createElement("span", "advanced-filters-badge", "Tất cả phòng");
  badge.dataset.filterBadge = "";
  titleGroup.append(
    createElement("strong", "", "Tìm kiếm & Lọc nâng cao"),
    badge,
  );
  const resetBtn = createButton("Đặt lại bộ lọc", "small advanced-reset-btn");
  resetBtn.dataset.filterReset = "";
  resetBtn.hidden = true;
  head.append(titleGroup, resetBtn);

  const grid = createElement("div", "advanced-filters-grid");
  const typeSelect = createSelectControl("filterType", [
    ["", "Tất cả loại phòng"],
    ["LP01", "Phòng đơn"],
    ["LP02", "Phòng đôi"],
    ["LP03", "Phòng VIP / Suite"],
  ]);
  const bedsSelect = createSelectControl("filterBeds", [
    ["", "Tất cả số giường"],
    ["1", "1 giường lớn"],
    ["2", "Từ 2 giường trở lên"],
  ]);
  const viewSelect = createSelectControl("filterView", [
    ["", "Tất cả hướng nhìn"],
    ["Vườn nhiệt đới", "Vườn nhiệt đới"],
    ["Thành phố", "Thành phố"],
    ["Chân trời", "Chân trời"],
    ["Biển", "Hướng biển / Hồ bơi"],
    ["Ban công", "Ban công riêng"],
    ["Yên tĩnh", "Góc yên tĩnh"],
  ]);
  const floorSelect = createSelectControl("filterFloor", [
    ["", "Tất cả các tầng"],
    ["1", "Tầng 1 (Phòng 1xx)"],
    ["2", "Tầng 2 (Phòng 2xx)"],
    ["3", "Tầng 3 (Phòng 3xx)"],
  ]);
  const priceSelect = createSelectControl("filterPrice", [
    ["", "Tất cả mức giá / đêm"],
    ["under-500", "Dưới 500.000 đ / đêm"],
    ["500-900", "500.000 đ – 900.000 đ / đêm"],
    ["over-900", "Trên 900.000 đ / đêm"],
  ]);
  const roomSelect = createSelectControl("filterRoomId", [
    ["", "Chọn nhanh phòng cụ thể (Tất cả)"],
  ]);
  const sortSelect = createSelectControl("filterSort", [
    ["default", "Sắp xếp: Mặc định (Số phòng)"],
    ["price-asc", "Giá: Thấp đến cao"],
    ["price-desc", "Giá: Cao đến thấp"],
    ["capacity-desc", "Sức chứa: Lớn nhất trước"],
  ]);
  const keywordInput = document.createElement("input");
  keywordInput.type = "search";
  keywordInput.name = "filterKeyword";
  keywordInput.placeholder = "Nhập số phòng, view, tiện ích (VD: 207, VIP)...";
  keywordInput.autocomplete = "off";

  grid.append(
    createField("Loại phòng", typeSelect),
    createField("Số giường", bedsSelect),
    createField("Hướng nhìn (View)", viewSelect),
    createField("Tầng lưu trú", floorSelect),
    createField("Khoảng giá / đêm", priceSelect),
    createField("Chọn phòng cụ thể", roomSelect),
    createField("Tìm nhanh theo từ khóa", keywordInput),
    createField("Thứ tự hiển thị", sortSelect),
  );
  wrap.append(head, grid);
  return wrap;
}

function createSearchAtmosphereReel() {
  const reel = createElement("aside", "booking-assurance aurora-live-reel");
  const scenes = [
    {
      image: "/assets/img/banner-pool.jpg",
      tag: "INFINITY POOL · SUNSET",
      title: "Hồ bơi vô cực giữa tầng mây",
      sub: "Đắm mình trong làn nước ấm và ngắm hoàng hôn buông xuống đường chân trời.",
    },
    {
      image: "/assets/img/banner-suite.jpg",
      tag: "MASTER SUITE · PANORAMA",
      title: "Thức giấc cùng bình minh rực rỡ",
      sub: "Ban công riêng thoáng đãng đón trọn ánh nắng sớm và gió biển dịu êm.",
    },
    {
      image: "/assets/img/room-vip.jpg",
      tag: "BESPOKE INTERIORS",
      title: "Tuyệt tác nghỉ dưỡng đương đại",
      sub: "Nội thất gỗ ấm áp, bồn tắm cẩm thạch và hệ thống cách âm hai lớp tuyệt đối.",
    },
    {
      image: "/assets/img/banner-arrival.jpg",
      tag: "AURORA SANCTUARY",
      title: "Ốc đảo bình yên giữa lòng phố",
      sub: "Dịch vụ quản gia 24/7 sẵn sàng chăm chút cho từng khoảnh khắc lưu trú của bạn.",
    },
  ];

  const slidesWrap = createElement("div", "aurora-reel-slides");
  const slideElements = scenes.map((scene, idx) => {
    const slide = createElement(
      "div",
      `aurora-reel-slide${idx === 0 ? " is-active" : ""}`,
    );
    const img = document.createElement("img");
    img.src = scene.image;
    img.alt = scene.title;
    slide.append(img);
    slidesWrap.append(slide);
    return slide;
  });

  const topBadge = createElement("div", "aurora-reel-top");
  const livePill = createElement("span", "aurora-reel-pill");
  livePill.append(
    createElement("i", "aurora-reel-dot"),
    createElement("span", "", "AURORA MOMENTS"),
  );
  const counter = createElement("span", "aurora-reel-count", "01 / 04");
  topBadge.append(livePill, counter);

  const bottomOverlay = createElement("div", "aurora-reel-overlay");
  const tagEl = createElement("span", "aurora-reel-tag", scenes[0].tag);
  const titleEl = createElement("h3", "aurora-reel-title", scenes[0].title);
  const subEl = createElement("p", "aurora-reel-sub", scenes[0].sub);
  const dotsWrap = createElement("div", "aurora-reel-dots");

  let activeIdx = 0;
  const dotButtons = scenes.map((_, idx) => {
    const dot = createElement(
      "button",
      `aurora-reel-dot-btn${idx === 0 ? " is-active" : ""}`,
    );
    dot.type = "button";
    dot.setAttribute("aria-label", `Cảnh ${idx + 1}`);
    dot.addEventListener("click", () => activate(idx));
    dotsWrap.append(dot);
    return dot;
  });

  function activate(nextIdx) {
    activeIdx = (nextIdx + scenes.length) % scenes.length;
    const current = scenes[activeIdx];
    slideElements.forEach((el, i) =>
      el.classList.toggle("is-active", i === activeIdx),
    );
    dotButtons.forEach((el, i) =>
      el.classList.toggle("is-active", i === activeIdx),
    );
    tagEl.textContent = current.tag;
    titleEl.textContent = current.title;
    subEl.textContent = current.sub;
    counter.textContent = `0${activeIdx + 1} / 0${scenes.length}`;
  }

  let intervalId = window.setInterval(() => {
    if (!reel.isConnected) {
      window.clearInterval(intervalId);
      return;
    }
    activate(activeIdx + 1);
  }, 4200);

  reel.addEventListener("mouseenter", () => window.clearInterval(intervalId));
  reel.addEventListener("mouseleave", () => {
    window.clearInterval(intervalId);
    intervalId = window.setInterval(() => {
      if (!reel.isConnected) {
        window.clearInterval(intervalId);
        return;
      }
      activate(activeIdx + 1);
    }, 4200);
  });

  bottomOverlay.append(tagEl, titleEl, subEl, dotsWrap);
  reel.append(slidesWrap, topBadge, bottomOverlay);
  return reel;
}

function createSearchIntro(search, context) {
  const intro = createElement("div", "customer-search-intro");
  const panel = createElement("section", "customer-search-panel");
  panel.append(
    createElement("span", "", "YOUR NEXT AURORA STAY"),
    createElement("h2", "", "Tìm căn phòng hợp với nhịp của bạn."),
    createElement(
      "p",
      "",
      "Giá được tính lại theo đúng ngày lưu trú trước khi bạn xác nhận giữ phòng. Dùng bộ lọc nâng cao bên dưới để chọn đúng hướng nhìn, số giường hoặc căn phòng yêu thích.",
    ),
    createSearchForm(search, context),
    createAdvancedFilterPanel(),
  );
  intro.append(panel, createSearchAtmosphereReel());
  return intro;
}

function createRoomCard(room, index, search, money, openBooking, openDetail) {
  const type = room?.type || {};
  const card = createElement(
    "article",
    "customer-room-card is-interactive-card",
  );
  card.tabIndex = 0;
  card.setAttribute(
    "aria-label",
    `Xem không gian chi tiết ${room.name || "Phòng Aurora"}`,
  );
  const imageWrap = roomImage(
    room,
    index,
    `${room.name || "Phòng"} tại Aurora`,
  );
  card.append(imageWrap);

  const body = createElement("div", "room-card-body");
  const kicker = createElement("div", "room-card-kicker");
  kicker.append(
    createElement("span", "", type.name || "Aurora room"),
    createElement(
      "span",
      "",
      `${type.capacity || "—"} khách · ${type.beds || "—"} giường · ${roomFloorLabel(room)}`,
    ),
  );
  const title = createElement("h3", "", room.name || room.id || "Phòng Aurora");
  const summary = createElement(
    "p",
    "room-card-summary",
    `${stayNights(search.startAt, search.endAt)} đêm · ${formatCalendarDate(search.startAt)} đến ${formatCalendarDate(search.endAt)} · Hướng ${roomView(room).toLowerCase()}`,
  );
  body.append(kicker, title, summary);

  const amenities = createElement("ul", "amenity-list");
  amenitiesOf(room).forEach((amenity) =>
    amenities.append(createElement("li", "", amenity)),
  );
  body.append(amenities);

  const nights = stayNights(search.startAt, search.endAt);
  const nightlyPrice =
    Number(type.nightlyPrice) ||
    Math.round(Number(room.quote || 0) / Math.max(1, nights));
  const price = createElement("div", "room-price-row");
  const priceCopy = createElement("div");
  priceCopy.append(
    createElement(
      "small",
      "",
      `${money(nightlyPrice)} / đêm · Tổng ${nights} đêm`,
    ),
    createElement("strong", "", money(room.quote)),
  );
  const book = createButton("Giữ phòng", "primary");
  book.setAttribute("aria-label", `Giữ ${room.name || "phòng này"}`);
  book.addEventListener("click", (event) => {
    event.stopPropagation();
    openBooking(room, search);
  });
  price.append(priceCopy, book);
  body.append(price);
  card.append(body);

  const handleOpenDetail = (event) => {
    if (event.target.closest("button, a")) return;
    openDetail?.(room, index, search);
  };
  card.addEventListener("click", handleOpenDetail);
  card.addEventListener("keydown", (event) => {
    if (
      (event.key === "Enter" || event.key === " ") &&
      !event.target.closest("button, a")
    ) {
      event.preventDefault();
      openDetail?.(room, index, search);
    }
  });
  return card;
}

function renderRoomShowcasePage(
  context,
  root,
  room,
  index,
  search,
  onBack,
  onBook,
) {
  const { money } = context;
  const type = room?.type || {};
  const photos = roomGalleryEntries(room, index);
  const hasStayQuote = Boolean(
    search?.startAt && search?.endAt && Number(room?.quote) > 0,
  );
  const nights = hasStayQuote ? stayNights(search.startAt, search.endAt) : 1;
  const totalQuote = Number(room?.quote || type?.nightlyPrice || 350000);
  const requiredDeposit = defaultDeposit(totalQuote);

  const showcase = createElement("section", "customer-room-showcase");

  const topBar = createElement("div", "room-showcase-topbar");
  const backBtn = createButton(
    "← Quay lại danh sách phòng",
    "room-showcase-back",
  );
  backBtn.addEventListener("click", onBack);
  const breadcrumb = createElement(
    "div",
    "room-showcase-SingleBreadcrumb",
    `${type.name || "Hạng phòng Aurora"} · ${roomFloorLabel(room)} · Hướng ${roomView(room)}`,
  );
  topBar.append(backBtn, breadcrumb);

  const header = createElement("header", "room-showcase-header");
  const headerCopy = createElement("div");
  headerCopy.append(
    createElement(
      "span",
      "room-showcase-eyebrow",
      `AURORA SIGNATURE SPACE · MÃ PHÒNG ${room.id || "AURORA"}`,
    ),
    createElement("h2", "", `${room.name || room.id} — ${type.name || "Phòng nghỉ Aurora"}`),
  );
  const badges = createElement("div", "room-showcase-badges");
  [
    `Hướng nhìn: ${roomView(room)}`,
    `${type.beds || 1} giường (${roomBedDescription(room)})`,
    `Tối đa ${type.capacity || 2} khách`,
    roomFloorLabel(room),
    `Diện tích ~${roomAreaLabel(room)}`,
  ].forEach((text) =>
    badges.append(createElement("span", "room-spec-pill", text)),
  );
  headerCopy.append(badges);

  const headerAction = createElement("div", "room-showcase-header-cta");
  const headerPrice = createElement("div");
  headerPrice.append(
    createElement(
      "small",
      "",
      hasStayQuote ? `Tổng ${nights} đêm dự kiến` : "Giá niêm yết mỗi đêm",
    ),
    createElement("strong", "", money(totalQuote)),
  );
  headerAction.append(headerPrice);
  if (onBook) {
    const topBookBtn = createButton("Giữ phòng ngay ↗", "primary");
    topBookBtn.addEventListener("click", () => onBook(room, search));
    headerAction.append(topBookBtn);
  }
  header.append(headerCopy, headerAction);

  const gallerySection = createElement("div", "room-showcase-gallery");
  const mainStage = createElement("div", "room-showcase-stage");
  const mainImg = document.createElement("img");
  mainImg.src = photos[0].url;
  mainImg.alt = photos[0].caption;
  const stageCaption = createElement(
    "div",
    "room-showcase-caption",
    photos[0].caption,
  );
  const stageCounter = createElement(
    "span",
    "room-showcase-counter",
    `Ảnh 1 / ${photos.length}`,
  );
  const prevBtn = createButton("‹", "room-gallery-nav is-prev");
  prevBtn.setAttribute("aria-label", "Ảnh trước");
  const nextBtn = createButton("›", "room-gallery-nav is-next");
  nextBtn.setAttribute("aria-label", "Ảnh tiếp theo");
  mainStage.append(mainImg, prevBtn, nextBtn, stageCounter, stageCaption);

  const thumbGrid = createElement("div", "room-showcase-thumbs");
  let activePhotoIdx = 0;
  const thumbButtons = photos.map((photo, idx) => {
    const btn = createElement(
      "button",
      `room-thumb-item${idx === 0 ? " is-active" : ""}`,
    );
    btn.type = "button";
    const img = document.createElement("img");
    img.src = photo.url;
    img.alt = photo.caption;
    img.loading = "lazy";
    const label = createElement("span", "", `Góc ảnh ${idx + 1}`);
    btn.append(img, label);
    btn.addEventListener("click", () => selectPhoto(idx));
    thumbGrid.append(btn);
    return btn;
  });

  function selectPhoto(nextIdx) {
    activePhotoIdx = (nextIdx + photos.length) % photos.length;
    const target = photos[activePhotoIdx];
    mainImg.src = target.url;
    mainImg.alt = target.caption;
    stageCaption.textContent = target.caption;
    stageCounter.textContent = `Ảnh ${activePhotoIdx + 1} / ${photos.length}`;
    thumbButtons.forEach((btn, idx) =>
      btn.classList.toggle("is-active", idx === activePhotoIdx),
    );
  }
  prevBtn.addEventListener("click", () => selectPhoto(activePhotoIdx - 1));
  nextBtn.addEventListener("click", () => selectPhoto(activePhotoIdx + 1));
  gallerySection.append(mainStage, thumbGrid);

  const bodyGrid = createElement("div", "room-showcase-body");
  const detailsCol = createElement("div", "room-showcase-main");

  const storyBlock = createElement("section", "room-showcase-card");
  storyBlock.append(
    createElement("h3", "", "Giới thiệu không gian phòng"),
    createElement("p", "room-showcase-story", roomStory(room)),
  );
  if (room?.note) {
    const noteLine = createElement(
      "p",
      "room-showcase-note",
      `Ghi chú vị trí / vận hành: ${room.note}`,
    );
    storyBlock.append(noteLine);
  }

  const specsBlock = createElement("section", "room-showcase-card");
  specsBlock.append(createElement("h3", "", "Thông tin chi tiết & Cấu hình phòng"));
  const specsGrid = createElement("div", "room-specs-grid");
  [
    ["Tên phòng", room.name || room.id || "—"],
    ["Hạng phòng", type.name || "Aurora Standard"],
    ["Cấu hình giường", roomBedDescription(room)],
    ["Sức chứa tiêu chuẩn", `Tối đa ${type.capacity || 2} người lớn`],
    ["Hướng nhìn (View)", roomView(room)],
    ["Vị trí tầng", roomFloorLabel(room)],
    ["Diện tích không gian", roomAreaLabel(room)],
    [
      "Giờ nhận / trả phòng",
      `Nhận ${shortPolicyTime(context.d.settings?.[0]?.checkInTime, "14:00")} · Trả ${shortPolicyTime(context.d.settings?.[0]?.checkOutTime, "12:00")}`,
    ],
  ].forEach(([label, val]) => {
    const box = createElement("div", "room-spec-box");
    box.append(
      createElement("span", "", label),
      createElement("strong", "", val),
    );
    specsGrid.append(box);
  });
  specsBlock.append(specsGrid);

  const amenityBlock = createElement("section", "room-showcase-card");
  amenityBlock.append(
    createElement("h3", "", "Tiện nghi trong phòng & Đặc quyền lưu trú"),
  );
  const amenityGrid = createElement("ul", "room-showcase-amenities");
  fullRoomAmenities(room).forEach((item) => {
    const li = createElement("li", "");
    li.append(createElement("b", "", "✓"), createElement("span", "", item));
    amenityGrid.append(li);
  });
  amenityBlock.append(amenityGrid);

  detailsCol.append(storyBlock, specsBlock, amenityBlock);

  const bookingSidebar = createElement("aside", "room-showcase-sidebar");
  const bookingCard = createElement("div", "room-showcase-booking-box");
  bookingCard.append(
    createElement("span", "room-showcase-eyebrow", "SUMMARY & INSTANT HOLD"),
    createElement("h3", "", "Tóm tắt kỳ nghỉ & Đặt phòng"),
  );

  const summaryList = createElement("div", "room-showcase-price-list");
  if (hasStayQuote) {
    appendSummaryItem(
      summaryList,
      "Ngày nhận phòng",
      `${shortPolicyTime(context.d.settings?.[0]?.checkInTime, "14:00")} · ${formatCalendarDate(search.startAt)}`,
    );
    appendSummaryItem(
      summaryList,
      "Ngày trả phòng",
      `${shortPolicyTime(context.d.settings?.[0]?.checkOutTime, "12:00")} · ${formatCalendarDate(search.endAt)}`,
    );
    appendSummaryItem(
      summaryList,
      "Thời gian & Số khách",
      `${nights} đêm · ${search.guests} khách`,
    );
  }
  appendSummaryItem(
    summaryList,
    "Đơn giá cơ bản / đêm",
    money(type.nightlyPrice || totalQuote),
  );
  appendSummaryItem(
    summaryList,
    hasStayQuote ? `Tổng tiền phòng (${nights} đêm)` : "Tổng tiền phòng dự kiến",
    money(totalQuote),
  );
  const memberTier = getMemberTier(context);
  const estimatedDiscount = memberTier?.percent
    ? Math.round((totalQuote * memberTier.percent) / 100)
    : 0;

  appendSummaryItem(
    summaryList,
    "Tiền cọc cố định (40%)",
    money(requiredDeposit),
  );
  if (memberTier && memberTier.percent > 0) {
    appendSummaryItem(
      summaryList,
      `Ưu đãi hạng ${memberTier.name} (-${memberTier.percent}% khi trả phòng)`,
      `− ${money(estimatedDiscount)}`,
    );
    appendSummaryItem(
      summaryList,
      "Ước tính thanh toán khi trả phòng",
      money(Math.max(0, totalQuote - requiredDeposit - estimatedDiscount)),
    );
  } else {
    appendSummaryItem(
      summaryList,
      "Thanh toán khi trả phòng (60%)",
      money(Math.max(0, totalQuote - requiredDeposit)),
    );
  }
  bookingCard.append(summaryList);

  const tierNote = memberTier?.percent
    ? ` Quyền lợi thành viên: Hạng ${memberTier.name} sẽ được tự động giảm ${memberTier.percent}% trên toàn bộ hóa đơn (tiền phòng & dịch vụ) khi quý khách làm thủ tục trả phòng tại quầy.`
    : "";
  const policyNote = createElement(
    "p",
    "room-showcase-policy",
    `Giữ phòng online ${context.d.settings?.[0]?.bookingHoldMinutes || 10} phút. Hạn nhận phòng trong ngày: ${shortPolicyTime(context.d.settings?.[0]?.noShowTime, "22:00")}. Mức đặt cọc cố định 40% (${money(requiredDeposit)}) thanh toán qua mã QR SePay tự động xác nhận.${tierNote}`,
  );
  bookingCard.append(policyNote);

  const actionStack = createElement("div", "room-showcase-cta-stack");
  if (onBook) {
    const primaryBook = createButton(
      `Giữ ${room.name || "phòng này"} ngay (Cọc 40%: ${money(requiredDeposit)})`,
      "primary",
    );
    primaryBook.addEventListener("click", () => onBook(room, search));
    actionStack.append(primaryBook);
  }
  const backAction = createButton("← Quay lại xem các phòng khác", "");
  backAction.addEventListener("click", onBack);
  actionStack.append(backAction);
  bookingCard.append(actionStack);
  bookingSidebar.append(bookingCard);

  bodyGrid.append(detailsCol, bookingSidebar);
  showcase.append(topBar, header, gallerySection, bodyGrid);
  return showcase;
}

function createDialog(title, eyebrow) {
  const dialog = createElement("dialog", "customer-booking-dialog");
  dialog.setAttribute("aria-label", title);
  const content = createElement("div", "booking-dialog-content");
  const top = createElement("div", "booking-dialog-top");
  const heading = createElement("div");
  heading.append(
    createElement("span", "", eyebrow),
    createElement("h2", "", title),
  );
  const close = createButton("×", "booking-dialog-close");
  close.setAttribute("aria-label", "Đóng hộp thoại");
  close.addEventListener("click", () => dialog.close());
  top.append(heading, close);
  content.append(top);
  dialog.append(content);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => dialog.remove(), { once: true });
  document.body.append(dialog);
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
  return { dialog, content, top };
}

function appendSummaryItem(summary, label, value) {
  const item = createElement("div");
  item.append(createElement("span", "", label), createElement("strong", "", value));
  summary.append(item);
}

function showBookingSuccess(dialogParts, booking, room, context) {
  const { money } = context;
  const { content } = dialogParts;
  dialogParts.dialog.setAttribute("aria-label", "Aurora đã giữ phòng");
  content.replaceChildren();
  const mark = createElement("div", "booking-success-mark", "✓");
  const heading = createElement("div", "booking-dialog-top");
  const copy = createElement("div");
  copy.append(
    createElement("span", "", "ROOM HELD FOR YOU"),
    createElement("h2", "", "Aurora đã giữ phòng."),
  );
  const close = createButton("×", "booking-dialog-close");
  close.setAttribute("aria-label", "Đóng hộp thoại");
  close.addEventListener("click", () => dialogParts.dialog.close());
  heading.append(copy, close);
  const description = createElement(
    "p",
    "booking-success-copy",
    `Giữ chỗ ${context.d.settings?.[0]?.bookingHoldMinutes || 10} phút đã được tạo. Mức tiền cọc cố định là 40% tiền phòng. Bạn có thể mở mã QR bên dưới để chuyển khoản cọc ngay; hệ thống tự động xác nhận khi ngân hàng báo có.`,
  );
  const details = createElement("div", "booking-success-details");
  appendSummaryItem(details, "Mã đặt phòng", booking.id || "Đang cập nhật");
  appendSummaryItem(details, "Phòng", room.name || room.id || "Aurora");
  appendSummaryItem(details, "Giữ đến", formatDateTime(booking.holdUntil));
  appendSummaryItem(details, "Tiền phòng", money(booking.roomCharge));
  appendSummaryItem(
    details,
    "Tiền cọc cố định (40%)",
    money(defaultDeposit(booking.roomCharge)),
  );
  const actions = createElement("div", "booking-dialog-actions");
  actions.append(
    createLink("Xem đặt phòng của tôi", "/app/mybookings", "primary"),
    createButton("Tiếp tục xem phòng", ""),
  );
  actions.lastElementChild.addEventListener("click", () =>
    dialogParts.dialog.close(),
  );
  content.append(mark, heading, description, details, actions);
  const pay = createButton(
    `Thanh toán cọc 40% (${money(defaultDeposit(booking.roomCharge))})`,
    "primary",
  );
  pay.addEventListener("click", () => {
    dialogParts.dialog.close();
    openDeposit(context, booking);
  });
  actions.prepend(pay);
}

function openBookingDialog(context, room, search) {
  const dialogParts = createDialog("Xác nhận giữ phòng", "YOUR AURORA STAY");
  const { content } = dialogParts;
  const summary = createElement("div", "booking-summary-grid");
  appendSummaryItem(summary, "Phòng", room.name || room.id || "Aurora");
  appendSummaryItem(summary, "Loại phòng", room.type?.name || "—");
  appendSummaryItem(
    summary,
    "Kỳ nghỉ",
    `${formatCalendarDate(search.startAt)} - ${formatCalendarDate(search.endAt)}`,
  );
  appendSummaryItem(summary, "Số khách", `${search.guests} khách`);
  appendSummaryItem(summary, "Tiền phòng dự kiến", context.money(room.quote));
  appendSummaryItem(
    summary,
    "Tiền cọc quy định (40%)",
    context.money(defaultDeposit(room.quote)),
  );
  const memberTier = getMemberTier(context);
  if (memberTier && memberTier.percent > 0) {
    const estimatedDiscount = Math.round((room.quote * memberTier.percent) / 100);
    appendSummaryItem(
      summary,
      `Ưu đãi hạng ${memberTier.name} (khi trả phòng)`,
      `Giảm ${memberTier.percent}% (-${context.money(estimatedDiscount)})`,
    );
  }
  const holdMinutes = context.d.settings?.[0]?.bookingHoldMinutes || 10;
  const tierNote = memberTier?.percent
    ? ` Quý khách đang sở hữu thẻ hạng ${memberTier.name} (-${memberTier.percent}%): Chiết khấu sẽ được tự động áp dụng trực tiếp trên toàn bộ hóa đơn (tiền phòng + dịch vụ) khi trả phòng.`
    : "";
  const explanation = createElement(
    "p",
    "hold-explanation",
    `Khi xác nhận, phòng được giữ trong ${holdMinutes} phút. Mức đặt cọc cố định 40% tiền phòng là ${context.money(defaultDeposit(room.quote))}. Sau khi giữ phòng, hệ thống sẽ tạo sẵn mã QR để bạn chuyển khoản cọc ngay.${tierNote}`,
  );
  const actions = createElement("div", "booking-dialog-actions");
  const cancel = createButton("Xem lại", "");
  const confirm = createButton(`Xác nhận giữ ${holdMinutes} phút`, "primary");
  const message = createElement("p", "booking-dialog-message");
  message.setAttribute("role", "status");
  cancel.addEventListener("click", () => dialogParts.dialog.close());
  confirm.addEventListener("click", async () => {
    confirm.disabled = true;
    message.textContent = "Đang kiểm tra lại tình trạng phòng…";
    try {
      const booking = await context.api("/api/action/booking.create", {
        roomId: room.id,
        startAt: search.startAt,
        endAt: search.endAt,
        guests: search.guests,
      });
      const searchForm = document.querySelector("#customer-search-form");
      searchForm?.dispatchEvent(new Event("submit", { cancelable: true }));
      showBookingSuccess(dialogParts, booking, room, context);
    } catch (error) {
      const isConflict =
        error.status === 409 ||
        /vừa được giữ|không khả dụng/i.test(error.message || "");
      if (isConflict) {
        const searchForm = document.querySelector("#customer-search-form");
        searchForm?.dispatchEvent(new Event("submit", { cancelable: true }));
        confirm.hidden = true;
        cancel.textContent = "Chọn phòng trống khác";
        cancel.className = "primary";
        message.textContent =
          "Rất tiếc, phòng này vừa được khách khác giữ chỗ trước vài giây. Danh sách phòng trống đã được làm mới để bạn chọn phòng khác.";
        return;
      }
      message.textContent = error.message;
      confirm.disabled = false;
    }
  });
  actions.append(cancel, confirm);
  content.append(summary, explanation, actions, message);
}

function readAdvancedFilterState(root) {
  const get = (name) =>
    root.querySelector(`[name="${name}"]`)?.value?.trim() || "";
  return {
    typeId: get("filterType"),
    beds: get("filterBeds"),
    view: get("filterView"),
    floor: get("filterFloor"),
    price: get("filterPrice"),
    roomId: get("filterRoomId"),
    keyword: get("filterKeyword"),
    sort: get("filterSort") || "default",
  };
}

function countActiveAdvancedFilters(filters) {
  return [
    filters.typeId,
    filters.beds,
    filters.view,
    filters.floor,
    filters.price,
    filters.roomId,
    filters.keyword,
  ].filter(Boolean).length;
}

function filterAndSortAvailableRooms(rows, filters, nights) {
  const keyword = filters.keyword.toLowerCase();
  const filtered = rows.filter((room) => {
    const type = room?.type || {};
    const typeId = String(type.id || room.typeId || "").toUpperCase();
    const typeName = String(type.name || "").toLowerCase();
    if (filters.typeId) {
      const matchSingle =
        filters.typeId === "LP01" &&
        (typeId === "LP01" || typeId === "DON" || typeName.includes("đơn"));
      const matchDouble =
        filters.typeId === "LP02" &&
        (typeId === "LP02" || typeId === "DOI" || typeName.includes("đôi"));
      const matchVip =
        filters.typeId === "LP03" &&
        (typeId === "LP03" || typeId === "VIP" || typeName.includes("vip"));
      if (!matchSingle && !matchDouble && !matchVip && typeId !== filters.typeId)
        return false;
    }
    if (filters.roomId && String(room.id) !== filters.roomId) return false;
    const beds = Number(type.beds || 1);
    if (filters.beds === "1" && beds !== 1) return false;
    if (filters.beds === "2" && beds < 2) return false;
    const viewText = roomView(room).toLowerCase();
    if (filters.view && !viewText.includes(filters.view.toLowerCase()))
      return false;
    if (filters.floor && roomFloorNumber(room) !== filters.floor) return false;
    const nightly =
      Number(type.nightlyPrice) ||
      Math.round(Number(room.quote || 0) / Math.max(1, nights));
    if (filters.price === "under-500" && nightly >= 500000) return false;
    if (
      filters.price === "500-900" &&
      (nightly < 500000 || nightly > 900000)
    )
      return false;
    if (filters.price === "over-900" && nightly <= 900000) return false;
    if (keyword) {
      const haystack = [
        room.id,
        room.name,
        type.name,
        roomView(room),
        roomFloorLabel(room),
        room.note,
        ...amenitiesOf(room),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }
    return true;
  });

  const sorted = [...filtered];
  if (filters.sort === "price-asc")
    sorted.sort((a, b) => Number(a.quote || 0) - Number(b.quote || 0));
  else if (filters.sort === "price-desc")
    sorted.sort((a, b) => Number(b.quote || 0) - Number(a.quote || 0));
  else if (filters.sort === "capacity-desc")
    sorted.sort(
      (a, b) =>
        Number(b.type?.capacity || 0) - Number(a.type?.capacity || 0) ||
        Number(a.quote || 0) - Number(b.quote || 0),
    );
  return sorted;
}

function syncDynamicFilterOptions(root, rows) {
  const roomSelect = root.querySelector('[name="filterRoomId"]');
  if (roomSelect) {
    const previous = roomSelect.value;
    roomSelect.replaceChildren(
      createElement("option", "", "Chọn nhanh phòng cụ thể (Tất cả)"),
    );
    roomSelect.firstElementChild.value = "";
    rows.forEach((room) => {
      const opt = createElement(
        "option",
        "",
        `${room.name || room.id} · ${room.type?.name || "Aurora"} (${roomView(room)})`,
      );
      opt.value = String(room.id);
      opt.selected = String(room.id) === previous;
      roomSelect.append(opt);
    });
  }
}

function renderFilteredRooms(
  context,
  root,
  rows,
  search,
  results,
  status,
  openDetail,
) {
  const nights = stayNights(search.startAt, search.endAt);
  const filters = readAdvancedFilterState(root);
  const activeCount = countActiveAdvancedFilters(filters);
  const badge = root.querySelector("[data-filter-badge]");
  const resetBtn = root.querySelector("[data-filter-reset]");
  if (badge) {
    badge.textContent = activeCount
      ? `Đang lọc (${activeCount} tiêu chí)`
      : "Tất cả phòng";
    badge.classList.toggle("is-active", activeCount > 0);
  }
  if (resetBtn) resetBtn.hidden = activeCount === 0 && filters.sort === "default";

  results.replaceChildren();
  if (!rows.length) {
    const empty = createElement("div", "customer-empty");
    empty.append(
      createElement("strong", "", "Chưa tìm thấy căn phòng phù hợp."),
      createElement(
        "span",
        "",
        "Hãy thử một khoảng ngày khác hoặc giảm số khách trong phòng.",
      ),
    );
    results.append(empty);
    status.textContent = "Không có phòng trống trong khoảng ngày đã chọn.";
    return;
  }

  const matched = filterAndSortAvailableRooms(rows, filters, nights);
  if (!matched.length) {
    const empty = createElement("div", "customer-empty");
    const clearBtn = createButton("Xóa bộ lọc nâng cao", "primary");
    clearBtn.addEventListener("click", () => {
      resetAdvancedFilters(root);
      renderFilteredRooms(
        context,
        root,
        rows,
        search,
        results,
        status,
        openDetail,
      );
    });
    empty.append(
      createElement(
        "strong",
        "",
        "Không có phòng nào khớp với bộ lọc nâng cao hiện tại.",
      ),
      createElement(
        "span",
        "",
        `Có ${rows.length} phòng trống trong khoảng ngày này. Bạn có thể nới lỏng tiêu chí hướng nhìn, số giường hoặc mức giá.`,
      ),
      clearBtn,
    );
    results.append(empty);
    status.textContent = `0 / ${rows.length} phòng khớp bộ lọc · Giá cho ${nights} đêm`;
    return;
  }

  matched.forEach((room, index) =>
    results.append(
      createRoomCard(
        room,
        index,
        search,
        context.money,
        (selected, stay) => openBookingDialog(context, selected, stay),
        openDetail,
      ),
    ),
  );
  status.textContent = activeCount
    ? `Hiển thị ${matched.length} / ${rows.length} phòng trống theo bộ lọc · Giá cho ${nights} đêm`
    : `${rows.length} phòng trống · Giá cho ${nights} đêm`;
}

function resetAdvancedFilters(root) {
  [
    "filterType",
    "filterBeds",
    "filterView",
    "filterFloor",
    "filterPrice",
    "filterRoomId",
    "filterKeyword",
  ].forEach((name) => {
    const control = root.querySelector(`[name="${name}"]`);
    if (control) control.value = "";
  });
  const sortControl = root.querySelector('[name="filterSort"]');
  if (sortControl) sortControl.value = "default";
}

function createTrustRow(context) {
  const row = createElement("div", "customer-trust-row");
  const holdMinutes = context?.d?.settings?.[0]?.bookingHoldMinutes || 10;
  [
    ["◇", "Bấm vào thẻ phòng để ngắm trọn bộ ảnh không gian & tiện nghi"],
    [`${holdMinutes}′`, `Giữ chỗ online ${holdMinutes} phút · Cọc cố định 40% tiền phòng`],
    ["✓", "Khách quen có thể bấm Giữ phòng ngay từ danh sách ngoài"],
  ].forEach(([icon, text]) => {
    const item = createElement("div");
    item.append(createElement("b", "", icon), createElement("span", "", text));
    row.append(item);
  });
  return row;
}

function renderCustomerSearch(context, content) {
  const search = initialSearch();
  const root = createElement("section", "customer-search-shell");
  root.dataset.customerView = "search";

  const listContainer = createElement("div", "customer-search-list-view");
  const detailContainer = createElement("div", "customer-search-detail-view");
  detailContainer.hidden = true;

  const intro = createSearchIntro(search, context);
  const heading = createElement("div", "customer-results-heading");
  const headingCopy = createElement("div");
  headingCopy.append(
    createElement("span", "", "AVAILABLE ROOMS"),
    createElement("h2", "", "Không gian dành cho bạn"),
    createElement(
      "p",
      "",
      "Bấm vào bất kỳ phòng nào để xem toàn bộ thông tin & bộ ảnh phòng, hoặc bấm Giữ phòng ngay nếu bạn đã chọn được phòng quen thuộc.",
    ),
  );
  const status = createElement(
    "p",
    "results-status",
    "Chọn ngày để kiểm tra tình trạng phòng.",
  );
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  heading.append(headingCopy, status);
  const results = createElement("div", "customer-room-grid");
  results.id = "available-results";
  const empty = createElement("div", "customer-empty");
  empty.append(
    createElement("strong", "", "Kỳ nghỉ của bạn sẽ bắt đầu ở đây."),
    createElement(
      "span",
      "",
      "Chọn ngày nhận, ngày trả và số khách để khám phá phòng trống.",
    ),
  );
  results.append(empty);
  listContainer.append(intro, createTrustRow(context), heading, results);
  root.append(listContainer, detailContainer);
  content.replaceChildren(root);

  let latestRows = [];
  let latestSearch = search;

  const showListView = () => {
    detailContainer.hidden = true;
    detailContainer.replaceChildren();
    listContainer.hidden = false;
  };

  const openDetailView = (room, index, staySearch) => {
    listContainer.hidden = true;
    detailContainer.hidden = false;
    const showcase = renderRoomShowcasePage(
      context,
      root,
      room,
      index,
      staySearch,
      showListView,
      (selected, stay) => openBookingDialog(context, selected, stay),
    );
    detailContainer.replaceChildren(showcase);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const runSearch = async (form) => {
    const nextSearch = Object.fromEntries(new FormData(form));
    const today = localDate(Date.now());
    const button = form.querySelector('button[type="submit"]');
    if (
      !isCalendarDate(nextSearch.startAt) ||
      !isCalendarDate(nextSearch.endAt) ||
      nextSearch.startAt < today ||
      nextSearch.endAt <= nextSearch.startAt
    ) {
      status.classList.add("is-error");
      status.textContent =
        "Ngày nhận không được ở quá khứ và ngày trả phải sau ngày nhận.";
      return;
    }

    sessionStorage.setItem(SEARCH_STORAGE_KEY, JSON.stringify(nextSearch));
    status.classList.remove("is-error");
    status.textContent = "Đang tìm những căn phòng phù hợp…";
    button.disabled = true;
    results.setAttribute("aria-busy", "true");
    try {
      const rows = await context.api(
        `/api/availability?${new URLSearchParams(nextSearch)}`,
      );
      latestRows = rows;
      latestSearch = nextSearch;
      syncDynamicFilterOptions(root, rows);
      if (!detailContainer.hidden) showListView();
      renderFilteredRooms(
        context,
        root,
        latestRows,
        latestSearch,
        results,
        status,
        openDetailView,
      );
    } catch (error) {
      results.replaceChildren();
      status.classList.add("is-error");
      status.textContent = error.message;
    } finally {
      button.disabled = false;
      results.removeAttribute("aria-busy");
    }
  };

  const form = root.querySelector("#customer-search-form");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    runSearch(form);
  });
  form.addEventListener("change", () => {
    runSearch(form);
  });

  const filterPanel = root.querySelector(".customer-advanced-filters");
  filterPanel?.addEventListener("change", () => {
    const filters = readAdvancedFilterState(root);
    const guestsSelect = form.querySelector('[name="guests"]');
    if (filters.typeId === "LP01" && guestsSelect && Number(guestsSelect.value) > 1) {
      guestsSelect.value = "1";
      runSearch(form);
      return;
    }
    if (!latestRows.length) {
      runSearch(form);
      return;
    }
    renderFilteredRooms(
      context,
      root,
      latestRows,
      latestSearch,
      results,
      status,
      openDetailView,
    );
  });
  filterPanel
    ?.querySelector('[name="filterKeyword"]')
    ?.addEventListener("input", () => {
      if (!latestRows.length) {
        runSearch(form);
        return;
      }
      renderFilteredRooms(
        context,
        root,
        latestRows,
        latestSearch,
        results,
        status,
        openDetailView,
      );
    });
  filterPanel
    ?.querySelector("[data-filter-reset]")
    ?.addEventListener("click", () => {
      resetAdvancedFilters(root);
      if (!latestRows.length) {
        runSearch(form);
        return;
      }
      renderFilteredRooms(
        context,
        root,
        latestRows,
        latestSearch,
        results,
        status,
        openDetailView,
      );
    });

  queueMicrotask(() => runSearch(form));
}

function formatCountdown(remaining) {
  if (!Number.isFinite(remaining) || remaining <= 0) return "00:00";
  const hours = Math.floor(remaining / 3600000);
  const mins = Math.floor((remaining % 3600000) / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  if (hours > 0) {
    return `${hours}h ${String(mins).padStart(2, "0")}m`;
  }
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function remainingHold(value) {
  const milliseconds = Date.parse(value) - Date.now();
  if (!Number.isFinite(milliseconds) || milliseconds < 0)
    return "Thời hạn giữ chỗ đã kết thúc. Tải lại trang để cập nhật trạng thái.";
  const minutes = Math.floor(milliseconds / 60000);
  const seconds = Math.floor((milliseconds % 60000) / 1000);
  return `Còn ${minutes}:${String(seconds).padStart(2, "0")} để Aurora xác nhận cọc · giữ đến ${formatDateTime(value)}`;
}

function bookingHoldMessage(booking, hotline, money) {
  if (booking.status === "PENDING")
    return remainingHold(booking.holdUntil) +
      ` · Cọc đã ghi nhận ${money(booking.deposit)}. Liên hệ ${hotline}.`;
  if (booking.status === "CONFIRMED")
    return `Aurora đã ghi nhận tiền cọc ${money(booking.deposit)}. Đây là khoản cọc, không phải toàn bộ tiền lưu trú.`;
  if (booking.status === "CHECKED_IN")
    return `Bạn đang lưu trú tại Aurora. Tiền cọc đã ghi nhận: ${money(booking.deposit)}.`;
  if (booking.status === "COMPLETED")
    return `Kỳ nghỉ đã hoàn tất. Tiền cọc đã ghi nhận trong phiếu: ${money(booking.deposit)}.`;
  return "Phiếu không còn hiệu lực. Không có khoản cọc nào được xác nhận cho phiếu này.";
}

function statusClass(status) {
  return {
    PENDING: "status-pending",
    CONFIRMED: "status-confirmed",
    CHECKED_IN: "status-confirmed",
    COMPLETED: "status-completed",
    CANCELLED: "status-cancelled",
  }[status] || "";
}

function openCustomerRefundDialog(context, booking, onDone) {
  const deposit = Number(booking.deposit || 0);
  const parts = createDialog("Hủy đặt phòng & Hoàn tiền cọc", "CHÍNH SÁCH ĐỔI Ý TRONG 2 GIỜ");

  const explanation = createElement("div", "refund-explanation-box");
  explanation.innerHTML = `
    <div class="refund-alert-banner">
      <span class="refund-icon" aria-hidden="true">🛡️</span>
      <div>
        <strong>Chính sách hoàn cọc linh hoạt 2 giờ</strong>
        <p>Quý khách vừa đặt phòng trong vòng 2 tiếng. Nếu đổi ý định, quý khách được quyền hủy đặt phòng và nhận lại <strong>100% tiền cọc (${context.money(deposit)})</strong>.</p>
      </div>
    </div>
    <div class="refund-details-card">
      <div class="refund-row"><span>Mã đặt phòng:</span><strong>${booking.id}</strong></div>
      <div class="refund-row"><span>Tiền cọc đã thanh toán:</span><strong>${context.money(deposit)}</strong></div>
      <div class="refund-row is-refund"><span>Số tiền hoàn trả:</span><strong class="text-success">✓ ${context.money(deposit)} (100%)</strong></div>
      <div class="refund-row"><span>Phương thức hoàn:</span><span>Tự động hoàn về tài khoản thanh toán ban đầu</span></div>
    </div>
    <p class="refund-subtext">Sau khi xác nhận, phòng sẽ được mở lại cho khách khác và số tiền cọc sẽ được hoàn tất chuyển trả.</p>
  `;

  const actions = createElement("div", "booking-dialog-actions");
  const back = createButton("Giữ phòng", "");
  const confirm = createButton("Xác nhận hủy & Hoàn cọc", "danger");
  const message = createElement("p", "booking-dialog-message");
  message.setAttribute("role", "status");

  back.addEventListener("click", () => parts.dialog.close());
  confirm.addEventListener("click", async () => {
    confirm.disabled = true;
    message.textContent = "Đang xử lý hủy phòng và hoàn cọc…";
    try {
      await context.api("/api/action/booking.cancel", { id: booking.id });
      parts.dialog.close();
      context.toast(`Đã hủy đặt phòng thành công! Số tiền cọc ${context.money(deposit)} đã được hoàn lại về tài khoản của quý khách.`);
      if (typeof onDone === "function") onDone();
      await context.refresh();
    } catch (error) {
      message.textContent = error.message;
      confirm.disabled = false;
    }
  });

  actions.append(back, confirm);
  parts.content.append(explanation, actions, message);
}

function openCancelDialog(context, booking) {
  const parts = createDialog("Hủy giữ chỗ?", "BOOKING UPDATE");
  const note = createElement(
    "p",
    "hold-explanation",
    "Chỉ phiếu đang giữ và chưa ghi nhận cọc mới có thể hủy. Thao tác này sẽ nhả phòng cho khách khác.",
  );
  const actions = createElement("div", "booking-dialog-actions");
  const back = createButton("Giữ nguyên", "");
  const confirm = createButton("Hủy giữ chỗ", "primary");
  const message = createElement("p", "booking-dialog-message");
  message.setAttribute("role", "status");
  back.addEventListener("click", () => parts.dialog.close());
  confirm.addEventListener("click", async () => {
    confirm.disabled = true;
    message.textContent = "Đang hủy giữ chỗ…";
    try {
      await context.api("/api/action/booking.cancel", { id: booking.id });
      parts.dialog.close();
      context.toast("Đã hủy giữ chỗ và nhả phòng.");
      await context.refresh();
    } catch (error) {
      message.textContent = error.message;
      confirm.disabled = false;
    }
  });
  actions.append(back, confirm);
  parts.content.append(note, actions, message);
}


const CODE39_PATTERNS = {
  '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
  '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
  '8': '100100100', '9': '001100100', 'A': '100001001', 'B': '001001001',
  'C': '101001000', 'D': '000011001', 'E': '100011000', 'F': '001011000',
  'G': '000001101', 'H': '100001100', 'I': '001001100', 'J': '000011100',
  'K': '100000011', 'L': '001000011', 'M': '101000010', 'N': '000010011',
  'O': '100010010', 'P': '001010010', 'Q': '000000111', 'R': '100000110',
  'S': '001000110', 'T': '000010110', 'U': '110000001', 'V': '011000001',
  'W': '111000000', 'X': '010010001', 'Y': '110010000', 'Z': '011010000',
  '-': '010000101', '.': '110000100', ' ': '011000100', '*': '010010100',
  '$': '010101000', '/': '010100010', '+': '010001010', '%': '000101010'
};

function generateBarcodeSvg(rawText, height = 34) {
  const text = '*' + String(rawText || '').toUpperCase().replace(/[^0-9A-Z\-. $/+%]/g, '') + '*';
  const narrow = 1.25;
  const wide = 2.75;
  const rects = [];
  let x = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const pattern = CODE39_PATTERNS[ch] || CODE39_PATTERNS['*'];
    for (let j = 0; j < 9; j++) {
      const isBar = (j % 2 === 0);
      const isWide = pattern[j] === '1';
      const width = isWide ? wide : narrow;
      if (isBar) {
        rects.push('<rect x="' + x.toFixed(1) + '" y="0" width="' + width.toFixed(1) + '" height="' + height + '" fill="#173f35" />');
      }
      x += width;
    }
    x += narrow;
  }
  const totalWidth = Math.ceil(x);
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + totalWidth + ' ' + height + '" preserveAspectRatio="none" class="voucher-barcode-svg" role="img" aria-label="Mã vạch: ' + rawText + '">' + rects.join('') + '</svg>';
}

function calculateBookingNights(startAt, endAt) {
  if (!startAt || !endAt) return 1;
  const s = String(startAt).trim();
  const e = String(endAt).trim();
  const sd = new Date(s.length === 10 ? `${s}T12:00:00` : s);
  const ed = new Date(e.length === 10 ? `${e}T12:00:00` : e);
  const ms = ed.getTime() - sd.getTime();
  return (!Number.isNaN(ms) && ms > 0) ? Math.max(1, Math.round(ms / 86400000)) : 1;
}

function renderBookingVoucherPage(
  context,
  root,
  booking,
  room,
  index,
  onBack,
  onOpenShowcase,
) {
  const { money, d, viewer } = context;
  const type = room?.type || {};
  const customer =
    (d.customers || []).find((c) => String(c.id) === String(booking.customerId)) ||
    (d.customers && d.customers[0]) ||
    viewer ||
    {};
  const settings = d.settings?.[0] || {};
  const hotelName = settings.hotelName || "Aurora Hotel";
  const hotline = settings.hotline || "lễ tân Aurora";
  const address = settings.address || "Việt Nam";
  const checkInTime = settings.checkInTime || "14:00";
  const checkOutTime = settings.checkOutTime || "12:00";

  const nights = calculateBookingNights(booking.startAt, booking.endAt);
  const remainingMoney = Math.max(
    0,
    Number(booking.roomCharge || 0) - Number(booking.deposit || 0),
  );

  const page = createElement("section", "customer-booking-voucher-page");

  // Topbar
  const topBar = createElement("div", "booking-voucher-topbar");
  const backBtn = createButton("← Quay lại danh sách đặt phòng", "voucher-back-btn");
  backBtn.addEventListener("click", onBack);
  const printBtn = createButton("🖨️ In phiếu đặt phòng", "voucher-print-btn small");
  printBtn.addEventListener("click", () => window.print());
  topBar.append(backBtn, printBtn);

  // Thẻ voucher chính
  const voucherCard = createElement("article", "booking-voucher-card");

  // 1. Header voucher (Brand bên trái, Badge trạng thái bên phải)
  const voucherHeader = createElement("div", "booking-voucher-header");
  voucherHeader.innerHTML =
    '<div class="voucher-brand-area">' +
      '<strong>AURORA <span>HOSPITALITY</span></strong>' +
      '<small>PHIẾU XÁC NHẬN ĐẶT PHÒNG</small>' +
    '</div>' +
    '<div class="voucher-header-badge">' +
      '<span class="voucher-status-pill ' + statusClass(booking.status) + '">' +
        (STATUS_LABELS[booking.status] || booking.status) +
      '</span>' +
    '</div>';

  // 2. Thanh mã đặt phòng: Bố cục 2 cột cân đối hoàn hảo (Trái: Mã số & Hướng dẫn, Phải: Mã vạch Barcode)
  const codeBox = createElement("div", "voucher-code-strip");
  const codeLeftCol = createElement("div", "voucher-code-left-col");

  // Ô mã đặt phòng có thể click trực tiếp để sao chép
  const codeClickable = createElement("div", "voucher-code-clickable");
  codeClickable.setAttribute("role", "button");
  codeClickable.setAttribute("tabindex", "0");
  codeClickable.setAttribute("title", "Bấm vào mã để sao chép mã đặt phòng");
  codeClickable.innerHTML =
    '<span class="voucher-code-tag">MÃ ĐẶT PHÒNG</span>' +
    '<strong class="voucher-code-text">' + booking.id + '</strong>' +
    '<span class="voucher-code-copy-hint">📋 Bấm sao chép</span>';

  const triggerCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(booking.id));
      const hint = codeClickable.querySelector(".voucher-code-copy-hint");
      if (hint) {
        hint.textContent = "✓ Đã sao chép!";
        hint.classList.add("is-copied");
        codeClickable.classList.add("is-copied-border");
        setTimeout(() => {
          hint.textContent = "📋 Bấm sao chép";
          hint.classList.remove("is-copied");
          codeClickable.classList.remove("is-copied-border");
        }, 2200);
      }
    } catch {
      // Fallback
    }
  };

  codeClickable.addEventListener("click", triggerCopy);
  codeClickable.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      triggerCopy();
    }
  });

  const codeHint = createElement(
    "p",
    "voucher-code-hint",
    "Xuất trình mã số này hoặc quét mã vạch cho nhân viên lễ tân khi làm thủ tục nhận phòng.",
  );

  codeLeftCol.append(codeClickable, codeHint);

  // Cột phải: Khối mã vạch (Barcode) đối trọng cân đối
  const codeRightCol = createElement("div", "voucher-code-right-col");
  const barcodeBox = createElement("div", "voucher-barcode-box");
  barcodeBox.setAttribute("title", "Bấm vào mã vạch để sao chép mã đặt phòng");
  barcodeBox.innerHTML =
    generateBarcodeSvg(booking.id, 40) +
    '<span class="voucher-barcode-label">* ' + booking.id + ' *</span>';
  barcodeBox.addEventListener("click", triggerCopy);
  codeRightCol.append(barcodeBox);

  codeBox.append(codeLeftCol, codeRightCol);

  // 3. Thanh 4 chỉ số thời gian lưu trú cân đối
  const datesGrid = createElement("div", "voucher-metrics-grid");
  datesGrid.innerHTML =
    '<div class="voucher-metric-cell">' +
      '<span class="metric-label">NGÀY NHẬN PHÒNG</span>' +
      '<strong class="metric-value">' + formatCalendarDate(booking.startAt) + '</strong>' +
      '<small class="metric-sub">Nhận phòng từ ' + checkInTime + '</small>' +
    '</div>' +
    '<div class="voucher-metric-cell">' +
      '<span class="metric-label">NGÀY TRẢ PHÒNG</span>' +
      '<strong class="metric-value">' + formatCalendarDate(booking.endAt) + '</strong>' +
      '<small class="metric-sub">Trả phòng trước ' + checkOutTime + '</small>' +
    '</div>' +
    '<div class="voucher-metric-cell">' +
      '<span class="metric-label">THỜI GIAN LƯU TRÚ</span>' +
      '<strong class="metric-value">' + nights + ' đêm</strong>' +
      '<small class="metric-sub">Kỳ nghỉ tiêu chuẩn</small>' +
    '</div>' +
    '<div class="voucher-metric-cell">' +
      '<span class="metric-label">SỐ LƯỢNG KHÁCH</span>' +
      '<strong class="metric-value">' + (booking.guests || 1) + ' khách</strong>' +
      '<small class="metric-sub">Đã xác nhận</small>' +
    '</div>';

  // 4. Lưới 2x2 cân đối hoàn toàn
  const sectionsGrid = createElement("div", "voucher-sections-grid");

  // Box 1: Thông tin phòng
  const amenitiesList = (
    type.amenities || "Wi-Fi miễn phí · Smart TV · Minibar · Nước suối"
  )
    .split(/[·,]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);

  const amenitiesHtml = amenitiesList.length
    ? '<div class="voucher-room-amenities">' +
      amenitiesList
        .map((a) => '<span class="room-amenity-chip">' + a + '</span>')
        .join("") +
      '</div>'
    : '';

  const roomBox = createElement("div", "voucher-section-card");
  roomBox.innerHTML =
    '<h4 class="voucher-section-title">THÔNG TIN PHÒNG NGHỈ</h4>' +
    '<div class="voucher-room-layout">' +
      '<div class="voucher-room-thumb">' +
        '<img src="' + safeRoomImage(room, index) + '" alt="' + (room.name || 'Phòng') + '">' +
      '</div>' +
      '<div class="voucher-room-details">' +
        '<strong class="room-title">' + (room.name || booking.roomId || 'Phòng Aurora') + '</strong>' +
        '<p class="room-type">' + (type.name || 'Hạng phòng tiêu chuẩn') + ' · Tầng ' + (room.floor || 1) + '</p>' +
        '<p class="room-view">Hướng: <strong>' + roomView(room) + '</strong></p>' +
        '<small class="room-specs">' + (type.beds || 1) + ' giường · Tối đa ' + (type.capacity || 2) + ' khách</small>' +
        amenitiesHtml +
      '</div>' +
    '</div>' +
    '<p class="voucher-section-hint">Phòng đã được chuẩn bị đầy đủ tiện nghi tiêu chuẩn Aurora trước giờ nhận phòng.</p>';

  // Box 2: Thông tin khách hàng
  const guestBox = createElement("div", "voucher-section-card");
  guestBox.innerHTML =
    '<h4 class="voucher-section-title">THÔNG TIN KHÁCH HÀNG</h4>' +
    '<div class="voucher-info-rows">' +
      '<div class="info-row"><span class="info-lbl">Họ và tên:</span><strong class="info-val">' + (customer.name || viewer?.name || 'Quý khách') + '</strong></div>' +
      '<div class="info-row"><span class="info-lbl">Số điện thoại:</span><span class="info-val">' + (customer.phone || viewer?.phone || '—') + '</span></div>' +
      '<div class="info-row"><span class="info-lbl">CCCD / Hộ chiếu:</span><span class="info-val">' + (customer.identityNo || customer.identityNumber || viewer?.identityNo || '—') + '</span></div>' +
      '<div class="info-row"><span class="info-lbl">Địa chỉ:</span><span class="info-val">' + (customer.address || viewer?.address || '—') + '</span></div>' +
    '</div>' +
    '<p class="voucher-section-hint">Thông tin dùng để đối chiếu khi làm thủ tục nhận phòng tại quầy.</p>';

  // Box 3: Chi tiết thanh toán
  const memberTier = getMemberTier(context);
  const tierLine = memberTier?.percent
    ? '<div class="pay-row is-tier" style="color: #245844;"><span>Ưu đãi hạng ' + memberTier.name + ' (-' + memberTier.percent + '%):</span><strong class="text-success">Tự động trừ vào hóa đơn khi trả phòng</strong></div>'
    : '';
  const tierHint = memberTier?.percent
    ? ' Ưu đãi hạng <strong>' + memberTier.name + ' (-' + memberTier.percent + '%)</strong> sẽ được tự động khấu trừ trên toàn bộ hóa đơn (tiền phòng + dịch vụ) khi làm thủ tục trả phòng.'
    : '';

  const paymentBox = createElement("div", "voucher-section-card");
  paymentBox.innerHTML =
    '<h4 class="voucher-section-title">CHI TIẾT THANH TOÁN</h4>' +
    '<div class="voucher-payment-rows">' +
      '<div class="pay-row"><span>Tổng tiền phòng (' + nights + ' đêm):</span><strong>' + money(booking.roomCharge) + '</strong></div>' +
      '<div class="pay-row is-deposit"><span>Tiền cọc đã ghi nhận:</span><strong class="text-success">✓ ' + money(booking.deposit) + '</strong></div>' +
      tierLine +
      '<div class="pay-row is-due"><span>Còn lại thanh toán tại quầy:</span><strong class="text-highlight">' + money(remainingMoney) + '</strong></div>' +
    '</div>' +
    '<p class="voucher-section-hint">Khoản cọc đã ghi nhận <strong>' + money(booking.deposit) + '</strong>. Quý khách vui lòng thanh toán số tiền còn lại <strong>' + money(remainingMoney) + '</strong> khi nhận/trả phòng.' + tierHint + '</p>';

  // Box 4: Hướng dẫn nhận phòng & liên hệ
  const noticeBox = createElement("div", "voucher-section-card");
  noticeBox.innerHTML =
    '<h4 class="voucher-section-title">HƯỚNG DẪN & LIÊN HỆ</h4>' +
    '<ul class="voucher-guidelines-list">' +
      '<li><strong>Giờ giấc:</strong> Nhận phòng từ <strong>' + checkInTime + '</strong>, trả phòng trước <strong>' + checkOutTime + '</strong>.</li>' +
      '<li><strong>Thủ tục:</strong> Xuất trình <strong>Mã đặt phòng</strong> hoặc <strong>Mã vạch</strong> cùng <strong>CCCD / Hộ chiếu</strong> bản gốc.</li>' +
      '<li><strong>Địa chỉ:</strong> ' + address + ' (' + hotelName + ').</li>' +
      '<li><strong>Hotline 24/7:</strong> <strong>' + hotline + '</strong> (hỗ trợ chỉ đường, nhận phòng sớm).</li>' +
    '</ul>';

  sectionsGrid.append(roomBox, guestBox, paymentBox, noticeBox);

  // Footer các nút
  const footerActions = createElement("div", "voucher-footer-actions");
  const bottomBackBtn = createButton("← Quay lại danh sách đặt phòng", "voucher-back-btn");
  bottomBackBtn.addEventListener("click", onBack);
  footerActions.append(bottomBackBtn);

  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
  const bookingCreatedAt = Date.parse(booking.createdAt || booking.startAt);
  const bookingAge = Date.now() - bookingCreatedAt;
  const isWithin2Hours = Number.isFinite(bookingCreatedAt) && bookingAge <= TWO_HOURS_MS;

  if (booking.status === "CONFIRMED" && isWithin2Hours) {
    const cancelVoucherBtn = createButton(
      "✕ Hủy đặt phòng & Hoàn cọc (" + money(booking.deposit) + ")",
      "voucher-cancel-btn danger",
    );
    cancelVoucherBtn.addEventListener("click", () => {
      openCustomerRefundDialog(context, booking, onBack);
    });
    footerActions.append(cancelVoucherBtn);
  }

  if (booking.status === "PENDING" && Number(booking.deposit || 0) === 0) {
    if (Date.parse(booking.holdUntil) >= Date.now()) {
      const payBtn = createButton("Thanh toán cọc ngay (" + money(defaultDeposit(booking.roomCharge)) + ")", "primary");
      payBtn.addEventListener("click", () => openDeposit(context, booking));
      footerActions.append(payBtn);
    }
  }

  voucherCard.append(
    voucherHeader,
    codeBox,
    datesGrid,
    sectionsGrid,
    footerActions
  );
  page.append(topBar, voucherCard);
  return page;
}

function createBookingCard(
  context,
  booking,
  room,
  index,
  hotline,
  openRoomDetail,
  openBookingVoucher,
) {
  const type = room?.type || {};
  const card = createElement("article", "customer-booking-card");
  const visual = createElement("div", "booking-card-visual");
  const image = document.createElement("img");
  image.src = safeRoomImage(room, index);
  image.alt = `${room?.name || "Phòng Aurora"}, ${roomView(room)}`;
  image.loading = "lazy";
  image.addEventListener("error", () => image.remove());
  const status = createElement(
    "span",
    `booking-status-chip ${statusClass(booking.status)}`,
    STATUS_LABELS[booking.status] || booking.status,
  );
  visual.append(image, status);
  visual.style.cursor = "pointer";
  visual.addEventListener("click", () =>
    openBookingVoucher
      ? openBookingVoucher(booking, room, index)
      : openRoomDetail?.({ ...room, type, quote: booking.roomCharge }, index, booking),
  );

  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
  const bookingCreatedAt = Date.parse(booking.createdAt || booking.startAt);
  const bookingAge = Date.now() - bookingCreatedAt;
  const isWithin2Hours = Number.isFinite(bookingCreatedAt) && bookingAge <= TWO_HOURS_MS;
  const remainingCancelMs = Math.max(0, TWO_HOURS_MS - bookingAge);

  const content = createElement("div", "booking-card-content");
  const identity = createElement("div");
  const refRow = createElement("div", "booking-ref-row");
  refRow.append(createElement("span", "booking-reference", `MÃ ${booking.id}`));
  if (booking.status === "CONFIRMED" && isWithin2Hours) {
    const refundPill = createElement(
      "span",
      "booking-refund-pill",
      `🛡️ Hủy hoàn cọc 100% trong ${formatCountdown(remainingCancelMs)}`,
    );
    refundPill.title = "Theo chính sách của Aurora, bạn có 2 tiếng kể từ khi đặt để đổi ý định và nhận lại 100% tiền cọc";
    refRow.append(refundPill);
  }

  identity.append(
    refRow,
    createElement("h3", "", room?.name || booking.roomId || "Phòng Aurora"),
    createElement(
      "p",
      "booking-stay-line",
      `${type.name || "Aurora room"} · ${formatCalendarDate(booking.startAt)} đến ${formatCalendarDate(booking.endAt)} · ${booking.guests} khách`,
    ),
  );
  const financial = createElement("div", "booking-money");
  const roomCharge = createElement("div");
  roomCharge.append(
    createElement("small", "", "Tiền phòng"),
    createElement("strong", "", context.money(booking.roomCharge)),
  );
  const isUnpaidPending =
    booking.status === "PENDING" && Number(booking.deposit || 0) === 0;
  const deposit = createElement("div");
  deposit.append(
    createElement(
      "small",
      "",
      isUnpaidPending ? "Tiền cọc cố định (40%)" : "Cọc đã ghi nhận",
    ),
    createElement(
      "strong",
      "",
      context.money(
        isUnpaidPending ? defaultDeposit(booking.roomCharge) : booking.deposit,
      ),
    ),
  );
  financial.append(roomCharge, deposit);

  const memberTier = getMemberTier(context);
  if (memberTier && memberTier.percent > 0) {
    const tierTag = createElement("div", "booking-tier-tag");
    tierTag.style.cssText = "display: flex; align-items: center; margin-top: 6px; grid-column: 1 / -1;";
    tierTag.innerHTML = `<span style="display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 700; color: #1e5243; background: #eef6f2; border: 1px solid #c9dec5; padding: 3px 8px; border-radius: 6px;">🎖️ Hạng ${memberTier.name}: Giảm ${memberTier.percent}% hóa đơn khi trả phòng</span>`;
    financial.append(tierTag);
  }

  const state = createElement(
    "p",
    `booking-hold-state ${
      booking.status === "PENDING"
        ? ""
        : ["CONFIRMED", "CHECKED_IN", "COMPLETED"].includes(booking.status)
          ? "is-confirmed"
          : "is-closed"
    }`,
    bookingHoldMessage(booking, hotline, context.money),
  );
  if (booking.status === "PENDING" && booking.holdUntil) {
    state.dataset.customerHoldUntil = booking.holdUntil;
    state.dataset.deposit = context.money(booking.deposit);
    state.dataset.hotline = hotline;
  }

  const actions = createElement("div", "booking-card-actions");
  const viewVoucherBtn = createButton(
    "Xem chi tiết đặt phòng →",
    "primary small",
  );
  viewVoucherBtn.addEventListener("click", () =>
    openBookingVoucher
      ? openBookingVoucher(booking, room, index)
      : openRoomDetail?.({ ...room, type, quote: booking.roomCharge }, index, booking),
  );
  actions.append(viewVoucherBtn);

  if (isUnpaidPending) {
    if (Date.parse(booking.holdUntil) >= Date.now()) {
      const pay = createButton(
        `Thanh toán cọc 40% (${context.money(defaultDeposit(booking.roomCharge))})`,
        "primary small",
      );
      pay.addEventListener("click", () => openDeposit(context, booking));
      actions.append(pay);
    }
    const cancel = createButton("Hủy giữ chỗ", "small cancel-booking");
    cancel.addEventListener("click", () => openCancelDialog(context, booking));
    actions.append(cancel);
  } else if (booking.status === "CONFIRMED" && isWithin2Hours) {
    const cancelRefundBtn = createButton(
      `✕ Hủy & hoàn cọc (${context.money(booking.deposit)})`,
      "small cancel-booking danger",
    );
    cancelRefundBtn.title = `Bạn đang trong thời hạn 2 tiếng để hủy phòng và nhận lại 100% tiền cọc (${context.money(booking.deposit)})`;
    cancelRefundBtn.addEventListener("click", () => openCustomerRefundDialog(context, booking));
    actions.append(cancelRefundBtn);
  }
  content.append(identity, financial, state, actions);
  card.append(visual, content);
  return card;
}

function updateHoldCountdowns(root) {
  root.querySelectorAll("[data-customer-hold-until]").forEach((element) => {
    element.textContent =
      remainingHold(element.dataset.customerHoldUntil) +
      ` · Cọc đã ghi nhận ${element.dataset.deposit}. Liên hệ ${element.dataset.hotline}.`;
  });
}

function renderCustomerBookings(context, content, stopCountdown) {
  stopCountdown();
  const root = createElement("section", "customer-bookings-shell");
  root.dataset.customerView = "mybookings";
  const listView = createElement("div", "customer-bookings-list-view");
  const detailView = createElement("div", "customer-bookings-detail-view");
  detailView.hidden = true;

  const heading = createElement("div", "customer-bookings-heading");
  const headingCopy = createElement("div");
  const bookings = [...(context.d.bookings || [])].sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
  );
  headingCopy.append(
    createElement("span", "", "YOUR STAY HISTORY"),
    createElement("h2", "", "Những kỳ nghỉ của bạn"),
    createElement(
      "p",
      "",
      "Theo dõi thời hạn giữ, khoản cọc đã ghi nhận và bấm vào từng phòng để xem toàn bộ không gian phòng.",
    ),
  );
  heading.append(
    headingCopy,
    createLink("Tìm một kỳ nghỉ mới ↗", "/app/search", "primary"),
  );
  const list = createElement("div", "customer-booking-list");
  const rooms = new Map((context.d.rooms || []).map((room) => [room.id, room]));
  const types = new Map((context.d.types || []).map((type) => [type.id, type]));
  const hotline = context.d.settings?.[0]?.hotline || "lễ tân Aurora";

  const showBookingsList = () => {
    detailView.hidden = true;
    detailView.replaceChildren();
    listView.hidden = false;
  };

  const openRoomFromBooking = (roomData, index, booking) => {
    listView.hidden = true;
    detailView.hidden = false;
    const showcase = renderRoomShowcasePage(
      context,
      root,
      roomData,
      index,
      {
        startAt: String(booking.startAt || "").slice(0, 10),
        endAt: String(booking.endAt || "").slice(0, 10),
        guests: String(booking.guests || 1),
      },
      () => openBookingVoucher(booking, roomData, index),
      null,
    );
    detailView.replaceChildren(showcase);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openBookingVoucher = (booking, room, index) => {
    listView.hidden = true;
    detailView.hidden = false;
    const voucher = renderBookingVoucherPage(
      context,
      root,
      booking,
      room,
      index,
      showBookingsList,
      () => openRoomFromBooking({ ...room, type: room.type || types.get(room.typeId) || {}, quote: booking.roomCharge }, index, booking),
    );
    detailView.replaceChildren(voucher);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!bookings.length) {
    const empty = createElement("div", "customer-empty");
    empty.append(
      createElement("strong", "", "Bạn chưa có kỳ nghỉ nào tại Aurora."),
      createElement("span", "", "Tìm một căn phòng và bắt đầu hành trình đầu tiên."),
      createLink("Khám phá phòng trống", "/app/search", "primary"),
    );
    list.append(empty);
  } else {
    bookings.forEach((booking, index) => {
      const source = rooms.get(booking.roomId) || {
        id: booking.roomId,
        name: booking.roomId,
        typeId: null,
      };
      const room = { ...source, type: types.get(source.typeId) || {} };
      list.append(
        createBookingCard(
          context,
          booking,
          room,
          index,
          hotline,
          openRoomFromBooking,
          openBookingVoucher,
        ),
      );
    });
  }
  listView.append(heading, createTrustRow(context), list);
  root.append(listView, detailView);
  content.replaceChildren(root);
  updateHoldCountdowns(root);
  if (root.querySelector("[data-customer-hold-until]")) {
    const timer = setInterval(() => updateHoldCountdowns(root), 1000);
    stopCountdown(timer);
  }
}

export default function installSearch(getContext) {
  const content = document.querySelector("#page-content");
  if (!content) return;
  let countdownTimer;
  const stopCountdown = (nextTimer) => {
    clearInterval(countdownTimer);
    countdownTimer = nextTimer;
  };
  const enhance = () => {
    const context = getContext();
    if (
      context.page === "search" &&
      !content.querySelector('[data-customer-view="search"]')
    )
      renderCustomerSearch(context, content);
    if (
      context.page === "mybookings" &&
      !content.querySelector('[data-customer-view="mybookings"]')
    )
      renderCustomerBookings(context, content, stopCountdown);
  };
  const observer = new MutationObserver(() => queueMicrotask(enhance));
  observer.observe(content, { childList: true });
  queueMicrotask(enhance);
}

installPublicHome();
