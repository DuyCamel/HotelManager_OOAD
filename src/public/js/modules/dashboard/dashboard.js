/** Information-rich, role-aware operations dashboard. */
let remoteSummary = null;
let remoteRequest = null;

const HOTEL_TIME_ZONE =
  document.body?.dataset.timeZone || "Asia/Ho_Chi_Minh";
const list = (data, key) => (Array.isArray(data[key]) ? data[key] : null);
const timeOf = (value) => {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
};
const dateKey = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: HOTEL_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .map(({ type, value: part }) => [type, part]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
};
const activeBooking = (booking) =>
  ["PENDING", "CONFIRMED", "CHECKED_IN"].includes(booking.status);

function fallbackAlerts(rooms, tasks, services = []) {
  if (!rooms)
    return {
      available: false,
      cleaning: null,
      repair: null,
      service: null,
      urgent: null,
      items: [],
    };

  const roomById = new Map(rooms.map((room) => [room.id, room]));
  const items = [];
  const alertKeys = new Set();
  const add = (item) => {
    const key = `${item.type}:${item.roomId || item.objectId}`;
    if (alertKeys.has(key)) return;
    alertKeys.add(key);
    items.push(item);
  };
  if (tasks) {
    for (const task of tasks.filter((item) => item.status !== "DONE")) {
      const room = roomById.get(task.roomId);
      const overdue = Boolean(
        timeOf(task.deadlineAt) && timeOf(task.deadlineAt) < Date.now(),
      );
      const repair = task.status === "MAINTENANCE";
      add({
        type: repair ? "repair" : "cleaning",
        severity: repair || overdue ? "urgent" : "attention",
        roomId: task.roomId,
        roomName: room?.name || task.roomId,
        deadlineAt: task.deadlineAt || null,
        detail: repair
          ? room?.note || "Phòng đang được đánh dấu bảo trì."
          : overdue
            ? "Đã quá hạn hoàn tất công việc."
            : "Đang chờ hoàn tất công việc buồng phòng.",
      });
    }
  }
  for (const room of rooms.filter((item) =>
    ["DIRTY", "MAINTENANCE"].includes(item.status),
  )) {
    add({
      type: room.status === "MAINTENANCE" ? "repair" : "cleaning",
      severity: room.status === "MAINTENANCE" ? "urgent" : "attention",
      roomId: room.id,
      roomName: room.name || room.id,
      deadlineAt: null,
      detail:
        room.note ||
        (room.status === "MAINTENANCE"
          ? "Phòng đang được đánh dấu bảo trì."
          : "Phòng đang chờ dọn."),
    });
  }
  for (const service of services.filter((item) => !item.isActive))
    add({
      type: "service",
      severity: "attention",
      objectId: service.id,
      roomName: service.name || service.id,
      deadlineAt: null,
      detail: "Dịch vụ đang ngừng cung cấp; cần kiểm tra trước khi tư vấn khách.",
    });

  items.sort(
    (a, b) =>
      Number(b.severity === "urgent") - Number(a.severity === "urgent") ||
      timeOf(a.deadlineAt) - timeOf(b.deadlineAt),
  );
  return {
    available: Boolean(tasks),
    cleaning: items.filter((item) => item.type === "cleaning").length,
    repair: items.filter((item) => item.type === "repair").length,
    service: items.filter((item) => item.type === "service").length,
    urgent: items.filter((item) => item.severity === "urgent").length,
    items: items.slice(0, 8),
  };
}

function derivedOperations(data) {
  const bookings = list(data, "bookings");
  const stays = list(data, "stays");
  const invoices = list(data, "invoices");
  const usage = list(data, "usage");
  if (![bookings, stays, invoices, usage].some(Boolean))
    return { available: false, items: [] };

  const items = [
    ...(bookings || []).map((item) => ({
      at: item.createdAt,
      title: "Tạo đặt phòng",
      detail: item.id,
      kind: "booking",
    })),
    ...(stays || []).flatMap((item) => [
      {
        at: item.checkInAt,
        title: "Nhận phòng",
        detail: item.id,
        kind: "stay",
      },
      ...(item.checkOutAt
        ? [
            {
              at: item.checkOutAt,
              title: "Trả phòng",
              detail: item.id,
              kind: "stay",
            },
          ]
        : []),
    ]),
    ...(invoices || []).map((item) => ({
      at: item.issuedAt,
      title: item.status === "PAID" ? "Thanh toán hóa đơn" : "Lập hóa đơn",
      detail: item.id,
      kind: "invoice",
    })),
    ...(usage || []).map((item) => ({
      at: item.usedAt,
      title: item.isVoided ? "Hủy dịch vụ" : "Ghi nhận dịch vụ",
      detail: item.stayId,
      kind: "service",
    })),
  ]
    .filter((item) => timeOf(item.at))
    .sort((a, b) => timeOf(b.at) - timeOf(a.at))
    .slice(0, 8);
  return { available: true, items };
}

