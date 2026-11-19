/** Khung workspace: state, table, dialog, điều phối module. Không chứa màn hình/nghiệp vụ riêng. TODO TV1 A6: tiếp tục chuẩn hóa loading/401. */
import module0 from "../modules/housekeeping/housekeeping.js";
import module1 from "../modules/dashboard/dashboard.js";
import module2 from "../modules/bookings/bookings.js";
import module3 from "../modules/stays/stays.js";
import module4 from "../modules/customers/customers.js";
import module5 from "../modules/service-usage/service-usage.js";
import module6 from "../modules/memberships/memberships.js";
import module7 from "../modules/invoices/invoices.js";
import module8 from "../modules/rooms/rooms.js";
import module9 from "../modules/accounts/accounts.js";
import module10 from "../modules/reports/reports.js";
import module11 from "../modules/settings/settings.js";
import module12 from "../modules/profile/profile.js";
import module13 from "../modules/auth/auth.js";
import module14 from "../modules/backups/backups.js";
import module15 from "../modules/audit/audit.js";
import installSearch from "../modules/bookings/search.js";
const factories = {
  housekeeping: module0,
  dashboard: module1,
  bookings: module2,
  stays: module3,
  customers: module4,
  "service-usage": module5,
  memberships: module6,
  invoices: module7,
  rooms: module8,
  accounts: module9,
  reports: module10,
  settings: module11,
  profile: module12,
  auth: module13,
  backups: module14,
  audit: module15,
};
const pageModules = {
    overview: "dashboard",
    board: "housekeeping",
    bookings: "bookings",
    mybookings: "bookings",
    stays: "stays",
    customers: "customers",
    usage: "service-usage",
    cards: "memberships",
    mycard: "memberships",
    invoices: "invoices",
    catalog: "rooms",
    accounts: "accounts",
    reports: "reports",
    system: "settings",
    profile: "profile",
    search: "bookings",
    settings: "settings",
    backups: "backups",
    audit: "audit",
  },
  actionModules = {
    "catalog.tab": "rooms",
    "report.filter": "reports",
    "report.export": "reports",
    "room.detail": "housekeeping",
    "booking.new": "bookings",
    "booking.deposit": "bookings",
    "booking.scan": "bookings",
    "booking.detail": "bookings",
    "booking.cancel": "bookings",
    "stay.checkin": "stays",
    "stay.walkin": "stays",
    "stay.move": "stays",
    "stay.extend": "stays",
    "stay.checkout": "invoices",
    "usage.new": "service-usage",
    "usage.stay": "service-usage",
    "customer.new": "customers",
    "customer.edit": "customers",
    "card.new": "memberships",
    "card.requestDisable": "memberships",
    "card.approveDisable": "memberships",
    "card.rejectDisable": "memberships",
    "card.reactivate": "memberships",
    "catalog.new": "rooms",
    "catalog.edit": "rooms",
    "catalog.toggle": "rooms",
    "catalog.bulkEditPrompt": "rooms",
    "catalog.bulkEdit": "rooms",
    "account.new": "accounts",
    "account.edit": "accounts",
    "account.role": "accounts",
    "admin.transfer": "auth",
    "system.edit": "settings",
    "profile.edit": "profile",
    "profile.password": "profile",
    "room.damage": "housekeeping",
  },
  pageUrls = {
    overview: "/app/dashboard",
    board: "/app/housekeeping",
    bookings: "/app/bookings",
    stays: "/app/stays",
    customers: "/app/customers",
    usage: "/app/service-usage",
    cards: "/app/memberships",
    invoices: "/app/invoices",
    catalog: "/app/rooms",
    accounts: "/app/accounts",
    reports: "/app/reports",
    system: "/app/settings",
    settings: "/app/settings",
    backups: "/app/backups",
    audit: "/app/audit",
    profile: "/app/profile",
    search: "/app/search",
    mybookings: "/app/mybookings",
    mycard: "/app/mycard",
  };

