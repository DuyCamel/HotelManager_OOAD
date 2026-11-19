/** Dense room operations board with a reduced housekeeping mode. */
const ROOM_STATES = [
  "AVAILABLE",
  "RESERVED",
  "HOLD",
  "OCCUPIED",
  "DIRTY",
  "MAINTENANCE",
  "DISABLED",
];

const stateLabels = {
  AVAILABLE: "Sẵn sàng",
  RESERVED: "Đã đặt",
  HOLD: "Giữ online",
  OCCUPIED: "Đã có khách",
  DIRTY: "Cần dọn",
  MAINTENANCE: "Bảo trì",
  DISABLED: "Ngừng dùng",
};

const localDate = (value = Date.now()) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
};

function weekValue(value) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + 4 - (date.getDay() || 7));
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return `${date.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function mondayOfWeek(value) {
  const match = /^(\d{4})-W(\d{2})$/.exec(value || "");
  if (!match) return new Date(`${localDate()}T12:00:00`);
  const fourth = new Date(Number(match[1]), 0, 4, 12);
  const monday = new Date(fourth);
  monday.setDate(
    fourth.getDate() - ((fourth.getDay() + 6) % 7) + (Number(match[2]) - 1) * 7,
  );
  return monday;
}

const boardFilters = {
  number: "",
  date: localDate(),
  week: weekValue(localDate()),
  view: "day",
  floor: "",
  amenity: "",
  viewName: "",
  type: "",
  status: "",
};

let activeContext;
let handlersInstalled = false;
let boardSyncTimer = null;

function ensureOperationsStyles() {
  const href = "/assets/css/workspace/operations.css";
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.append(link);
}

ensureOperationsStyles();

const sameId = (left, right) => String(left) === String(right);
const canViewGuests = (ctx) =>
  ["ADMIN", "RECEPTIONIST"].includes(ctx.role);
const canViewRoom = (ctx) => canViewGuests(ctx) || ctx.role === "HOUSEKEEPER";

function currentRoomId(ctx, stay) {
  if (stay.currentRoomId) return stay.currentRoomId;
  const openHistory = (ctx.d.history || []).find(
    (item) => sameId(item.stayId, stay.id) && !item.toAt,
  );
  if (openHistory?.roomId) return openHistory.roomId;
  if (stay.roomId) return stay.roomId;
  return (ctx.d.bookings || []).find((item) => sameId(item.id, stay.bookingId))
    ?.roomId;
}

function dayRange(value) {
  const start = new Date(`${value}T00:00:00+07:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return [start.getTime(), end.getTime()];
}

function overlapsDay(booking, value) {
  const [start, end] = dayRange(value);
  const bookingStart = Date.parse(booking.startAt);
  const bookingEnd = Date.parse(booking.endAt);
  return (
    Number.isFinite(bookingStart) &&
    Number.isFinite(bookingEnd) &&
    bookingStart < end &&
    bookingEnd > start
  );
}

function snapshotFor(ctx, room, value) {
  const stays = ctx.d.stays || [];
  const bookings = ctx.d.bookings || [];
  const today = value === localDate();
  const [dayStart, dayEnd] = dayRange(value);
  // Today's actions must target the open stay, not any guest present earlier today.
  const assignment = (ctx.d.history || []).find(
    (item) =>
      sameId(item.roomId, room.id) &&
      (today
        ? !item.toAt && stays.some((stay) => sameId(stay.id, item.stayId) && !stay.checkOutAt)
        : Date.parse(item.fromAt) < dayEnd &&
          (!item.toAt || Date.parse(item.toAt) > dayStart)),
  );
  const assignedStay = assignment
    ? stays.find((item) => sameId(item.id, assignment.stayId))
    : null;
  const assignedBooking = assignedStay
    ? bookings.find((item) => sameId(item.id, assignedStay.bookingId))
    : null;
  const stay = assignedStay && assignedBooking ? assignedStay : null;
  const stayBooking = stay ? assignedBooking : null;
  const stayedBookingIds = new Set(stays.map((item) => String(item.bookingId)));
  const booking =
    stayBooking ||
    bookings
      .filter(
        (item) =>
          sameId(item.roomId, room.id) &&
          !stayedBookingIds.has(String(item.id)) &&
          !["COMPLETED", "CANCELLED"].includes(item.status) &&
          overlapsDay(item, value),
      )
      .sort((left, right) => {
        const priority = { CHECKED_IN: 3, CONFIRMED: 2, PENDING: 1 };
        return (priority[right.status] || 0) - (priority[left.status] || 0);
      })[0];
  const customer = booking
    ? (ctx.d.customers || []).find((item) =>
        sameId(item.id, booking.customerId),
      )
    : null;
  let status;

  if (stay) status = "OCCUPIED";
  else if (today && ["DISABLED", "MAINTENANCE"].includes(room.status))
    status = room.status;
  else if (today && room.status === "DIRTY") status = "DIRTY";
  else if (booking?.status === "PENDING") status = "HOLD";
  else if (booking?.status === "CONFIRMED") status = "RESERVED";
  else if (booking?.status === "CHECKED_IN") status = "OCCUPIED";
  else status = today ? room.status || "AVAILABLE" : "AVAILABLE";

  return { room, status, booking, stay, customer };
}