function fallbackSummary(data, role) {
  const rooms = list(data, "rooms");
  const services = list(data, "services");
  const bookings = list(data, "bookings");
  const invoices = list(data, "invoices");
  const tasks = list(data, "tasks");
  const today = dateKey();
  const countRooms = (status) =>
    rooms ? rooms.filter((room) => room.status === status).length : null;
  const audit = list(data, "audit");
  const auditItems = (audit || [])
    .filter((item) => timeOf(item.eventAt))
    .sort((a, b) => timeOf(b.eventAt) - timeOf(a.eventAt))
    .slice(0, 8)
    .map((item) => ({
      at: item.eventAt,
      title: item.action,
      detail: [item.objectType, item.objectId, item.detail]
        .filter(Boolean)
        .join(" / "),
      kind: "audit",
    }));

  return {
    generatedAt: new Date().toISOString(),
    timeZone: HOTEL_TIME_ZONE,
    rooms: {
      available: Boolean(rooms),
      total: rooms?.length ?? null,
      availableRooms: countRooms("AVAILABLE"),
      occupied: countRooms("OCCUPIED"),
      dirty: countRooms("DIRTY"),
      maintenance: countRooms("MAINTENANCE"),
      disabled: countRooms("DISABLED"),
    },
    services: {
      available: Boolean(services),
      total: services?.length ?? null,
      active: services
        ? services.filter((service) => service.isActive).length
        : null,
    },
    today: {
      bookingsAvailable: Boolean(bookings),
      invoicesAvailable: Boolean(invoices),
      arrivals: bookings
        ? bookings.filter(
            (booking) =>
              dateKey(booking.startAt) === today &&
              ["CONFIRMED", "CHECKED_IN"].includes(booking.status),
          ).length
        : null,
      departures: bookings
        ? bookings.filter(
            (booking) =>
              dateKey(booking.endAt) === today &&
              ["CHECKED_IN", "COMPLETED"].includes(booking.status),
          ).length
        : null,
      unpaidBookings: bookings
        ? bookings.filter((booking) => booking.status === "PENDING").length
        : null,
      activeBookings: bookings
        ? bookings.filter(activeBooking).length
        : null,
      unpaidInvoices: invoices
        ? invoices.filter((invoice) => invoice.status !== "PAID").length
        : null,
    },
    alerts: fallbackAlerts(rooms, tasks, services),
    recent:
      role === "MANAGER" && auditItems.length
        ? { available: true, items: auditItems }
        : derivedOperations(data),
  };
}

const number = (value) =>
  value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value))
    ? new Intl.NumberFormat("vi-VN").format(Number(value))
    : "—";
const percent = (part, total) =>
  total > 0 ? Math.round((Number(part || 0) / total) * 100) : 0;

function metricCard(E, metric) {
  const unavailable = metric.value === null || metric.value === undefined;
  return `<article class="dashboard-metric tone-${E(metric.tone)} ${unavailable ? "is-unavailable" : ""}">
    <div class="metric-topline"><span>${E(metric.label)}</span><i aria-hidden="true"></i></div>
    <strong>${unavailable ? "—" : number(metric.value)}</strong>
    <small>${E(unavailable ? "Nguồn dữ liệu chưa được cấp" : metric.detail)}</small>
  </article>`;
}