function context() {
  return {
    api,
    money,
    E,
    role,
    manager,
    catalog,
    clean,
    $,
    labels,
    titles,
    name,
    date,
    formatDate,
    badge,
    btn,
    field,
    opts,
    toast,
    command,
    form,
    actionForm,
    table,
    stats,
    choosePage,
    refresh,
    d,
    page,
    query,
    pageNo,
    board: () => moduleOf("housekeeping").board(),
    bookingTable: (rows) => moduleOf("bookings").bookingTable(rows),
    catalogPanel: () => moduleOf("rooms").catalogPanel(),
    catalogFields: (...args) => moduleOf("rooms").catalogFields(...args),
    report: () => moduleOf("reports").report(),
    act: (action, id) => act(action, id),
  };
}
function moduleOf(name) {
  return factories[name](context());
}
function moduleForPage() {
  return moduleOf(pageModules[page] || "dashboard");
}
function board() {
  return moduleOf("housekeeping").board();
}
function render() {
  if (typeof window !== "undefined") {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }
  const t =
    page === "catalog"
      ? [$("#page-title").textContent, $("#page-description").textContent]
      : titles[page] || titles.board;
  $("#page-title").textContent = t[0];
  $("#crumb").textContent = t[0];
  $("#page-description").textContent = t[1];
  $("#page-actions").innerHTML =
    {
      bookings: `${btn("📷 Quét mã đặt phòng", "booking.scan", "", "secondary")} ${btn("+ Đặt phòng tại quầy", "booking.new", "", "primary")}`,
      customers: btn("+ Thêm khách hàng", "customer.new", "", "primary"),
      usage: btn("+ Ghi dịch vụ", "usage.new", "", "primary"),
      cards: btn("+ Cấp thẻ", "card.new", "", "primary"),
      accounts: manager || role === "ADMIN"
        ? btn("+ Tạo tài khoản", "account.new", "", "primary")
        : "",
      catalog: catalog
        ? `${(sessionStorage.getItem("catalogTab") || "rooms") === "rooms" ? `${btn("⚡ Sửa nhanh", "catalog.bulkEditPrompt", "", "secondary")} ` : ""}${btn("+ Thêm danh mục", "catalog.new", "", "primary")}`
        : "",
    }[page] || "";
  let html = "";
  $("#page-content").innerHTML = moduleForPage().render();
  document
    .querySelectorAll("#side-nav button")
    .forEach((b) => b.classList.toggle("active", b.dataset.page === page));
  syncNotificationIndicators();
}

function syncNotificationIndicators() {
  const cards = Array.isArray(d?.cards) ? d.cards : [];
  const pendingCards = cards.filter(
    (c) => c?.disableRequest && c.disableRequest.status === "PENDING",
  );
  const pendingCount = pendingCards.length;

  const sidebarBadge = document.querySelector("#sidebar-cards-badge");
  if (sidebarBadge) {
    if (pendingCount > 0 && ["ADMIN", "MANAGER"].includes(role)) {
      sidebarBadge.textContent = pendingCount;
      sidebarBadge.hidden = false;
      sidebarBadge.title = `${pendingCount} yêu cầu vô hiệu hóa thẻ đang chờ duyệt`;
    } else {
      sidebarBadge.hidden = true;
    }
  }

  const topbarBadge = document.querySelector("#topbar-notifications-badge");
  const headerBadge = document.querySelector("#notifications-header-badge");
  const notificationsList = document.querySelector("#notifications-list");
  const notificationsEmpty = document.querySelector("#notifications-empty");
  const footerLink = document.querySelector("#notifications-footer-link");

  const totalCount = ["ADMIN", "MANAGER"].includes(role) ? pendingCount : 0;

  if (topbarBadge) {
    if (totalCount > 0) {
      topbarBadge.textContent = totalCount;
      topbarBadge.hidden = false;
    } else {
      topbarBadge.hidden = true;
    }
  }

  if (headerBadge) {
    if (totalCount > 0) {
      headerBadge.textContent = totalCount;
      headerBadge.hidden = false;
    } else {
      headerBadge.hidden = true;
    }
  }

  if (footerLink) {
    footerLink.style.display =
      ["ADMIN", "MANAGER"].includes(role) ? "inline-block" : "none";
  }

  if (notificationsList && notificationsEmpty) {
    if (totalCount === 0) {
      notificationsList.innerHTML = "";
      notificationsEmpty.hidden = false;
    } else {
      notificationsEmpty.hidden = true;
      const customers = Array.isArray(d?.customers) ? d.customers : [];
      const customerMap = new Map(customers.map((c) => [c.id, c]));

      notificationsList.innerHTML = pendingCards
        .map((card) => {
          const cust = customerMap.get(card.customerId);
          const custName = cust?.name || card.customerId;
          const req = card.disableRequest || {};
          const reason = req.reason || "Khách báo mất thẻ";
          const sender = req.requestedBy || "Lễ tân";
          const time = req.requestedAt
            ? new Date(req.requestedAt).toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit",
              })
            : "Chờ duyệt";

          return `
            <div class="notification-item urgent" data-notification-card="${E(card.id)}">
              <div class="notification-item-top">
                <span class="notification-badge-chip">⚠️ Yêu cầu khóa thẻ</span>
                <span class="notification-time">${E(time)}</span>
              </div>
              <div class="notification-item-body">
                <div><strong>${E(card.id)}</strong> — ${E(custName)}</div>
                <div class="notification-item-meta">Lý do: <em>${E(reason)}</em> (gửi bởi ${E(sender)})</div>
              </div>
              <div class="notification-item-actions">
                <button type="button" class="notification-btn-approve" data-notify-approve="${E(card.id)}">Duyệt khóa</button>
                <button type="button" class="notification-btn-reject" data-notify-reject="${E(card.id)}">Từ chối</button>
              </div>
            </div>
          `;
        })
        .join("");
    }
  }
}
async function act(action, id) {
  const hidden = () => field("id", "", "hidden", id);
  if (action.startsWith("go.")) return choosePage(action.split(".")[1]);
  if (action === "prev" || action === "next") {
    pageNo += action === "prev" ? -1 : 1;
    return render();
  }
  const module = factories[actionModules[action]];
  if (module) return module(context()).act(action, id);
  const confirms = {
    "booking.cancel": "Hủy phiếu chưa cọc?",
    "usage.void": "Hủy dòng dịch vụ này?",
    "customer.archive": "Lưu trữ hồ sơ khách?",
    "card.disable": "Vô hiệu hóa thẻ?",
    "card.approveDisable": "Phê duyệt vô hiệu hóa thẻ thành viên?",
    "card.rejectDisable": "Từ chối yêu cầu vô hiệu hóa thẻ?",
    "card.reactivate": "Mở lại thẻ thành viên đã vô hiệu hóa?",
    "account.toggle": "Đổi trạng thái tài khoản?",
    "room.clean": "Xác nhận phòng đã sạch và sẵn sàng?",
    "room.resolve": "Xác nhận việc sửa chữa đã hoàn tất và mở lại phòng?",
    "system.backup": "Tạo bản sao dữ liệu hiện tại?",
    "system.restore":
      "Khôi phục sẽ thay thế dữ liệu demo bằng bản sao đã chọn và kết thúc mọi phiên. Tiếp tục?",
  };
  if (confirms[action])
    return actionForm(
      "Xác nhận thao tác",
      [hidden()],
      action,
      confirms[action],
    );
}