function typeFor(ctx, room) {
  return (ctx.d.types || []).find((item) => sameId(item.id, room.typeId));
}

function roomMetadata(room) {
  const marker = "\n\n--- Thông tin danh mục ---\n";
  const stored = String(room.note || "");
  const markerAt = stored.indexOf(marker);
  let nativeGallery = Array.isArray(room.galleryUrls)
    ? room.galleryUrls.slice()
    : [];
  if (!nativeGallery.length && room.imageGalleryJson) {
    try {
      const parsed =
        typeof room.imageGalleryJson === "string"
          ? JSON.parse(room.imageGalleryJson)
          : room.imageGalleryJson;
      if (Array.isArray(parsed))
        nativeGallery = parsed.filter((item) => typeof item === "string");
    } catch {
      nativeGallery = [];
    }
  }
  const details = {
    note: markerAt >= 0 ? stored.slice(0, markerAt).trim() : stored,
    view: room.viewName || room.view || "",
    amenities: room.amenities || "",
    gallery: nativeGallery,
  };
  if (markerAt < 0) return details;
  for (const line of stored.slice(markerAt + marker.length).split("\n")) {
    if (line.startsWith("Hướng nhìn: ") && !details.view)
      details.view = line.slice("Hướng nhìn: ".length).trim();
    else if (line.startsWith("Tiện nghi riêng: ") && !details.amenities)
      details.amenities = line.slice("Tiện nghi riêng: ".length).trim();
    else if (line.startsWith("Ảnh bộ sưu tập: "))
      details.gallery.push(line.slice("Ảnh bộ sưu tập: ".length).trim());
  }
  return details;
}

function amenityValues(ctx) {
  const amenityText = [
    ...(ctx.d.types || []).map((item) => item.amenities),
    ...(ctx.d.rooms || []).map((item) => roomMetadata(item).amenities),
  ];
  return [
    ...new Set(
      amenityText.flatMap((value) =>
        String(value || "")
          .split(/[·,;|]/)
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    ),
  ].sort((left, right) => left.localeCompare(right, "vi"));
}

function roomFloor(room) {
  const fromNote = String(room?.note || "").match(/tầng\s*(\d+)/i);
  if (fromNote) return fromNote[1];
  const fromName = String(room?.name || room?.id || "").match(/([1-9])\d{2}/);
  return fromName ? fromName[1] : "";
}

const DEFAULT_VIEW_OPTIONS = [
  "Hướng phố",
  "Hướng vườn",
  "Hướng hồ bơi",
  "Hướng biển / Sông",
  "Hướng nội khu",
  "Tiêu chuẩn (Không cửa sổ)",
];

function viewValues(ctx) {
  const custom = (ctx.d.rooms || [])
    .map((room) => roomMetadata(room).view)
    .filter(Boolean);
  return [...new Set([...custom, ...DEFAULT_VIEW_OPTIONS])].sort((left, right) =>
    left.localeCompare(right, "vi"),
  );
}

function floorValues(ctx) {
  return [
    ...new Set(
      (ctx.d.rooms || []).map((room) => roomFloor(room)).filter(Boolean),
    ),
  ].sort((a, b) => Number(a) - Number(b));
}

function matchesRoom(ctx, room, snapshots) {
  const type = typeFor(ctx, room);
  const metadata = roomMetadata(room);
  const haystack = `${room.id || ""} ${room.name || ""}`.toLocaleLowerCase(
    "vi",
  );
  if (
    boardFilters.number &&
    !haystack.includes(boardFilters.number.toLocaleLowerCase("vi"))
  )
    return false;
  if (boardFilters.floor && roomFloor(room) !== String(boardFilters.floor))
    return false;
  if (boardFilters.type && !sameId(room.typeId, boardFilters.type)) return false;
  if (boardFilters.viewName) {
    const view = (metadata.view || "").toLocaleLowerCase("vi");
    const target = boardFilters.viewName.toLocaleLowerCase("vi");
    if (!view || (!view.includes(target) && !target.includes(view)))
      return false;
  }
  if (
    boardFilters.amenity &&
    !`${type?.amenities || ""} ${metadata.amenities}`
      .toLocaleLowerCase("vi")
      .includes(boardFilters.amenity.toLocaleLowerCase("vi"))
  )
    return false;
  if (
    boardFilters.status &&
    !snapshots.some((snapshot) => snapshot.status === boardFilters.status)
  )
    return false;
  return true;
}

function formatDay(value, options = {}) {
  if (!value) return "—";
  const str = String(value).trim();
  const date = new Date(str.length === 10 ? `${str}T12:00:00+07:00` : str);
  if (Number.isNaN(date.getTime())) return value || "—";
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      ...options,
    }).formatToParts(date);
    const p = Object.fromEntries(parts.map((item) => [item.type, item.value]));
    if (options.weekday) {
      const vnWeekday = new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        weekday: options.weekday,
      }).format(date);
      return `${vnWeekday}, ${p.day}/${p.month}/${p.year}`;
    }
    return `${p.day}/${p.month}/${p.year}`;
  } catch {
    return date.toLocaleDateString("vi-VN", options);
  }
}