function renderAlerts(ctx, summary) {
  const { E, btn, role, date } = ctx;
  const alerts = summary.alerts;
  const canOpenBoard = role === "ADMIN";
  const sourceNote = alerts.available
    ? `<span class="source-chip is-live">SLA trực tiếp</span>`
    : `<span class="source-chip">Chưa có dữ liệu thời hạn</span>`;
  const pendingCardCards = (ctx.d.cards || []).filter(
    (c) => c.disableRequest && c.disableRequest.status === "PENDING",
  );
  const pendingCardAlertRow =
    pendingCardCards.length > 0 && role === "ADMIN"
      ? `<li class="alert-row severity-urgent" style="background:#fff9eb;border-left:3.5px solid #d49a24;">
          <span class="alert-marker" style="background:#d49a24;" aria-hidden="true"></span>
          <div>
            <div class="alert-title"><strong style="color:#8c5a00;">Yêu cầu khóa thẻ thành viên</strong><span style="background:#fce8be;color:#784600;padding:2px 7px;border-radius:4px;font-size:11px;font-weight:700;">Cần duyệt gấp</span></div>
            <p style="color:#573900;margin:3px 0 6px;">Có <b>${pendingCardCards.length}</b> thẻ thành viên báo mất / hủy thẻ từ Lễ tân cần Admin phê duyệt khóa thẻ.</p>
            <div>${btn("Xem và duyệt ngay →", "go.cards", "", "small customer-warning")}</div>
          </div>
        </li>`
      : "";
  const rows = alerts.items
    .map(
      (item) => `<li class="alert-row severity-${E(item.severity)}">
        <span class="alert-marker" aria-hidden="true"></span>
        <div>
          <div class="alert-title"><strong>${E(item.roomName || item.roomId || "Mục chưa xác định")}</strong><span>${item.type === "repair" ? "Sửa chữa" : item.type === "service" ? "Dịch vụ" : "Dọn phòng"}</span></div>
          <p>${E(item.detail || "Cần kiểm tra tình trạng phòng.")}</p>
          ${item.deadlineAt ? `<small>Hạn xử lý: ${E(date(item.deadlineAt))}</small>` : ""}
        </div>
      </li>`,
    )
    .join("");
  return `<section class="dashboard-panel alert-panel">
    <header class="panel-heading">
      <div><span class="section-kicker">Cần chú ý</span><h3>Cảnh báo vận hành</h3></div>
      ${sourceNote}
    </header>
    <div class="alert-totals">
      <span><b>${number(alerts.urgent)}</b> khẩn</span>
      <span><b>${number(alerts.cleaning)}</b> cần dọn</span>
      <span><b>${number(alerts.repair)}</b> sửa chữa</span>
      <span><b>${number(alerts.service)}</b> dịch vụ ngừng</span>
    </div>
    ${pendingCardAlertRow || rows ? `<ul class="alert-list">${pendingCardAlertRow}${rows}</ul>` : `<div class="dashboard-empty is-positive"><b>Không có cảnh báo đang mở</b><span>Tình trạng phòng hiện không ghi nhận việc cần ưu tiên.</span></div>`}
    ${canOpenBoard ? `<footer>${btn("Mở sơ đồ phòng", "go.board", "", "accent")}</footer>` : ""}
  </section>`;
}

function renderDayFlow(ctx, summary) {
  const { E, btn, role } = ctx;
  const metrics = [
    ["Khách đến", summary.today.arrivals, "Theo lịch hôm nay"],
    ["Khách rời", summary.today.departures, "Theo lịch hôm nay"],
    ["Chờ cọc", summary.today.unpaidBookings, "Đặt phòng chưa thanh toán cọc"],
    ["Đang hiệu lực", summary.today.activeBookings, "Chờ cọc, đã cọc hoặc đang ở"],
    ["Hóa đơn chưa trả", summary.today.unpaidInvoices, "Chưa ở trạng thái đã thanh toán"],
  ];
  return `<section class="dashboard-panel day-flow-panel">
    <header class="panel-heading">
      <div><span class="section-kicker">Hôm nay</span><h3>Nhịp khách lưu trú</h3></div>
      ${role === "ADMIN" ? btn("Đặt phòng", "go.bookings") : ""}
    </header>
    <div class="day-flow-list">${metrics
      .map(
        ([label, value, detail], index) => `<div class="day-flow-item">
          <span class="flow-index">0${index + 1}</span>
          <div><b>${E(label)}</b><small>${E(value === null ? "Nguồn dữ liệu chưa được cấp" : detail)}</small></div>
          <strong>${value === null ? "—" : number(value)}</strong>
        </div>`,
      )
      .join("")}</div>
  </section>`;
}