("use strict");
const { api, money, escape: E } = Hotel;
let d = {},
  page = "",
  query = "",
  pageNo = 1;
const role = document.body.dataset.role;
const manager = role === "MANAGER",
  catalog = role === "ADMIN",
  clean = ["ADMIN", "HOUSEKEEPER"].includes(role);
const $ = (s) => document.querySelector(s);
const labels = {
  AVAILABLE: "Sẵn sàng",
  OCCUPIED: "Đang ở",
  DIRTY: "Cần dọn",
  MAINTENANCE: "Bảo trì",
  DISABLED: "Ngừng hoạt động",
  PENDING: "Chờ cọc",
  CONFIRMED: "Đã cọc",
  CHECKED_IN: "Đang lưu trú",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
  PAID: "Đã thanh toán",
  DRAFT: "Nháp",
  DONE: "Đã dọn",
  OPEN: "Chờ xử lý",
  CASH: "Tiền mặt",
  TRANSFER: "Chuyển khoản",
  CARD: "Thẻ",
  ADMIN: "Admin",
  MANAGER: "Quản lý",
  RECEPTIONIST: "Nhân viên",
  HOUSEKEEPER: "Buồng phòng",
  CUSTOMER: "Khách hàng",
};
const titles = {
  settings: ["Cấu hình khách sạn", "Thông tin và quy tắc đang áp dụng."],
  backups: [
    "Sao lưu và khôi phục",
    "Chỉ Quản lý được thao tác sao lưu/khôi phục.",
  ],
  audit: ["Nhật ký hoạt động", "Lịch sử thay đổi trong hệ thống."],
  overview: [
    "Tổng quan vận hành",
    "Một góc nhìn rõ ràng cho ngày làm việc của bạn.",
  ],
  board: ["Sơ đồ phòng", "Theo dõi trạng thái phòng và phối hợp vận hành."],
  bookings: ["Đặt phòng", "Tra cứu lịch đặt, xác nhận cọc và quản lý giữ chỗ."],
  stays: [
    "Nhận & trả phòng",
    "Kiểm tra giấy tờ, ghi dịch vụ và hoàn tất kỳ lưu trú.",
  ],
  customers: [
    "Khách hàng",
    "Quản lý hồ sơ, thông tin liên hệ và lịch sử lưu trú.",
  ],
  usage: [
    "Dịch vụ sử dụng",
    "Ghi nhận phát sinh theo phiếu thuê; giá được lưu tại thời điểm sử dụng.",
  ],
  cards: [
    "Thẻ thành viên",
    "Theo dõi điểm tích lũy tự động từ hóa đơn đã thanh toán.",
  ],
  invoices: ["Hóa đơn", "Bảng kê và chứng từ cho mỗi kỳ lưu trú."],
  catalog: [
    "Phòng & danh mục",
    "Quản lý phòng, loại phòng, dịch vụ và các đợt giá lễ.",
  ],
  accounts: [
    "Tài khoản",
    "Tài khoản đăng nhập bằng email, được kiểm soát theo vai trò.",
  ],
  reports: [
    "Báo cáo doanh thu",
    "Doanh thu ghi nhận từ hóa đơn đã thanh toán.",
  ],
  system: ["Hệ thống", "Cấu hình khách sạn, sao lưu và lịch sử thao tác."],
  search: [
    "Tìm kỳ nghỉ tiếp theo",
    "Chọn khoảng thời gian và căn phòng phù hợp với bạn.",
  ],
  mybookings: [
    "Đặt phòng của tôi",
    "Phiếu online được giữ 10 phút để liên hệ xác nhận cọc.",
  ],
  mycard: [
    "Thẻ thành viên của tôi",
    "Mỗi 10.000 ₫ trên hóa đơn được tích 1 điểm.",
  ],
  profile: ["Hồ sơ cá nhân", "Thông tin liên hệ và bảo mật tài khoản."],
};
const name = (k, id) =>
  (d[k] || []).find((x) => String(x.id) === String(id))?.name || id || "—";
