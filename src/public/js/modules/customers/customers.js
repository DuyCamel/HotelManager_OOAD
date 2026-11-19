let selectedCustomerId = "";
let customerQuery = "";
let currentContext;

const fold = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("vi-VN");

function rerenderCustomers(focusSearch = false) {
  if (currentContext?.page !== "customers") return;
  const root = document.querySelector('#page-content[data-module="customers"]');
  if (!root) return;
  root.innerHTML = customerPage(currentContext);
  if (focusSearch) {
    const input = document.querySelector("#customer-search");
    input?.focus();
    input?.setSelectionRange(customerQuery.length, customerQuery.length);
  }
}

document.addEventListener("click", (event) => {
  const select = event.target.closest("[data-customer-view]");
  if (select) {
    selectedCustomerId = select.dataset.customerView;
    rerenderCustomers();
    document.querySelector(".customer-detail")?.focus();
    return;
  }
  const archive = event.target.closest("[data-customer-archive]");
  if (!archive || currentContext?.page !== "customers") return;
  const customer = currentContext.d.customers.find(
    (item) => String(item.id) === archive.dataset.customerArchive,
  );
  if (!customer) return;
  currentContext.actionForm(
    "Lưu trữ hồ sơ khách",
    [currentContext.field("id", "", "hidden", customer.id)],
    "customer.archive",
    `Lưu trữ ${customer.name}? Thao tác chỉ được thực hiện khi khách không còn giao dịch hoặc hóa đơn dang dở. Thẻ và tài khoản liên kết sẽ ngừng hoạt động; lịch sử vẫn được giữ lại.`,
  );
});

document.addEventListener("input", (event) => {
  if (event.target.id !== "customer-search") return;
  customerQuery = event.target.value;
  selectedCustomerId = "";
  rerenderCustomers(true);
});

function currentRoom(d, stay, booking) {
  if (!stay) return booking.roomId;
  const assignments = (d.history || [])
    .filter((item) => item.stayId === stay.id)
    .sort((a, b) => Date.parse(b.fromAt) - Date.parse(a.fromAt));
  return (
    stay.currentRoomId ||
    assignments.find((item) => !item.toAt)?.roomId ||
    assignments[0]?.roomId ||
    stay.roomId ||
    booking.roomId
  );
}

function bookingHistory(ctx, customer) {
  const { E, badge, formatDate, name, d } = ctx;
  const rows = (d.bookings || [])
    .filter((item) => item.customerId === customer.id)
    .sort((a, b) => Date.parse(b.startAt) - Date.parse(a.startAt));
  if (!rows.length)
    return '<p class="customer-empty">Chưa có lịch sử đặt hoặc lưu trú.</p>';

  const renderedRows = rows
    .map((booking) => {
      const stay = (d.stays || []).find(
        (item) => item.bookingId === booking.id,
      );
      const invoice = (d.invoices || []).find(
        (item) =>
          (stay && item.stayId === stay.id) ||
          (item.customerId === customer.id && item.bookingId === booking.id),
      );
      const roomId = currentRoom(d, stay, booking);
      const roomName = roomId ? name("rooms", roomId) : "";

      // Nếu đã hủy hoặc chưa có hóa đơn: mã đặt phòng; nếu đã có hóa đơn: mã hóa đơn
      const isCancelled = booking.status === "CANCELLED";
      const displayCode = !isCancelled && invoice ? invoice.id : booking.id;
      const codeType = !isCancelled && invoice ? "Mã hóa đơn" : "Mã đặt phòng";

      const start = formatDate(booking.startAt);
      const end = formatDate(booking.endAt);
      const timeStr = start === end ? start : `${start} – ${end}`;

      return `<article class="customer-history-item">
        <div class="customer-history-time" title="Thời gian: ${E(timeStr)}">
          <span>${E(timeStr)}</span>
        </div>
        <div class="customer-history-code">
          <strong title="${codeType}: ${E(displayCode)}">${E(displayCode)}</strong>
        </div>
        <div class="customer-history-room">
          ${roomName ? `<span class="room-tag">${E(roomName)}</span>` : '<span class="room-empty">—</span>'}
        </div>
        <div class="customer-history-status">
          ${badge(booking.status)}
        </div>
      </article>`;
    })
    .join("");

  return `<div class="customer-history-table-wrapper">
    <div class="customer-history-header">
      <span>Thời gian</span>
      <span>Mã giao dịch</span>
      <span>Phòng</span>
      <span style="text-align: right;">Trạng thái</span>
    </div>
    <div class="customer-history-list">
      ${renderedRows}
    </div>
  </div>`;
}