function filterOption(ctx, value, label, current) {
  return `<option value="${ctx.E(value)}" ${value === current ? "selected" : ""}>${ctx.E(label)}</option>`;
}

function renderFilters(ctx, housekeepingOnly) {
  const amenityOptions = amenityValues(ctx)
    .map((item) => filterOption(ctx, item, item, boardFilters.amenity))
    .join("");
  const viewOptions = viewValues(ctx)
    .map((item) => filterOption(ctx, item, item, boardFilters.viewName))
    .join("");
  const floorOptions = floorValues(ctx)
    .map((fl) => filterOption(ctx, fl, `Tầng ${fl}`, boardFilters.floor))
    .join("");
  const visibleStatuses = housekeepingOnly
    ? ["AVAILABLE", "OCCUPIED", "DIRTY", "MAINTENANCE", "DISABLED"]
    : ROOM_STATES;
  const statusOptions = visibleStatuses.map((item) =>
    filterOption(ctx, item, stateLabels[item], boardFilters.status),
  ).join("");

  if (housekeepingOnly)
    return `<div class="operation-toolbar housekeeping-toolbar" style="max-width:780px;grid-template-columns:minmax(200px,2fr) repeat(2,minmax(140px,1fr))" aria-label="Bộ lọc buồng phòng">
      <label class="operation-filter operation-filter-wide">Số phòng
        <input type="search" data-room-filter="number" value="${ctx.E(boardFilters.number)}" placeholder="Nhập số phòng…" autocomplete="off">
      </label>
      <label class="operation-filter">Tầng
        <select data-room-filter="floor"><option value="">Tất cả tầng</option>${floorOptions}</select>
      </label>
      <label class="operation-filter">Trạng thái
        <select data-room-filter="status"><option value="">Tất cả</option>${statusOptions}</select>
      </label>
    </div>`;

  const isWeekView = boardFilters.view === "week";
  const typePills = [
    `<button type="button" class="operation-type-pill ${!boardFilters.type ? "is-active" : ""}" data-room-filter-type="" aria-pressed="${!boardFilters.type}">Tất cả</button>`,
    ...(ctx.d.types || []).map((type) => {
      const active = sameId(boardFilters.type, type.id);
      const price = ctx.money
        ? ctx.money(type.nightlyPrice || 0)
        : `${Number(type.nightlyPrice || 0).toLocaleString("vi-VN")} ₫`;
      return `<button type="button" class="operation-type-pill ${active ? "is-active" : ""}" data-room-filter-type="${ctx.E(type.id)}" aria-pressed="${active}"><span>${ctx.E(type.name || type.id)}</span><span class="pill-price">${price}/đêm</span></button>`;
    }),
  ].join("");

  return `<div class="operation-toolbar reception-board-toolbar" aria-label="Bộ lọc sơ đồ phòng">
    <label class="operation-filter operation-filter-wide">Số phòng
      <input type="search" data-room-filter="number" value="${ctx.E(boardFilters.number)}" placeholder="Tìm số phòng…" autocomplete="off">
    </label>
    <label class="operation-filter">Chế độ xem
      <select data-room-filter="view">
        ${filterOption(ctx, "day", "Sơ đồ ngày", boardFilters.view)}
        ${filterOption(ctx, "week", "Lịch tuần", boardFilters.view)}
      </select>
    </label>
    <label class="operation-filter" ${isWeekView ? 'style="display:none"' : ""}>Ngày
      <input type="date" lang="vi-VN" data-room-filter="date" value="${ctx.E(boardFilters.date)}">
    </label>
    <label class="operation-filter" ${isWeekView ? "" : 'style="display:none"'}>Tuần
      <input type="week" data-room-filter="week" value="${ctx.E(boardFilters.week)}">
    </label>
    <label class="operation-filter">Tầng
      <select data-room-filter="floor"><option value="">Tất cả tầng</option>${floorOptions}</select>
    </label>
    <label class="operation-filter">Hướng nhìn
      <select data-room-filter="viewName"><option value="">Tất cả</option>${viewOptions}</select>
    </label>
    <label class="operation-filter">Tiện nghi
      <select data-room-filter="amenity"><option value="">Tất cả</option>${amenityOptions}</select>
    </label>
    <label class="operation-filter operation-filter-status">Trạng thái
      <select data-room-filter="status"><option value="">Tất cả</option>${statusOptions}</select>
    </label>
    <div class="operation-filter operation-filter-types">
      <span>Loại phòng &amp; Giá niêm yết</span>
      <div class="operation-type-pills" role="toolbar" aria-label="Lọc theo loại phòng và giá niêm yết">
        ${typePills}
      </div>
    </div>
  </div>`;
}