function formatDMY(val, withTime = false) {
  if (!val) return "—";
  const str = String(val).trim();
  if (!str) return "—";
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m && str.length === 10) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return str || "—";
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const p = Object.fromEntries(parts.map((item) => [item.type, item.value]));
    return withTime && p.hour && p.minute
      ? `${p.hour}:${p.minute} ${p.day}/${p.month}/${p.year}`
      : `${p.day}/${p.month}/${p.year}`;
  } catch {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    if (!withTime) return `${day}/${month}/${year}`;
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes} ${day}/${month}/${year}`;
  }
}
const date = (x) => {
  if (!x) return "—";
  const str = String(x).trim();
  return formatDMY(str, str.length > 10);
};
const formatDate = (x) => formatDMY(x, false);
const badge = (x) => `<span class="badge ${E(x)}">${E(labels[x] || x)}</span>`;
const btn = (text, action, id = "", extra = "") =>
  `<button type="button" class="small ${extra}" data-action="${E(action)}" data-id="${E(id)}">${E(text)}</button>`;
const field = (key, title, type = "text", value = "", options = null) => ({
  key,
  title,
  type,
  value,
  options,
});
const opts = (k, filter = () => true) =>
  (d[k] || []).filter(filter).map((x) => [x.id, x.name || x.id]);
function toast(t) {
  $("#toast").textContent = t;
  $("#toast").classList.add("visible");
  setTimeout(() => $("#toast").classList.remove("visible"), 4200);
}
async function refresh() {
  d = await api("/api/data");
  render();
}
async function command(action, body) {
  const r = await api("/api/action/" + action, body);
  if (r.logout || r.logoutAll || action === "admin.transfer") {
    location.href = "/login";
    return r;
  }
  await refresh();
  toast(r.message || "Đã lưu thay đổi.");
  return r;
}
let submitHandler;
function form(title, fields, handler, button = "Lưu thay đổi", note = "") {
  $("#editor .primary").onclick = null;
  $("#dialog-title").textContent = title;
  $("#dialog-fields").innerHTML =
    (note ? `<p class="form-note">${E(note)}</p>` : "") +
    fields
      .map((f) => {
        if (f.type === "hidden")
          return `<input type="hidden" name="${E(f.key)}" value="${E(f.value)}">`;
        const control =
          f.type === "select"
            ? `<select name="${E(f.key)}" ${f.optional ? "" : "required"}>${f.options.map(([v, t]) => `<option value="${E(v)}" ${String(v) === String(f.value) ? "selected" : ""}>${E(t)}</option>`).join("")}</select>`
            : f.type === "textarea"
              ? `<textarea name="${E(f.key)}" maxlength="1000">${E(f.value)}</textarea>`
              : `<input name="${E(f.key)}" type="${E(f.type)}" value="${E(f.value)}" ${f.type === "tel" ? 'pattern="0[0-9]{9}" maxlength="10" title="Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0" placeholder="0xxxxxxxxx"' : ""} ${f.type === "date" ? 'lang="vi-VN"' : ""} ${f.type === "number" ? 'min="0" step="1"' : ""} ${f.optional ? "" : "required"} ${f.type === "password" ? 'minlength="8"' : ""}>`;
        return `<label>${E(f.title)}${control}</label>`;
      })
      .join("");
  $("#editor .form-message").textContent = "";
  $("#editor .primary").textContent = button;
  submitHandler = handler;
  $("#editor").showModal();
}
function actionForm(title, fields, action, note, submit) {
  form(
    title,
    fields,
    submit ||
      (async (b) => {
        await command(action, b);
      }),
    "Xác nhận",
    note,
  );
}
function table(rows, columns) {
  const filtered = rows.filter((r) =>
    JSON.stringify(r).toLowerCase().includes(query.toLowerCase()),
  );
  const total = filtered.length;
  pageNo = Math.max(1, Math.min(pageNo, Math.ceil(total / 12) || 1));
  const slice = filtered.slice((pageNo - 1) * 12, pageNo * 12);
  return `<div class="panel"><div class="table-toolbar"><label class="search-box">⌕ <input id="table-search" placeholder="Tìm theo tên, mã, trạng thái…" value="${E(query)}"></label><span class="muted">${total} bản ghi</span></div><div class="table-scroll"><table><thead><tr>${columns.map((c) => `<th>${E(c[0])}</th>`).join("")}</tr></thead><tbody>${slice.map((r) => `<tr>${columns.map((c) => `<td>${c[1](r)}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${columns.length}" class="empty">Chưa có dữ liệu phù hợp.</td></tr>`}</tbody></table></div><div class="pagination"><span>Trang ${pageNo} / ${Math.ceil(total / 12) || 1}</span><div>${btn("← Trước", "prev")}${btn("Sau →", "next")}</div></div></div>`;
}
function stats() {
  const rooms = d.rooms || [];
  return `<div class="stats">${[
    ["Tổng số phòng", rooms.length, "▦"],
    [
      "Đang lưu trú",
      rooms.filter((r) => r.status === "OCCUPIED").length,
      "↗",
    ],
    [
      "Sẵn sàng đón khách",
      rooms.filter((r) => r.status === "AVAILABLE").length,
      "✦",
    ],
    [
      "Cần dọn / bảo trì",
      rooms.filter((r) => ["DIRTY", "MAINTENANCE"].includes(r.status)).length,
      "♧",
    ],
  ]
    .map(
      ([t, n, i]) =>
        `<article><div><span>${t}</span><strong>${n.toString().padStart(2, "0")}</strong></div><i>${i}</i></article>`,
    )
    .join("")}</div>`;
}
function choosePage(p) {
  const target =
    p === "invoices" && role === "CUSTOMER" ? "/portal/invoices" : pageUrls[p];
  if (target) location.href = target;
}
function openHotelPolicyDialog() {
  const settings = d?.settings?.[0] || {};
  const hotelName = settings.hotelName || "Khách sạn Aurora (Aurora Hotel)";
  const checkInTime = /^\d{2}:\d{2}/.test(settings.checkInTime || "")
    ? settings.checkInTime.slice(0, 5)
    : "14:00";
  const checkOutTime = /^\d{2}:\d{2}/.test(settings.checkOutTime || "")
    ? settings.checkOutTime.slice(0, 5)
    : "12:00";
  const lateFeeFrom = /^\d{2}:\d{2}/.test(settings.lateFeeFrom || "")
    ? settings.lateFeeFrom.slice(0, 5)
    : "13:00";
  const lateFeePercent = Number(settings.lateFeePercent || 30);

  const dialog = document.createElement("dialog");
  dialog.className = "hotel-policy-modal";
  dialog.setAttribute("aria-label", "Chính sách & Quy định khách sạn");

  dialog.innerHTML = `
    <div class="policy-modal-shell">
      <div class="policy-modal-head">
        <div>
          <span class="policy-eyebrow">AURORA HOTEL & RESORT · THÔNG TIN DÀNH CHO QUÝ KHÁCH</span>
          <h2>Chính sách & Quy định lưu trú</h2>
          <p>Thời gian nhận / trả phòng, biểu phí phụ thu và các hướng dẫn chi tiết tại khách sạn.</p>
        </div>
        <button type="button" class="policy-close-btn" data-policy-close aria-label="Đóng">✕</button>
      </div>

      <div class="policy-modal-body">
        <!-- 1. THỜI GIAN NHẬN & TRẢ PHÒNG -->
        <article class="policy-card">
          <h3 class="policy-card-title"><span class="card-icon">🕒</span> 1. Thời gian nhận phòng & trả phòng tiêu chuẩn</h3>
          <div class="policy-grid-2col">
            <div class="policy-subitem">
              <h4>Giờ nhận phòng (Check-in)</h4>
              <p>Bắt đầu từ <span class="policy-time-pill">${E(checkInTime)}</span> chiều.</p>
              <p>Trường hợp Quý khách đến sớm hơn, khách sạn sẽ hỗ trợ nhận phòng sớm nếu đã có phòng trống sẵn sàng, hoặc hỗ trợ gửi hành lý hoàn toàn miễn phí tại sảnh.</p>
            </div>
            <div class="policy-subitem">
              <h4>Giờ trả phòng (Check-out)</h4>
              <p>Trước <span class="policy-time-pill">${E(checkOutTime)}</span> trưa.</p>
              <p>Quý khách vui lòng hoàn tất thủ tục trả phòng và bàn giao thẻ từ trước ${E(checkOutTime)} để bộ phận buồng phòng chuẩn bị phòng cho lượt khách kế tiếp.</p>
            </div>
          </div>
        </article>

        <!-- 2. QUY ĐỊNH PHỤ THU -->
        <article class="policy-card">
          <h3 class="policy-card-title"><span class="card-icon">⏱️</span> 2. Quy định phụ thu nhận sớm & trả muộn</h3>
          <div class="policy-grid-2col">
            <div class="policy-subitem">
              <h4>Trả phòng muộn (Late Check-out)</h4>
              <p>• Từ <strong>${E(checkOutTime)} đến 15:00</strong> (sau giờ phụ thu ${E(lateFeeFrom)}): Phụ thu <strong>${lateFeePercent}%</strong> giá phòng 1 đêm.</p>
              <p>• Từ <strong>15:00 đến 18:00</strong>: Phụ thu <strong>50%</strong> giá phòng 1 đêm.</p>
              <p>• Sau <strong>18:00</strong>: Phụ thu <strong>100%</strong> giá phòng (tính trọn 1 đêm lưu trú).</p>
            </div>
            <div class="policy-subitem">
              <h4>Nhận phòng sớm (Early Check-in)</h4>
              <p>• Từ <strong>09:00 đến ${E(checkInTime)}</strong>: Phụ thu <strong>30%</strong> giá phòng 1 đêm (áp dụng khi có phòng trống).</p>
              <p>• Từ <strong>06:00 đến 09:00</strong>: Phụ thu <strong>50%</strong> giá phòng 1 đêm.</p>
              <p>• Trước <strong>06:00 sáng</strong>: Phụ thu <strong>100%</strong> giá phòng 1 đêm.</p>
            </div>
          </div>
        </article>

        <!-- 3. HƯỚNG DẪN NHẬN PHÒNG -->
        <article class="policy-card">
          <h3 class="policy-card-title"><span class="card-icon">🔑</span> 3. Hướng dẫn quy trình nhận phòng (Check-in)</h3>
          <div class="policy-steps-list">
            <div class="policy-step-item">
              <span class="policy-step-num">1</span>
              <div class="policy-step-content">
                <strong>Xuất trình giấy tờ tùy thân hợp lệ</strong>
                <p>Quý khách vui lòng xuất trình CCCD gắn chip (hoặc Hộ chiếu còn hạn đối với khách quốc tịch nước ngoài) của tất cả khách lưu trú để khách sạn khai báo lưu trú theo quy định.</p>
              </div>
            </div>
            <div class="policy-step-item">
              <span class="policy-step-num">2</span>
              <div class="policy-step-content">
                <strong>Xuất trình mã đặt phòng</strong>
                <p>Mở mục "Đặt phòng của tôi" để hiển thị mã QR hoặc cung cấp Mã đặt phòng / Số điện thoại tại quầy lễ tân để đối soát nhanh trong 30 giây.</p>
              </div>
            </div>
            <div class="policy-step-item">
              <span class="policy-step-num">3</span>
              <div class="policy-step-content">
                <strong>Đối soát thanh toán & tiền đặt cọc</strong>
                <p>Khách sạn hỗ trợ nhiều hình thức thanh toán thuận tiện: Quét mã QR chuyển khoản SePay tự động, thẻ thanh toán (Visa/Mastercard) hoặc tiền mặt.</p>
              </div>
            </div>
            <div class="policy-step-item">
              <span class="policy-step-num">4</span>
              <div class="policy-step-content">
                <strong>Nhận thẻ từ & chìa khóa phòng</strong>
                <p>Lễ tân bàn giao thẻ từ (Key Card), mã kết nối Wi-Fi tốc độ cao và hướng dẫn đường lên phòng cùng thông tin tiện ích (hồ bơi, nhà hàng, phòng gym...).</p>
              </div>
            </div>
          </div>
        </article>

        <!-- 4. HƯỚNG DẪN TRẢ PHÒNG -->
        <article class="policy-card">
          <h3 class="policy-card-title"><span class="card-icon">🧳</span> 4. Hướng dẫn quy trình trả phòng (Check-out)</h3>
          <div class="policy-steps-list">
            <div class="policy-step-item">
              <span class="policy-step-num">1</span>
              <div class="policy-step-content">
                <strong>Kiểm tra hành lý & tư trang cá nhân</strong>
                <p>Quý khách kiểm tra kỹ tủ quần áo, ngăn kéo bàn, két sắt an toàn, phòng tắm và ban công để đảm bảo không bỏ quên tài sản trước khi rời phòng.</p>
              </div>
            </div>
            <div class="policy-step-item">
              <span class="policy-step-num">2</span>
              <div class="policy-step-content">
                <strong>Bàn giao thẻ phòng tại Quầy lễ tân</strong>
                <p>Mang thẻ phòng xuống quầy lễ tân trước ${E(checkOutTime)} để nhân viên tiến hành kiểm phòng nhanh và hoàn tất thủ tục.</p>
              </div>
            </div>
            <div class="policy-step-item">
              <span class="policy-step-num">3</span>
              <div class="policy-step-content">
                <strong>Đối soát dịch vụ & Nhận hóa đơn</strong>
                <p>Nhân viên in phiếu thanh toán chi tiết (tiền phòng, dịch vụ minibar, đồ uống, giặt là, điểm tích lũy thành viên đã trừ) và hoàn tất thanh toán.</p>
              </div>
            </div>
            <div class="policy-step-item">
              <span class="policy-step-num">4</span>
              <div class="policy-step-content">
                <strong>Hỗ trợ gửi hành lý miễn phí</strong>
                <p>Nếu Quý khách có chuyến bay muộn hoặc muốn dạo phố, khách sạn hỗ trợ gửi hành lý miễn phí tại quầy lễ tân đến tối cùng ngày.</p>
              </div>
            </div>
          </div>
        </article>

        <!-- 5. QUY ĐỊNH CHUNG -->
        <article class="policy-card">
          <h3 class="policy-card-title"><span class="card-icon">🛡️</span> 5. Quy định chung của khách sạn</h3>
          <ul class="policy-rules-list">
            <li><strong>Không hút thuốc:</strong> Tuyệt đối không hút thuốc trong phòng ngủ và các khu vực kín. Khách có nhu cầu hút thuốc vui lòng sử dụng khu vực ban công ngoài trời hoặc khu vực quy định (phí khử mùi & vệ sinh sâu 1.500.000 đ nếu vi phạm).</li>
            <li><strong>Giữ gìn không gian yên tĩnh:</strong> Hạn chế gây tiếng ồn lớn sau 22:00 đêm để đảm bảo giấc ngủ và sự riêng tư cho các phòng lân cận.</li>
            <li><strong>An toàn & Phòng cháy chữa cháy:</strong> Nghiêm cấm mang theo chất cháy nổ, vũ khí, chất cấm hoặc hàng cấm theo quy định pháp luật vào khuôn viên khách sạn.</li>
            <li><strong>Bảo quản tài sản khách sạn:</strong> Quý khách vui lòng giữ gìn trang thiết bị và đồ dùng trong phòng. Trường hợp làm mất hoặc hư hỏng sẽ được tính phí bồi hoàn theo biểu giá niêm yết.</li>
          </ul>
        </article>

        <!-- 6. LỜI CẢM ƠN TỪ AURORA HOTEL -->
        <div class="policy-thanks-card">
          <span class="policy-thanks-icon">💐</span>
          <h3>Lời cảm ơn chân thành từ Aurora Hotel</h3>
          <p>
            "Toàn thể Ban Quản Lý và Đội Ngũ Nhân Viên ${E(hotelName)} xin gửi lời tri ân sâu sắc nhất đến Quý khách đã tin tưởng và lựa chọn khách sạn chúng tôi làm điểm dừng chân. Sự thoải mái, an yên và nụ cười hài lòng của Quý khách chính là niềm vinh hạnh và động lực lớn nhất của chúng tôi. Kính chúc Quý khách luôn có những chuyến đi tràn đầy niềm vui, sức khỏe và những kỷ niệm thật đẹp tại Aurora!"
          </p>
          <span class="policy-thanks-author">— BAN QUẢN LÝ & TOÀN THỂ NHÂN VIÊN AURORA HOTEL —</span>
        </div>
      </div>

      <div class="policy-modal-foot">
        <button type="button" class="policy-btn-done" data-policy-close>Đã hiểu quy định</button>
      </div>
    </div>
  `;

  const closeModal = () => {
    dialog.close();
  };
  dialog.addEventListener("scroll", () => {
    if (dialog.scrollTop !== 0 || dialog.scrollLeft !== 0) {
      dialog.scrollTop = 0;
      dialog.scrollLeft = 0;
    }
  });
  dialog.querySelectorAll("[data-policy-close]").forEach((btn) =>
    btn.addEventListener("click", closeModal),
  );
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) closeModal();
  });
  dialog.addEventListener("close", () => dialog.remove(), { once: true });

  document.body.append(dialog);
  dialog.showModal();
}