function renderRecent(ctx, summary) {
  const { E, date } = ctx;
  const recent = summary.recent;
  if (!recent.available)
    return `<section class="dashboard-panel recent-panel"><header class="panel-heading"><div><span class="section-kicker">Dòng thời gian</span><h3>Hoạt động gần đây</h3></div></header><div class="dashboard-empty"><b>Chưa thể tải hoạt động</b><span>Nguồn dữ liệu chưa được cấp cho vai trò này.</span></div></section>`;

  const rows = recent.items
    .map(
      (item) => `<li>
        <span class="operation-dot kind-${E(item.kind || "operation")}" aria-hidden="true"></span>
        <div><strong>${E(item.title || "Hoạt động hệ thống")}</strong><small>${E(item.detail || "Không có chi tiết")}</small></div>
        <time datetime="${E(item.at || "")}">${E(date(item.at))}</time>
      </li>`,
    )
    .join("");
  return `<section class="dashboard-panel recent-panel">
    <header class="panel-heading"><div><span class="section-kicker">Dòng thời gian</span><h3>Hoạt động gần đây</h3></div><span class="source-chip is-live">Dữ liệu thật</span></header>
    ${rows ? `<ol class="operation-list">${rows}</ol>` : `<div class="dashboard-empty"><b>Chưa có hoạt động</b><span>Các cập nhật mới sẽ xuất hiện tại đây.</span></div>`}
  </section>`;
}

function renderArrivals(ctx) {
  const { E, d, date, role, btn } = ctx;
  const bookings = list(d, "bookings");
  if (!bookings)
    return `<section class="dashboard-panel arrivals-panel"><header class="panel-heading"><div><span class="section-kicker">Lịch đến</span><h3>Khách đến hôm nay</h3></div></header><div class="dashboard-empty"><b>Không có dữ liệu đặt phòng</b><span>Nguồn dữ liệu chưa được cấp cho vai trò này.</span></div></section>`;

  const customers = list(d, "customers") || [];
  const rooms = list(d, "rooms") || [];
  const customerName = (id) =>
    customers.find((item) => String(item.id) === String(id))?.name || id || "—";
  const roomName = (id) =>
    rooms.find((item) => String(item.id) === String(id))?.name || id || "—";
  const today = dateKey();
  const arrivals = bookings
    .filter(
      (booking) =>
        dateKey(booking.startAt) === today &&
        ["CONFIRMED", "CHECKED_IN"].includes(booking.status),
    )
    .sort((a, b) => timeOf(a.startAt) - timeOf(b.startAt))
    .slice(0, 6);
  const rows = arrivals
    .map(
      (booking) => `<li>
        <span class="arrival-monogram" aria-hidden="true">${E(String(customerName(booking.customerId)).charAt(0).toUpperCase())}</span>
        <div><strong>${E(customerName(booking.customerId))}</strong><small>${E(roomName(booking.roomId))} / ${E(booking.guests || 1)} khách</small></div>
        <div class="arrival-time"><b>${E(date(booking.startAt))}</b><span>${booking.status === "CHECKED_IN" ? "Đã nhận phòng" : "Đã xác nhận"}</span></div>
      </li>`,
    )
    .join("");
  return `<section class="dashboard-panel arrivals-panel">
    <header class="panel-heading"><div><span class="section-kicker">Lịch đến</span><h3>Khách đến hôm nay</h3></div>${role === "ADMIN" ? btn("Xem tất cả", "go.bookings") : ""}</header>
    ${rows ? `<ul class="arrival-list">${rows}</ul>` : `<div class="dashboard-empty is-positive"><b>Không có lượt đến đã xác nhận</b><span>Lịch hôm nay hiện chưa có khách đến cần chuẩn bị.</span></div>`}
  </section>`;
}