function renderSummary(ctx, housekeepingOnly) {
  const snapshots = (ctx.d.rooms || []).map((room) =>
    snapshotFor(ctx, room, boardFilters.date),
  );
  const counts = Object.fromEntries(
    ROOM_STATES.map((status) => [
      status,
      snapshots.filter((snapshot) => snapshot.status === status).length,
    ]),
  );
  const openTasks = (ctx.d.tasks || []).filter((task) => task.status !== "DONE");
  const overdue = openTasks.filter(
    (task) => task.deadlineAt && Date.parse(task.deadlineAt) < Date.now(),
  ).length;
  const items = housekeepingOnly
    ? [
        ["Cần dọn", counts.DIRTY || 0, "DIRTY"],
        ["Bảo trì", counts.MAINTENANCE || 0, "MAINTENANCE"],
        ["Quá hạn", overdue, overdue ? "OVERDUE" : "DONE"],
      ]
    : [
        ["Sẵn sàng", counts.AVAILABLE || 0, "AVAILABLE"],
        ["Đã đặt / giữ", (counts.RESERVED || 0) + (counts.HOLD || 0), "RESERVED"],
        ["Đã có khách", counts.OCCUPIED || 0, "OCCUPIED"],
        ["Cần xử lý", (counts.DIRTY || 0) + (counts.MAINTENANCE || 0), "DIRTY"],
      ];
  return `<div class="operation-summary" aria-label="Tóm tắt trạng thái">${items
    .map(
      ([label, count, status]) =>
        `<div><span class="status-dot is-${String(status).toLowerCase()}"></span><small>${ctx.E(label)}</small><strong>${Number(count)}</strong></div>`,
    )
    .join("")}</div>`;
}

function taskForRoom(ctx, roomId) {
  return (ctx.d.tasks || []).find(
    (task) => sameId(task.roomId, roomId) && task.status !== "DONE",
  );
}

function renderRoomCard(ctx, snapshot, housekeepingOnly) {
  const { room, status } = snapshot;
  const type = typeFor(ctx, room);
  const task = taskForRoom(ctx, room.id);
  const overdue = Boolean(
    task?.deadlineAt && Date.parse(task.deadlineAt) < Date.now(),
  );
  const secondary =
    status === "DIRTY" && overdue
      ? "⚡ Ưu tiên dọn khẩn"
      : housekeepingOnly && task?.deadlineAt
        ? `Hạn ${ctx.date(task.deadlineAt)}`
        : "";
  const roomLabel = `${room.name || room.id}, ${stateLabels[status] || status}`;
  return `<article class="operation-room-card is-${ctx.E(status.toLowerCase())}${overdue && status === "DIRTY" ? " is-urgent-clean" : ""}" ${canViewRoom(ctx) ? `data-action="room.detail" data-id="${ctx.E(room.id)}" role="button" tabindex="0"` : ""} aria-label="${ctx.E(roomLabel)}">
    <span class="operation-room-top"><strong>${ctx.E(room.name || room.id)}</strong><span class="operation-state is-${ctx.E(status.toLowerCase())}">${ctx.E(stateLabels[status] || status)}</span></span>
    <span class="operation-room-type">${ctx.E(type?.name || "Chưa có loại")}</span>
    ${secondary ? `<small class="${overdue && status === "DIRTY" ? "urgent-clean-tag" : ""}">${ctx.E(secondary)}</small>` : ""}

  </article>`;
}

function renderDayBoard(ctx, housekeepingOnly) {
  const rows = (ctx.d.rooms || [])
    .map((room) => ({ room, snapshots: [snapshotFor(ctx, room, boardFilters.date)] }))
    .filter(({ room, snapshots }) => matchesRoom(ctx, room, snapshots));
  if (housekeepingOnly) {
    rows.sort((left, right) => {
      const leftTask = taskForRoom(ctx, left.room.id);
      const rightTask = taskForRoom(ctx, right.room.id);
      const leftUrgent =
        left.snapshots[0].status === "DIRTY" &&
        leftTask?.deadlineAt &&
        Date.parse(leftTask.deadlineAt) < Date.now()
          ? 0
          : left.snapshots[0].status === "DIRTY"
            ? 1
            : 2;
      const rightUrgent =
        right.snapshots[0].status === "DIRTY" &&
        rightTask?.deadlineAt &&
        Date.parse(rightTask.deadlineAt) < Date.now()
          ? 0
          : right.snapshots[0].status === "DIRTY"
            ? 1
            : 2;
      return leftUrgent - rightUrgent;
    });
  }
  return `<div class="operation-board-head"><div><h2>${housekeepingOnly ? "Việc buồng phòng" : `Sơ đồ ${formatDay(boardFilters.date, { weekday: "long", day: "2-digit", month: "2-digit" })}`}</h2><p>${rows.length} phòng phù hợp bộ lọc</p></div><div class="room-state-legend">${ROOM_STATES.map((status) => `<span><i class="status-dot is-${status.toLowerCase()}"></i>${ctx.E(stateLabels[status])}</span>`).join("")}<button type="button" class="small" data-board-refresh title="Đồng bộ trạng thái phòng mới nhất">↻ Làm mới</button></div></div>
    <div class="operation-room-grid">${
      rows
        .map(({ snapshots }) => renderRoomCard(ctx, snapshots[0], housekeepingOnly))
        .join("") || '<p class="operation-empty">Không có phòng phù hợp.</p>'
    }</div>`;
}