$("#editor-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const button = $("#editor .primary");
  button.disabled = true;
  try {
    await submitHandler(Object.fromEntries(new FormData(e.target)));
    $("#editor").close();
  } catch (err) {
    $("#editor .form-message").textContent = err.message;
  } finally {
    button.disabled = false;
    button.onclick = null;
  }
});
document.addEventListener("click", async (e) => {
  if (e.target.closest("[data-open-policy]")) {
    e.preventDefault();
    return openHotelPolicyDialog();
  }
  if (e.target.closest("[data-close]")) return $("#editor").close();
  const p = e.target.closest("[data-page]");
  if (p) return choosePage(p.dataset.page);
  const a = e.target.closest("[data-action]");
  if (a) {
    if (a.dataset.busy === "true") return;
    a.dataset.busy = "true";
    a.disabled = true;
    try {
      await act(a.dataset.action, a.dataset.id);
    } catch (err) {
      toast(err.message);
    } finally {
      if (a.isConnected) {
        a.disabled = false;
        delete a.dataset.busy;
      }
    }
  }
});
let searchTimer;
document.addEventListener("input", (e) => {
  if (e.target.id === "table-search") {
    query = e.target.value;
    pageNo = 1;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const pos = e.target.selectionStart;
      render();
      const input = $("#table-search");
      input?.focus();
      input?.setSelectionRange(pos, pos);
    }, 250);
  }
});
document.addEventListener("change", (e) => {
  if (e.target.id === "room-filter") {
    const html = board();
    $("#page-content").innerHTML = html;
  }
});
installSearch(context);