function customerDetail(ctx, customer) {
  const { E, badge, btn, date, d } = ctx;
  if (!customer)
    return '<aside class="panel customer-detail" tabindex="-1"><p class="customer-empty">Chọn một khách hàng để xem hồ sơ và lịch sử.</p></aside>';
  const bookings = (d.bookings || []).filter(
    (item) => item.customerId === customer.id,
  );
  const bookingIds = new Set(bookings.map((item) => item.id));
  const stays = (d.stays || []).filter((item) =>
    bookingIds.has(item.bookingId),
  );
  const stayIds = new Set(stays.map((item) => item.id));
  const invoices = (d.invoices || []).filter(
    (item) => item.customerId === customer.id || stayIds.has(item.stayId),
  );
  const card = (d.cards || []).find(
    (item) => item.customerId === customer.id,
  );
  const actions = customer.isActive
    ? `${btn("Sửa hồ sơ", "customer.edit", customer.id, "accent")}
       <button type="button" class="small customer-danger" data-customer-archive="${E(customer.id)}">Lưu trữ</button>`
    : "";
  const membership = card
    ? `<div class="customer-membership-summary">
        <div><span>Thẻ thành viên</span><strong>${E(card.id)}</strong><small>Cấp ${E(date(card.issuedAt))}</small></div>
        <div><span>Điểm</span><strong class="points">${E(Number(card.points || 0).toLocaleString("vi-VN"))}</strong><small>Số dư từ sổ điểm</small></div>
        <div>${badge(card.isActive ? "ACTIVE" : "DISABLED")}</div>
      </div>`
    : `<div class="customer-membership-summary customer-membership-empty"><p>Khách chưa có thẻ thành viên.</p>${customer.isActive ? btn("Cấp thẻ", "card.new", customer.id, "primary") : ""}</div>`;
  const account = (d.accounts || []).find((a) => String(a.id) === String(customer.accountId));
  const accountLabel = customer.accountId
    ? (account?.email ? `${customer.accountId} (${account.email})` : customer.accountId)
    : "Chưa liên kết";
  return `<aside class="panel customer-detail" tabindex="-1" aria-live="polite">
    <header class="customer-detail-header">
      <div class="customer-monogram" aria-hidden="true">${E(customer.name.slice(0, 1))}</div>
      <div><span class="customer-code">${E(customer.id)}</span><h2>${E(customer.name)}</h2><div>${badge(customer.isActive ? "ACTIVE" : "DISABLED")}</div></div>
      <div class="customer-detail-actions">${actions}</div>
    </header>
    <dl class="customer-facts">
      <div><dt>Điện thoại</dt><dd>${E(customer.phone || "Chưa bổ sung")}</dd></div>
      <div><dt>CCCD / Hộ chiếu</dt><dd>${E(customer.identityNo || "Chưa bổ sung")}</dd></div>
      <div><dt>Tài khoản liên kết</dt><dd>${E(accountLabel)}</dd></div>
      <div><dt>Ngày tạo hồ sơ</dt><dd>${customer.createdAt ? E(date(customer.createdAt)) : "—"}</dd></div>
      <div class="customer-address"><dt>Địa chỉ</dt><dd>${E(customer.address || "Chưa bổ sung")}</dd></div>
    </dl>
    <div class="customer-mini-stats" aria-label="Tóm tắt lịch sử">
      <div><strong>${bookings.length}</strong><span>Phiếu đặt</span></div>
      <div><strong>${stays.length}</strong><span>Lượt lưu trú</span></div>
      <div><strong>${invoices.filter((item) => item.status === "PAID").length}</strong><span>Hóa đơn đã thu</span></div>
    </div>
    ${membership}
    <section class="customer-history"><div class="customer-section-heading"><div><span>LỊCH SỬ GIAO DỊCH</span><h3>Đặt và lưu trú</h3></div><small>${bookings.length} bản ghi</small></div>${bookingHistory(ctx, customer)}</section>
  </aside>`;
}