function renderServiceDirectory(ctx) {
  const { E, money, d, $ } = ctx;
  const services = list(d, "services");
  const title = "Bảng giá dịch vụ";
  if ($("#page-title")) $("#page-title").textContent = title;
  if ($("#crumb")) $("#crumb").textContent = title;
  if ($("#page-description"))
    $("#page-description").textContent =
      "Danh mục tra cứu chỉ đọc dành cho quầy lễ tân.";

  if (!services)
    return `<div class="service-directory"><div class="dashboard-empty"><b>Chưa thể tải bảng giá dịch vụ</b><span>Nguồn dữ liệu chưa được cấp cho vai trò này.</span></div></div>`;

  const active = services.filter((service) => service.isActive).length;
  const cards = [...services]
    .sort(
      (a, b) =>
        Number(Boolean(b.isActive)) - Number(Boolean(a.isActive)) ||
        String(a.name).localeCompare(String(b.name), "vi"),
    )
    .map(
      (service) => `<article class="service-directory-card ${service.isActive ? "is-active" : "is-inactive"}">
        <div class="service-card-topline">
          <span>${E(service.id)}</span>
          <b>${service.isActive ? "Đang phục vụ" : "Tạm ngừng"}</b>
        </div>
        <h2>${E(service.name)}</h2>
        <p>${E(service.description || "Chưa có mô tả dịch vụ.")}</p>
        <footer>
          <strong>${E(money(service.price))}</strong>
          <span>/ ${E(service.unit || "lần")}</span>
        </footer>
      </article>`,
    )
    .join("");

  return `<div class="service-directory">
    <section class="service-directory-intro">
      <div><span class="dashboard-date">Tra cứu tại quầy</span><h2>Giá rõ ràng trước khi ghi nhận dịch vụ.</h2><p>Dữ liệu này chỉ dùng để tư vấn khách và đối chiếu đơn giá. Lễ tân không thể sửa giá hoặc trạng thái danh mục.</p></div>
      <div class="service-directory-summary"><strong>${number(active)}</strong><span>dịch vụ đang phục vụ</span><small>${number(services.length)} mục trong danh mục</small></div>
    </section>
    <div class="readonly-banner"><b>Chế độ chỉ đọc</b><span>Mọi thay đổi giá và danh mục thuộc quyền Quản lý và Admin.</span></div>
    <section class="service-directory-grid">${cards || `<div class="dashboard-empty"><b>Chưa có dịch vụ</b><span>Danh mục hiện chưa có dữ liệu để hiển thị.</span></div>`}</section>
  </div>`;
}

