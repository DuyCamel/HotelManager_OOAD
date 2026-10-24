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
    "stay.checkin": "stays",
    "stay.move": "stays",
    "stay.checkout": "invoices",
    "usage.new": "service-usage",
    "usage.stay": "service-usage",
    "customer.new": "customers",
    "customer.edit": "customers",
    "card.new": "memberships",
    "catalog.new": "rooms",
    "catalog.edit": "rooms",
    "catalog.toggle": "rooms",
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
    admin,
    catalog,
    clean,
    $,
    labels,
    titles,
    name,
    date,
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
  const t =
    page === "catalog"
      ? [$("#page-title").textContent, $("#page-description").textContent]
      : titles[page] || titles.board;
  $("#page-title").textContent = t[0];
  $("#crumb").textContent = t[0];
  $("#page-description").textContent = t[1];
  $("#page-actions").innerHTML =
    {
      bookings: btn("+ Đặt phòng tại quầy", "booking.new", "", "primary"),
      customers: btn("+ Thêm khách hàng", "customer.new", "", "primary"),
      usage: btn("+ Ghi dịch vụ", "usage.new", "", "primary"),
      cards: btn("+ Cấp thẻ", "card.new", "", "primary"),
      accounts: admin
        ? btn("+ Tạo tài khoản", "account.new", "", "primary")
        : "",
      catalog: btn("+ Thêm danh mục", "catalog.new", "", "primary"),
    }[page] || "";
  let html = "";
  $("#page-content").innerHTML = moduleForPage().render();
  document
    .querySelectorAll("#side-nav button")
    .forEach((b) => b.classList.toggle("active", b.dataset.page === page));
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
    "account.toggle": "Đổi trạng thái tài khoản?",
    "room.clean": "Xác nhận phòng đã sạch và sẵn sàng?",
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
const admin = role === "ADMIN",
  catalog = ["ADMIN", "MANAGER"].includes(role),
  clean = ["ADMIN", "MANAGER", "HOUSEKEEPER"].includes(role);
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
    "Chỉ Admin được thao tác sao lưu/khôi phục.",
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
    "Phiếu online được giữ 30 phút để liên hệ xác nhận cọc.",
  ],
  mycard: [
    "Thẻ thành viên của tôi",
    "Mỗi 10.000 ₫ trên hóa đơn được tích 1 điểm.",
  ],
  profile: ["Hồ sơ cá nhân", "Thông tin liên hệ và bảo mật tài khoản."],
};
const name = (k, id) =>
  d[k]?.find((x) => String(x.id) === String(id))?.name || id || "—";
const date = (x) =>
  x
    ? new Date(x).toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";
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
  d[k].filter(filter).map((x) => [x.id, x.name || x.id]);
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
            ? `<select name="${E(f.key)}" required>${f.options.map(([v, t]) => `<option value="${E(v)}" ${String(v) === String(f.value) ? "selected" : ""}>${E(t)}</option>`).join("")}</select>`
            : f.type === "textarea"
              ? `<textarea name="${E(f.key)}" maxlength="1000">${E(f.value)}</textarea>`
              : `<input name="${E(f.key)}" type="${E(f.type)}" value="${E(f.value)}" ${f.type === "number" ? 'min="0" step="1"' : ""} ${f.optional ? "" : "required"} ${f.type === "password" ? 'minlength="8"' : ""}>`;
        return `<label>${E(f.title)}${control}</label>`;
      })
      .join("");
  $("#editor .form-message").textContent = "";
  $("#editor .primary").textContent = button;
  submitHandler = handler;
  $("#editor").showModal();
}
function actionForm(title, fields, action, note) {
  form(
    title,
    fields,
    async (b) => {
      await command(action, b);
    },
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
  return `<div class="stats">${[
    ["Tổng số phòng", d.rooms.length, "▦"],
    [
      "Đang lưu trú",
      d.rooms.filter((r) => r.status === "OCCUPIED").length,
      "↗",
    ],
    [
      "Sẵn sàng đón khách",
      d.rooms.filter((r) => r.status === "AVAILABLE").length,
      "✦",
    ],
    [
      "Cần dọn / bảo trì",
      d.rooms.filter((r) => ["DIRTY", "MAINTENANCE"].includes(r.status)).length,
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
  if (e.target.closest("[data-close]")) return $("#editor").close();
  const p = e.target.closest("[data-page]");
  if (p) return choosePage(p.dataset.page);
  const a = e.target.closest("[data-action]");
  if (a) {
    try {
      await act(a.dataset.action, a.dataset.id);
    } catch (err) {
      toast(err.message);
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