function weekDays() {
  const monday = mondayOfWeek(boardFilters.week);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return localDate(date);
  });
}

function renderWeekBoard(ctx) {
  const days = weekDays();
  const rows = (ctx.d.rooms || [])
    .map((room) => ({
      room,
      snapshots: days.map((value) => snapshotFor(ctx, room, value)),
    }))
    .filter(({ room, snapshots }) => matchesRoom(ctx, room, snapshots));
  return `<div class="operation-board-head"><div><h2>Lịch phòng theo tuần</h2><p>${formatDay(days[0], { day: "2-digit", month: "2-digit" })} – ${formatDay(days[6], { day: "2-digit", month: "2-digit", year: "numeric" })}</p></div><span class="readonly-pill">Bấm một ô để xem chi tiết</span></div>
    <div class="week-board" role="region" aria-label="Lịch phòng tuần" tabindex="0">
      <div class="week-board-grid">
        <div class="week-corner">Phòng</div>
        ${days.map((value) => `<div class="week-day"><strong>${ctx.E(formatDay(value, { weekday: "short" }))}</strong><span>${ctx.E(formatDay(value, { day: "2-digit", month: "2-digit" }))}</span></div>`).join("")}
        ${rows
          .map(({ room, snapshots }) => {
            const type = typeFor(ctx, room);
            return `<div class="week-room"><strong>${ctx.E(room.name || room.id)}</strong><span>${ctx.E(type?.name || "—")}</span></div>${snapshots
              .map(
                (snapshot, index) =>
                  `<button type="button" class="week-cell is-${ctx.E(snapshot.status.toLowerCase())}" ${canViewRoom(ctx) ? `data-action="room.detail" data-id="${ctx.E(room.id)}" data-room-date="${ctx.E(days[index])}"` : "disabled"} aria-label="${ctx.E(`${room.name || room.id}, ${formatDay(days[index])}: ${stateLabels[snapshot.status] || snapshot.status}`)}"><span>${ctx.E(stateLabels[snapshot.status] || snapshot.status)}</span></button>`,
              )
              .join("")}`;
          })
          .join("") || '<p class="operation-empty">Không có phòng phù hợp.</p>'}
      </div>
    </div>`;
}

function renderBoard(ctx) {
  const housekeepingOnly = ctx.role === "HOUSEKEEPER";
  return `${renderFilters(ctx, housekeepingOnly)}${renderSummary(ctx, housekeepingOnly)}<section class="panel operation-board">${
    boardFilters.view === "week" && !housekeepingOnly
      ? renderWeekBoard(ctx)
      : renderDayBoard(ctx, housekeepingOnly)
  }</section>`;
}

function rerenderBoard(focusKey) {
  if (!activeContext || activeContext.page !== "board") return;
  const target = document.querySelector("#page-content");
  if (!target) return;
  target.innerHTML = renderBoard(activeContext);
  if (focusKey) {
    const input = target.querySelector(`[data-room-filter="${focusKey}"]`);
    input?.focus();
    if (input?.setSelectionRange)
      input.setSelectionRange(input.value.length, input.value.length);
  }
}

function updateBoardFilter(event) {
  const control = event.target.closest("[data-room-filter]");
  if (!control) return;
  if (event.type === "input" && control.tagName === "SELECT") return;
  if (event.type === "change" && control.type === "search") return;
  const key = control.dataset.roomFilter;
  boardFilters[key] = control.value;
  if (key === "date" && control.value) boardFilters.week = weekValue(control.value);
  if (key === "week" && control.value)
    boardFilters.date = localDate(mondayOfWeek(control.value));
  rerenderBoard(key === "number" ? key : null);
}

function safeImageSource(value) {
  const source = String(value || "").trim();
  if (!source || source.includes("..") || source.startsWith("//")) return "";
  if (/^data:image\/(png|jpeg|webp);base64,/i.test(source)) return source;
  if (/^https:/i.test(source)) {
    try {
      const parsed = new URL(source);
      return parsed.username || parsed.password ? "" : parsed.href;
    } catch {
      return "";
    }
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(source)) return "";
  return source.startsWith("/") ? source : `/${source.replace(/^\.\//, "")}`;
}

function detailItem(ctx, label, value) {
  return `<div><dt>${ctx.E(label)}</dt><dd>${ctx.E(value ?? "—")}</dd></div>`;
}