const bellBtn = $("#topbar-bell-btn");
const notifDropdown = $("#topbar-notifications-dropdown");
const notifCloseBtn = $("#notifications-close-btn");

if (bellBtn && notifDropdown) {
  bellBtn.onclick = (e) => {
    e.stopPropagation();
    const isHidden = notifDropdown.hidden;
    notifDropdown.hidden = !isHidden;
    bellBtn.classList.toggle("active", isHidden);
    bellBtn.setAttribute("aria-expanded", String(isHidden));
  };

  if (notifCloseBtn) {
    notifCloseBtn.onclick = (e) => {
      e.stopPropagation();
      notifDropdown.hidden = true;
      bellBtn.classList.remove("active");
      bellBtn.setAttribute("aria-expanded", "false");
    };
  }

  document.addEventListener("click", (e) => {
    if (
      !notifDropdown.hidden &&
      !e.target.closest("#topbar-notifications-root")
    ) {
      notifDropdown.hidden = true;
      bellBtn.classList.remove("active");
      bellBtn.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !notifDropdown.hidden) {
      notifDropdown.hidden = true;
      bellBtn.classList.remove("active");
      bellBtn.setAttribute("aria-expanded", "false");
    }
  });

  notifDropdown.addEventListener("click", (e) => {
    const approveBtn = e.target.closest("[data-notify-approve]");
    if (approveBtn) {
      const cardId = approveBtn.dataset.notifyApprove;
      notifDropdown.hidden = true;
      bellBtn.classList.remove("active");
      bellBtn.setAttribute("aria-expanded", "false");
      act("card.approveDisable", cardId);
      return;
    }
    const rejectBtn = e.target.closest("[data-notify-reject]");
    if (rejectBtn) {
      const cardId = rejectBtn.dataset.notifyReject;
      notifDropdown.hidden = true;
      bellBtn.classList.remove("active");
      bellBtn.setAttribute("aria-expanded", "false");
      act("card.rejectDisable", cardId);
      return;
    }
  });
}

$("#logout").onclick = async () => {
  await api("/api/logout", {});
  location.href = "/login";
};
$("#menu-toggle").onclick = () => $(".sidebar").classList.toggle("open");
$("#today").textContent = new Date().toLocaleDateString("vi-VN", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
(async () => {
  try {
    d = await api("/api/data");
    const initial = document.body.dataset.initialPage || "overview";
    page = initial;
    if (document.body.dataset.catalogKind)
      sessionStorage.setItem("catalogTab", document.body.dataset.catalogKind);
    render();
  } catch (err) {
    $("#page-content").textContent = err.message;
  }
})();