function renderOverview(ctx, summary) {
  const { E, btn, role, $ } = ctx;
  const manager = role === "MANAGER";
  const roomTotal = summary.rooms.total;
  const occupancy = percent(summary.rooms.occupied, roomTotal);
  const availability = percent(summary.rooms.availableRooms, roomTotal);
  const todayLabel = new Intl.DateTimeFormat("vi-VN", {
    timeZone: HOTEL_TIME_ZONE,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());
  const headline = manager
    ? "Một góc nhìn rõ ràng cho quyết định quản trị."
    : "Nắm đúng nhịp khách sạn, xử lý đúng việc ưu tiên.";
  const intro = manager
    ? "Theo dõi công suất, nhu cầu vận hành và các điểm cần kiểm soát trước khi đi sâu vào báo cáo hoặc quản trị hệ thống."
    : "Tình trạng phòng, luồng khách và cảnh báo khẩn được gom trong một màn hình để ca làm việc không bỏ sót việc quan trọng.";
  const actions = manager
    ? [
        btn("Mở báo cáo", "go.reports", "", "primary"),
        btn("Quản lý tài khoản", "go.accounts", ""),
        btn("Sao lưu dữ liệu", "go.backups", ""),
      ]
    : [
        btn("Mở sơ đồ phòng", "go.board", "", "primary"),
        btn("Tạo đặt phòng", "go.bookings", ""),
        btn("Nhận / trả phòng", "go.stays", ""),
      ];
  const metricLink = manager
    ? ""
    : `<div class="metric-link">${btn("Chi tiết phòng", "go.board")}</div>`;
  const metrics = [
    {
      label: "Tổng số phòng",
      value: summary.rooms.available ? summary.rooms.total : null,
      detail: `${number(summary.rooms.disabled)} phòng ngừng hoạt động`,
      tone: "indigo",
    },
    {
      label: "Sẵn sàng",
      value: summary.rooms.available ? summary.rooms.availableRooms : null,
      detail: `${availability}% tổng số phòng`,
      tone: "mint",
    },
    {
      label: "Đang có khách",
      value: summary.rooms.available ? summary.rooms.occupied : null,
      detail: `${occupancy}% công suất hiện tại`,
      tone: "blue",
    },
    {
      label: "Cần dọn",
      value: summary.rooms.available ? summary.rooms.dirty : null,
      detail: "Cần phối hợp buồng phòng",
      tone: "amber",
    },
    {
      label: "Bảo trì",
      value: summary.rooms.available ? summary.rooms.maintenance : null,
      detail: "Cần kiểm tra kỹ thuật",
      tone: "coral",
    },
    {
      label: "Dịch vụ đang bán",
      value: summary.services.available ? summary.services.active : null,
      detail: `${number(summary.services.total)} dịch vụ trong danh mục`,
      tone: "violet",
    },
  ];

  const title = manager ? "Tổng quan quản trị" : "Tổng quan vận hành";
  const description = manager
    ? "Chỉ số khách sạn và trạng thái quản trị quan trọng."
    : "Nhịp vận hành khách sạn trong hôm nay.";
  if ($("#page-title")) $("#page-title").textContent = title;
  if ($("#crumb")) $("#crumb").textContent = title;
  if ($("#page-description")) $("#page-description").textContent = description;

  return `<div class="dashboard-shell" data-dashboard-root>
    <section class="dashboard-hero">
      <div class="hero-copy">
        <span class="dashboard-date">${E(todayLabel)}</span>
        <h2>${E(headline)}</h2>
        <p>${E(intro)}</p>
        <div class="hero-actions">${actions.join("")}</div>
      </div>
      <div class="occupancy-card">
        <div class="occupancy-orbit">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle class="orbit-track" cx="60" cy="60" r="52"></circle>
            <circle class="orbit-value" cx="60" cy="60" r="52" pathLength="100" stroke-dasharray="${occupancy} 100"></circle>
          </svg>
          <span><b>${roomTotal === null ? "—" : `${occupancy}%`}</b><small>Công suất</small></span>
        </div>
        <div class="occupancy-copy">
          <span>Tình trạng tức thời</span>
          <strong>${number(summary.rooms.occupied)} / ${number(roomTotal)} phòng có khách</strong>
          <small>${number(summary.rooms.availableRooms)} phòng sẵn sàng đón khách</small>
        </div>
      </div>
    </section>
    <div class="dashboard-section-heading"><div><span class="section-kicker">Sức khỏe khách sạn</span><h3>Tình trạng phòng & dịch vụ</h3></div>${metricLink}</div>
    <section class="dashboard-metrics">${metrics.map((item) => metricCard(E, item)).join("")}</section>
    <div class="dashboard-split primary-split">${renderAlerts(ctx, summary)}${renderDayFlow(ctx, summary)}</div>
    <div class="dashboard-split secondary-split">${renderRecent(ctx, summary)}${renderArrivals(ctx)}</div>
    <p class="dashboard-footnote">Số liệu cập nhật từ dữ liệu khách sạn hiện có lúc ${E(ctx.date(summary.generatedAt))}. Trường không có nguồn được hiển thị bằng dấu —, không được ước tính.</p>
  </div>`;
}

function loadRemoteSummary(ctx) {
  if (remoteRequest) return;
  remoteRequest = ctx
    .api("/api/modules/dashboard")
    .then((summary) => {
      remoteSummary = summary;
      const root = document.querySelector("[data-dashboard-root]");
      if (root) root.outerHTML = renderOverview(ctx, remoteSummary);
    })
    .catch(() => null);
}

export default function createModule(ctx) {
  return {
    render() {
      if (ctx.page === "services-read") return renderServiceDirectory(ctx);
      if (ctx.page !== "overview") return "";
      const summary = remoteSummary || fallbackSummary(ctx.d, ctx.role);
      queueMicrotask(() => loadRemoteSummary(ctx));
      return renderOverview(ctx, summary);
    },
    async act() {},
  };
}