function openRoomDetail(ctx, id) {
  if (!canViewRoom(ctx)) return ctx.toast("Bạn không có quyền xem chi tiết phòng.");
  const room = (ctx.d.rooms || []).find((item) => sameId(item.id, id));
  if (!room) return ctx.toast("Không còn dữ liệu phòng này.");
  document.querySelector("#room-operations-dialog")?.remove();
  const housekeepingOnly = ctx.role === "HOUSEKEEPER";
  const snapshot = snapshotFor(ctx, room, boardFilters.date);
  const { booking, stay, customer, status } = snapshot;
  const type = typeFor(ctx, room);
  const metadata = roomMetadata(room);
  const task = taskForRoom(ctx, room.id);
  const damages = (ctx.d.damages || []).filter((item) =>
    sameId(item.roomId, room.id),
  );
  const defaultTypeImage = {
    LP01: "/assets/img/room-single.jpg",
    LP02: "/assets/img/room-double.jpg",
    LP03: "/assets/img/room-vip.jpg",
    DON: "/assets/img/room-single.jpg",
    DOI: "/assets/img/room-double.jpg",
    VIP: "/assets/img/room-vip.jpg",
  }[room.typeId] || "/assets/img/room-single.jpg";
  const imageSource = safeImageSource(
    room.imagePath || metadata.gallery[0] || defaultTypeImage,
  );
  const live = boardFilters.date === localDate();
  const canReport =
    live && ctx.clean && !["OCCUPIED", "DISABLED"].includes(room.status);
  const canClean = live && ctx.clean && room.status === "DIRTY";
  const canUrge = live && !housekeepingOnly && room.status === "DIRTY";
  const isAlreadyUrgent = Boolean(
    task?.deadlineAt && Date.parse(task.deadlineAt) < Date.now(),
  );
  const canResolve = live && ctx.catalog && room.status === "MAINTENANCE";
  const quickActions = [];

  if (!live) {
    // Historical views are read-only; mutations always act on today's state.
  } else if (housekeepingOnly) {
    if (canClean)
      quickActions.push(
        ctx.btn("Đánh dấu đã sạch", "room.clean", room.id, "primary"),
      );
    if (canReport)
      quickActions.push(
        ctx.btn("Báo bảo trì / hư hỏng", "room.damage", room.id),
      );
  } else {
    if (stay) {
      quickActions.push(ctx.btn("Ghi dịch vụ", "usage.stay", stay.id));
      quickActions.push(ctx.btn("Gia hạn", "stay.extend", stay.id));
      quickActions.push(ctx.btn("Đổi phòng", "stay.move", stay.id));
      quickActions.push(
        ctx.btn("Trả phòng", "stay.checkout", stay.id, "primary"),
      );
    } else if (booking?.status === "PENDING") {
      quickActions.push(
        ctx.btn("Xác nhận cọc", "booking.deposit", booking.id, "primary"),
      );
    } else if (booking?.status === "CONFIRMED") {
      quickActions.push(
        ctx.btn("Nhận phòng", "stay.checkin", booking.id, "primary"),
      );
    } else if (status === "AVAILABLE") {
      quickActions.push(ctx.btn("Nhận phòng ngay", "stay.walkin", room.id));
      quickActions.push(
        ctx.btn("Đặt phòng này", "booking.new", room.id, "primary"),
      );
    }
    if (canUrge)
      quickActions.push(
        ctx.btn(
          isAlreadyUrgent
            ? "⚡ Nhắc lại Buồng phòng dọn khẩn"
            : "⚡ Báo Buồng phòng dọn khẩn",
          "room.urge",
          room.id,
          isAlreadyUrgent ? "" : "primary",
        ),
      );
    if (canClean)
      quickActions.push(ctx.btn("Đánh dấu đã sạch", "room.clean", room.id));
    if (canResolve)
      quickActions.push(
        ctx.btn("Xác nhận đã sửa xong", "room.resolve", room.id, "primary"),
      );
    if (canReport)
      quickActions.push(ctx.btn("Báo hư hỏng", "room.damage", room.id));
  }

  const bookingBody = booking
    ? `<dl class="operation-detail-list">
        ${detailItem(ctx, "Mã đặt phòng", booking.id)}
        ${detailItem(ctx, "Khách hàng", customer?.name || "Chưa có dữ liệu")}
        ${detailItem(ctx, "Điện thoại", customer?.phone)}
        ${detailItem(ctx, "CCCD / Hộ chiếu", stay?.identityNo || customer?.identityNo)}
        ${detailItem(ctx, "Kỳ lưu trú", `${ctx.date(booking.startAt)} → ${ctx.date(booking.endAt)}`)}
        ${detailItem(ctx, "Kênh", booking.channel === "ONLINE" ? "Online" : "Tại quầy")}
      </dl>`
    : '<p class="muted">Không có đặt phòng đang hoạt động cho ngày đã chọn.</p>';
  const taskBody = task
    ? `<dl class="operation-detail-list">
        ${detailItem(ctx, "Trạng thái việc", task.status)}
        ${detailItem(ctx, "Hạn hoàn tất", ctx.date(task.deadlineAt))}
        ${detailItem(ctx, "Ghi chú phòng", metadata.note || "Không có")}
      </dl>`
    : '<p class="muted">Phòng không có nhiệm vụ đang mở.</p>';
  const bookingDetails = canViewGuests(ctx)
    ? (() => {
        const openStayIds = new Set(
          (ctx.d.stays || [])
            .filter((s) => !s.checkOutAt && sameId(currentRoomId(ctx, s), room.id))
            .map((s) => String(s.bookingId)),
        );
        const roomBookings = (ctx.d.bookings || [])
          .filter(
            (b) =>
              (sameId(b.roomId, room.id) || openStayIds.has(String(b.id))) &&
              !["COMPLETED", "CANCELLED"].includes(b.status),
          )
          .slice();
        if (booking && !roomBookings.some((b) => sameId(b.id, booking.id)))
          roomBookings.push(booking);
        roomBookings.sort((a, b) => Date.parse(a.startAt || 0) - Date.parse(b.startAt || 0));
        const listHtml = roomBookings.length
          ? `<details class="room-guest-disclosure"><summary>Khách đặt (${roomBookings.length}) · Bấm để xem danh sách đặt / lưu trú</summary><div class="room-guest-list">${roomBookings
              .map((b) => {
                const bStay =
                  (sameId(stay?.bookingId, b.id) ? stay : null) ||
                  (ctx.d.stays || []).find((s) => sameId(s.bookingId, b.id) && !s.checkOutAt);
                const bCustomer = (ctx.d.customers || []).find((c) => sameId(c.id, b.customerId));
                const bState =
                  bStay || b.status === "CHECKED_IN"
                    ? "Đang ở"
                    : b.status === "CONFIRMED"
                      ? "Đã đặt"
                      : b.status === "PENDING"
                        ? "Giữ chỗ"
                        : b.status;
                return `<dl class="operation-detail-list room-guest-entry">${detailItem(ctx, "Trạng thái / Mã", `${bState} · ${b.id}`)}${detailItem(ctx, "Khách hàng", bCustomer?.name || "Chưa có dữ liệu")}${detailItem(ctx, "Điện thoại", bCustomer?.phone)}${detailItem(ctx, "CCCD / Hộ chiếu", bStay?.identityNo || bCustomer?.identityNo)}${detailItem(ctx, "Kỳ lưu trú", `${ctx.date(b.startAt)} → ${ctx.date(b.endAt)}`)}${detailItem(ctx, "Kênh", b.channel === "ONLINE" ? "Online" : "Tại quầy")}</dl>`;
              })
              .join("")}</div></details>`
          : '<p class="muted">Không có đặt phòng đang hoạt động cho phòng này.</p>';
        return `<section class="room-guest-summary"><h3>Khách đặt</h3>${listHtml}</section>`;
      })()
    : `<section class="room-guest-summary"><h3>Nhiệm vụ hiện tại</h3>${taskBody}</section>`;

  const dialog = document.createElement("dialog");
  dialog.id = "room-operations-dialog";
  dialog.className = "operations-dialog room-operations-dialog";
  dialog.setAttribute("aria-labelledby", "room-operations-title");
  dialog.setAttribute("aria-describedby", "room-operations-status");
  dialog.innerHTML = `<div class="dialog-head">
      <div><span class="eyebrow">${housekeepingOnly ? "BUỒNG PHÒNG" : "ROOM DESK"}</span><h2 id="room-operations-title">${ctx.E(room.name || room.id)}</h2><p id="room-operations-status"><span class="operation-state is-${ctx.E(status.toLowerCase())}">${ctx.E(stateLabels[status] || status)}</span> · ${ctx.E(formatDay(boardFilters.date, { day: "2-digit", month: "2-digit", year: "numeric" }))}</p></div>
      <button type="button" class="icon-button" data-operation-close aria-label="Đóng chi tiết phòng">×</button>
    </div>
    <div class="room-detail-layout">
      <div class="room-photo-frame">${
        imageSource
          ? `<img src="${ctx.E(imageSource)}" alt="${ctx.E(`Hình ảnh ${room.name || room.id}`)}">`
          : ""
      }<div class="room-photo-fallback" ${imageSource ? "hidden" : ""}><span aria-hidden="true">▦</span><strong>Chưa có ảnh phòng</strong><small>Ảnh sẽ hiển thị khi đường dẫn đã cấu hình có thể tải trong chính sách nội dung.</small></div></div>
      <section><h3>Tóm tắt phòng</h3><dl class="operation-detail-list">
        ${detailItem(ctx, "Loại phòng", type?.name)}
        ${detailItem(ctx, "Sức chứa", type?.capacity ? `${type.capacity} khách · ${type.beds || "—"} giường` : "—")}
        ${detailItem(ctx, "Tiện nghi", [type?.amenities, metadata.amenities].filter(Boolean).join(" · ") || "Chưa cập nhật")}
        ${detailItem(ctx, "Hướng nhìn", metadata.view || "Chưa cập nhật")}
        ${detailItem(ctx, "Trạng thái thực tế", stateLabels[room.status] || room.status)}
        ${detailItem(ctx, "Ghi chú", metadata.note || "Không có")}
      </dl></section>
      ${bookingDetails}
    </div>
    ${
      damages.length
        ? `<section class="damage-history"><h3>Báo cáo hư hỏng</h3>${damages
            .slice()
            .reverse()
            .map(
              (damage) =>
                `<p><span>${ctx.E(damage.description || "Không có mô tả")}</span><a href="/damage-photo/${encodeURIComponent(damage.id)}" target="_blank" rel="noopener">Xem ảnh hiện trạng</a></p>`,
            )
            .join("")}</section>`
        : ""
    }
    <div class="dialog-actions operation-quick-actions"><button type="button" data-operation-close>Đóng</button>${quickActions.join("")}</div>`;
  document.body.append(dialog);
  dialog.querySelector(".room-guest-disclosure")?.setAttribute("open", "");
  const image = dialog.querySelector("img");
  image?.addEventListener("error", () => {
    image.hidden = true;
    dialog.querySelector(".room-photo-fallback").hidden = false;
  });
  dialog.addEventListener("close", () => dialog.remove(), { once: true });
  dialog.showModal();
  dialog.querySelector("[data-operation-close]")?.focus();
}