function customerPage(ctx) {
  const { E, badge, d } = ctx;
  const all = [...(d.customers || [])].sort(
    (a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name, "vi"),
  );
  const needle = fold(customerQuery);
  const customers = all.filter((customer) =>
    fold([customer.name, customer.phone, customer.identityNo].join(" ")).includes(
      needle,
    ),
  );
  if (!customers.some((item) => item.id === selectedCustomerId))
    selectedCustomerId = customers[0]?.id || "";
  const selected = all.find((item) => item.id === selectedCustomerId);
  const list = customers.length
    ? customers
        .map(
          (customer) => `<article class="customer-list-item ${customer.id === selectedCustomerId ? "selected" : ""}" role="listitem">
            <button type="button" data-customer-view="${E(customer.id)}" aria-pressed="${customer.id === selectedCustomerId}">
              <span class="customer-list-name"><strong>${E(customer.name)}</strong><small>${E(customer.id)} · ${E(customer.identityNo || "Chưa có CCCD")}</small></span>
              <span class="customer-list-contact">${E(customer.phone)}</span>
              ${badge(customer.isActive ? "ACTIVE" : "DISABLED")}
            </button>
          </article>`,
        )
        .join("")
    : '<p class="customer-empty">Không tìm thấy khách theo tên, số điện thoại hoặc CCCD.</p>';
  return `<section class="customer-workspace">
    <div class="panel customer-directory">
      <div class="customer-search-toolbar">
        <label for="customer-search">Tra cứu nhanh</label>
        <div class="customer-search-control"><span aria-hidden="true">⌕</span><input id="customer-search" type="search" value="${E(customerQuery)}" placeholder="Tên, số điện thoại hoặc CCCD" autocomplete="off"><output aria-label="Số kết quả">${customers.length}</output></div>
      </div>
      <div class="customer-list" role="list" aria-label="Danh sách khách hàng">${list}</div>
    </div>
    ${customerDetail(ctx, selected)}
  </section>`;
}

function setCustomerFormLimits() {
  const form = document.querySelector("#editor-form");
  const set = (name, values) => {
    const control = form?.elements.namedItem(name);
    if (control) Object.assign(control, values);
  };
  set("name", { maxLength: 120, autocomplete: "name" });
  set("phone", {
    maxLength: 15,
    inputMode: "tel",
    autocomplete: "tel",
    pattern: "\\+?[0-9]{9,14}",
  });
  set("identityNo", { maxLength: 30, autocomplete: "off" });
  set("address", { maxLength: 512, autocomplete: "street-address" });
}

export default function createModule(ctx) {
  currentContext = ctx;
  const { field, form, command, d, page } = ctx;
  return {
    render() {
      return page === "customers" ? customerPage(ctx) : "";
    },
    async act(action, id) {
      if (action !== "customer.new" && action !== "customer.edit") return;
      const customer = d.customers.find((item) => item.id === id) || {};
      form(
        customer.id ? "Cập nhật hồ sơ khách" : "Thêm hồ sơ khách",
        [
          field("id", "", "hidden", customer.id || ""),
          field("name", "Họ tên", "text", customer.name || ""),
          field("phone", "Điện thoại", "tel", customer.phone || ""),
          {
            ...field(
              "identityNo",
              "CCCD / Hộ chiếu",
              "text",
              customer.identityNo || "",
            ),
            optional: true,
          },
          {
            ...field("address", "Địa chỉ", "textarea", customer.address || ""),
            optional: true,
          },
        ],
        async (body) => command("customer.save", body),
        "Lưu hồ sơ",
        customer.accountId
          ? "Họ tên và điện thoại sẽ đồng bộ với tài khoản đăng nhập đã liên kết."
          : "Hồ sơ tại quầy không bắt buộc có tài khoản đăng nhập.",
      );
      setCustomerFormLimits();
    },
  };
}