function installHandlers() {
  if (handlersInstalled) return;
  handlersInstalled = true;
  document.addEventListener("input", updateBoardFilter);
  document.addEventListener("change", updateBoardFilter);
  document.addEventListener(
    "click",
    (event) => {
      const refreshBtn = event.target.closest?.("[data-board-refresh]");
      if (refreshBtn && activeContext?.refresh) {
        refreshBtn.disabled = true;
        activeContext.refresh().finally(() => {
          refreshBtn.disabled = false;
        });
        return;
      }
      const typeBtn = event.target.closest?.("[data-room-filter-type]");
      if (typeBtn) {
        event.preventDefault();
        const targetType = typeBtn.dataset.roomFilterType || "";
        boardFilters.type = boardFilters.type === targetType ? "" : targetType;
        rerenderBoard();
        return;
      }
      const datedCell = event.target.closest("[data-room-date]");
      if (datedCell?.dataset.roomDate) boardFilters.date = datedCell.dataset.roomDate;
      const dialog = event.target.closest("#room-operations-dialog");
      if (!dialog) return;
      if (event.target.closest("[data-operation-close]")) {
        event.preventDefault();
        dialog.close();
        return;
      }
      if (event.target.closest("[data-action]")) dialog.close();
    },
    true,
  );
  if (typeof setInterval === "function" && !boardSyncTimer) {
    boardSyncTimer = setInterval(() => {
      if (
        activeContext?.page === "board" &&
        activeContext?.refresh &&
        !document.querySelector("dialog[open]")
      ) {
        activeContext.refresh().catch(() => {});
      }
    }, 20000);
  }
}

export default function createModule(ctx) {
  activeContext = ctx;
  installHandlers();
  const editor = document.querySelector("#editor");
  editor?.setAttribute("aria-labelledby", "dialog-title");
  editor
    ?.querySelector("[data-close]")
    ?.setAttribute("aria-label", "Đóng hộp thoại");

  return {
    render() {
      return ctx.page === "board" ? renderBoard(ctx) : "";
    },
    async act(action, id) {
      const hidden = () => ctx.field("id", "", "hidden", id);
      if (action === "room.detail") return openRoomDetail(ctx, id);
      if (action === "room.urge") {
        await ctx.api("/api/action/room.urge", { id });
        await ctx.refresh();
        ctx.toast("⚡ Đã thông báo ưu tiên dọn khẩn cho bộ phận Buồng phòng.");
        return;
      }
      if (action === "room.damage") {
        const editorDialog = document.querySelector("#editor");
        if (editorDialog?.open) editorDialog.close();
        ctx.form(
          "Báo bảo trì / hư hỏng",
          [hidden(), ctx.field("description", "Mô tả hiện trạng", "textarea")],
          async (body) => {
            const file = document.querySelector("#damage-photo")?.files?.[0];
            if (!file) throw new Error("Chọn ảnh JPG hoặc PNG.");
            const data = new FormData();
            data.append("photo", file);
            data.append("id", id);
            data.append("description", body.description);
            const response = await fetch("/api/damage", {
              method: "POST",
              headers: {
                "X-CSRF-Token": document.querySelector(
                  'meta[name="csrf-token"]',
                ).content,
              },
              body: data,
            });
            let result = {};
            try {
              result = await response.json();
            } catch {
              result = {};
            }
            if (!response.ok)
              throw new Error(result.error || "Không thể gửi báo cáo hư hỏng.");
            await ctx.refresh();
            ctx.toast("Đã ghi nhận bảo trì / hư hỏng.");
          },
          "Gửi báo cáo",
          "Ảnh là bằng chứng hiện trạng; hệ thống không tự xác nhận đã sửa xong.",
        );
        const label = document.createElement("label");
        label.textContent = "Ảnh hiện trạng (JPG/PNG, tối đa 3 MB)";
        const input = document.createElement("input");
        input.id = "damage-photo";
        input.type = "file";
        input.accept = "image/png,image/jpeg";
        input.required = true;
        label.append(input);
        document.querySelector("#dialog-fields")?.append(label);
      }
    },
    board: () => renderBoard(ctx),
  };
}
