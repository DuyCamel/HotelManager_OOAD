/**
 * TASK-BAN-GIAO (TODO) | Phụ trách: TV1 + TV2 + TV3 | Mã việc: A1–A6 / B1–B6 / C2–C4
 * Đây là việc còn lại/nghiệm thu, không phải mô tả tính năng đã hoàn tất.
 * TV1 tách khung/table/form/HTTP và module system; TV2 phụ trách search/bookings/stays/usage/invoices; TV3 phụ trách board/catalog/reports.
 * Các phần còn thiếu gồm tab tài khoản, audit lọc/xuất, gia hạn, phiếu thuê, bảng kê đầy đủ, ảnh/tiện ích phòng, countdown/auto refresh và báo cáo.
 * Không để ba người sửa cả file đồng thời; tách module trước, giữ tên page/command và quyền hiện có. Xem docs/PHAN_CONG_3_NGUOI.md.
 * Chi tiết, phụ thuộc và tiêu chí xong: docs/PHAN_CONG_3_NGUOI.md.
 */
/** Giao diện workspace: bảng tra cứu, sơ đồ phòng và biểu mẫu gọi command nghiệp vụ. */
(() => {
  "use strict";
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
    overview: [
      "Tổng quan vận hành",
      "Một góc nhìn rõ ràng cho ngày làm việc của bạn.",
    ],
    board: ["Sơ đồ phòng", "Theo dõi trạng thái phòng và phối hợp vận hành."],
    bookings: [
      "Đặt phòng",
      "Tra cứu lịch đặt, xác nhận cọc và quản lý giữ chỗ.",
    ],
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
  const badge = (x) =>
    `<span class="badge ${E(x)}">${E(labels[x] || x)}</span>`;
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
        d.rooms.filter((r) => ["DIRTY", "MAINTENANCE"].includes(r.status))
          .length,
        "♧",
      ],
    ]
      .map(
        ([t, n, i]) =>
          `<article><div><span>${t}</span><strong>${n.toString().padStart(2, "0")}</strong></div><i>${i}</i></article>`,
      )
      .join("")}</div>`;
  }
  function board() {
    const status = $("#room-filter")?.value || "";
    return (
      stats() +
      `<div class="panel board-panel"><div class="section-title"><h3>Trạng thái phòng</h3><select id="room-filter"><option value="">Tất cả trạng thái</option>${["AVAILABLE", "OCCUPIED", "DIRTY", "MAINTENANCE", "DISABLED"].map((x) => `<option ${status === x ? "selected" : ""} value="${x}">${labels[x]}</option>`).join("")}</select></div><div class="room-legend">${["AVAILABLE", "OCCUPIED", "DIRTY", "MAINTENANCE", "DISABLED"].map((x) => badge(x)).join("")}</div><div class="room-grid">${d.rooms
        .filter((r) => !status || r.status === status)
        .map(
          (r) =>
            `<button class="room-tile ${r.status}" data-action="room.detail" data-id="${E(r.id)}"><span class="room-number">${E(r.name)}</span><span>${E(name("types", r.typeId))}</span><small>${labels[r.status]}</small><b>↗</b></button>`,
        )
        .join("")}</div></div>`
    );
  }
  function bookingTable(rows) {
    return table([...rows].reverse(), [
      [
        "Mã / Khách",
        (r) =>
          `<strong>${E(r.id)}</strong><small>${E(name("customers", r.customerId))}</small>`,
      ],
      ["Phòng", (r) => E(name("rooms", r.roomId))],
      [
        "Lịch lưu trú",
        (r) =>
          `${date(r.startAt)}<small>→ ${date(r.endAt)} · ${r.guests} khách</small>`,
      ],
      [
        "Tiền phòng / Cọc",
        (r) => `${money(r.roomCharge)}<small>Cọc ${money(r.deposit)}</small>`,
      ],
      ["Trạng thái", (r) => badge(r.status)],
      [
        "Thao tác",
        (r) =>
          (r.status === "PENDING"
            ? btn("Hủy", "booking.cancel", r.id) +
              (role !== "CUSTOMER"
                ? btn("Xác nhận cọc", "booking.deposit", r.id)
                : "")
            : "") +
          (r.status === "CONFIRMED" && role !== "CUSTOMER"
            ? btn("Nhận phòng", "stay.checkin", r.id)
            : ""),
      ],
    ]);
  }
  function catalogPanel() {
    let kind = sessionStorage.getItem("catalogTab") || "rooms";
    if (!["rooms", "types", "services", "holidays"].includes(kind))
      kind = "rooms";
    const tabs = `<div class="tabs">${[
      ["rooms", "Phòng"],
      ["types", "Loại & giá phòng"],
      ["services", "Dịch vụ"],
      ["holidays", "Giá lễ"],
    ]
      .map(
        ([k, t]) =>
          `<button class="${kind === k ? "active" : ""}" data-action="catalog.tab" data-id="${k}">${t}</button>`,
      )
      .join("")}</div>`;
    const rows = d[kind];
    return (
      tabs +
      table(rows, [
        [
          "Mã / Tên",
          (r) => `<strong>${E(r.name)}</strong><small>${E(r.id)}</small>`,
        ],
        [
          "Thông tin",
          (r) =>
            kind === "rooms"
              ? E(name("types", r.typeId))
              : kind === "types"
                ? `${r.capacity} khách · ${r.beds} giường`
                : kind === "services"
                  ? E(r.unit)
                  : `${E(name("types", r.typeId))}<small>${E(r.startDate.slice(0, 10))} → ${E(r.endDate.slice(0, 10))}</small>`,
        ],
        [
          "Giá / Trạng thái",
          (r) =>
            kind === "rooms"
              ? badge(r.status)
              : kind === "types"
                ? money(r.dailyPrice) + "/ ngày"
                : kind === "services"
                  ? money(r.price)
                  : "+" + r.percent + "%",
        ],
        [
          "Thao tác",
          (r) =>
            btn("Chỉnh sửa", "catalog.edit", r.id) +
            (kind !== "types"
              ? btn(
                  kind === "rooms"
                    ? r.status === "DISABLED"
                      ? "Mở"
                      : "Khóa"
                    : r.isActive
                      ? "Ngừng"
                      : "Mở",
                  "catalog.toggle",
                  r.id,
                )
              : ""),
        ],
      ])
    );
  }
  function report() {
    const paid = d.invoices.filter((x) => x.status === "PAID");
    let from = $("#report-from")?.value || "",
      to = $("#report-to")?.value || "";
    const rows = paid.filter(
      (i) =>
        (!from || i.issuedAt.slice(0, 10) >= from) &&
        (!to || i.issuedAt.slice(0, 10) <= to),
    );
    const sum = (k) => rows.reduce((s, r) => s + Number(r[k]), 0);
    const total =
      sum("roomCharge") +
      sum("serviceCharge") +
      sum("surcharge") -
      sum("discount");
    const months = {};
    rows.forEach((r) => {
      const k = r.issuedAt.slice(0, 7);
      months[k] =
        (months[k] || 0) +
        r.roomCharge +
        r.serviceCharge +
        r.surcharge -
        r.discount;
    });
    const max = Math.max(1, ...Object.values(months));
    return `<div class="panel report-filter"><label>Từ ngày<input type="date" id="report-from" value="${E(from)}"></label><label>Đến ngày<input type="date" id="report-to" value="${E(to)}"></label>${btn("Áp dụng", "report.filter")}${btn("Xuất CSV", "report.export")}</div><div class="stats"><article><div><span>Doanh thu đã ghi nhận</span><strong class="money-stat">${money(total)}</strong></div></article><article><div><span>Tiền phòng</span><strong class="money-stat">${money(sum("roomCharge"))}</strong></div></article><article><div><span>Dịch vụ</span><strong class="money-stat">${money(sum("serviceCharge"))}</strong></div></article><article><div><span>Hóa đơn thanh toán</span><strong>${rows.length}</strong></div></article></div><div class="panel chart"><h3>Doanh thu theo tháng</h3>${
      Object.entries(months)
        .sort()
        .map(
          ([m, n]) =>
            `<div class="bar-row"><span>${m}</span><meter min="0" max="${max}" value="${n}"></meter><b>${money(n)}</b></div>`,
        )
        .join("") || '<p class="empty">Chưa có doanh thu trong khoảng này.</p>'
    }</div><p class="muted">Ngày lọc theo UTC trong dữ liệu. Doanh thu = tiền phòng + dịch vụ + phụ thu − giảm giá; tiền cọc không tính hai lần.</p>`;
  }
  function render() {
    const t = titles[page] || titles.board;
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
    switch (page) {
      case "board":
        html = board();
        break;
      case "overview":
        html =
          stats() +
          `<div class="overview-grid"><div class="panel welcome-card"><span class="eyebrow">OPERATIONS AT A GLANCE</span><h2>Chào ngày mới,<br>chúc một ca làm việc tốt.</h2><p>Hôm nay có ${d.bookings.filter((b) => b.startAt.slice(0, 10) === new Date().toISOString().slice(0, 10) && b.status === "CONFIRMED").length} phiếu dự kiến nhận phòng.</p>${btn("Xem sơ đồ phòng →", "go.board", "", "primary")}</div><div class="panel"><h3>Phiếu cần xác nhận cọc</h3><strong class="big-number">${d.bookings.filter((b) => b.status === "PENDING").length}</strong><p class="muted">Tự hết hạn sau 30 phút nếu chưa cọc.</p>${btn("Mở đặt phòng", "go.bookings")}</div></div>`;
        break;
      case "bookings":
      case "mybookings":
        html = bookingTable(d.bookings);
        break;
      case "stays":
        html = table(
          d.stays.filter((x) => !x.checkOutAt),
          [
            [
              "Phiếu / Khách",
              (r) =>
                `<strong>${E(r.id)}</strong><small>${E(name("customers", d.bookings.find((b) => b.id === r.bookingId)?.customerId))}</small>`,
            ],
            ["Phòng", (r) => E(name("rooms", r.roomId))],
            ["Giờ nhận", (r) => date(r.checkInAt)],
            ["Tiền phòng", (r) => money(r.roomCharge + r.surcharge)],
            [
              "Thao tác",
              (r) =>
                btn("Đổi phòng", "stay.move", r.id) +
                btn("Dịch vụ", "usage.stay", r.id) +
                btn("Trả phòng", "stay.checkout", r.id, "accent"),
            ],
          ],
        );
        break;
      case "customers":
        html = table(d.customers, [
          [
            "Họ tên",
            (r) => `<strong>${E(r.name)}</strong><small>${E(r.id)}</small>`,
          ],
          ["Liên hệ", (r) => `${E(r.phone)}<small>${E(r.address)}</small>`],
          ["Giấy tờ", (r) => E(r.identityNo || "Chưa bổ sung")],
          ["Trạng thái", (r) => badge(r.isActive ? "ACTIVE" : "DISABLED")],
          [
            "Thao tác",
            (r) =>
              (r.isActive ? btn("Sửa", "customer.edit", r.id) : "") +
              (catalog && r.isActive
                ? btn("Lưu trữ", "customer.archive", r.id)
                : ""),
          ],
        ]);
        break;
      case "usage":
        html =
          `<div class="usage-intro"><div><span class="eyebrow">GUEST EXPERIENCE</span><h2>Dịch vụ sử dụng</h2><p>Theo dõi dịch vụ phát sinh trong thời gian lưu trú và cập nhật bảng kê rõ ràng.</p></div>${btn("＋ Ghi dịch vụ", "usage.new", "", "primary")}</div>` +
          table([...d.usage].reverse(), [
          [
            "Phiếu / Dịch vụ",
            (r) =>
              `<strong>${E(name("services", r.serviceId))}</strong><small>${E(r.stayId)}</small>`,
          ],
          ["Số lượng", (r) => r.quantity],
          [
            "Đơn giá / Tổng",
            (r) =>
              money(r.unitPrice) +
              `<small>${money(r.unitPrice * r.quantity)}</small>`,
          ],
          ["Ghi nhận", (r) => date(r.usedAt)],
          [
            "Trạng thái",
            (r) =>
              r.isVoided
                ? badge("CANCELLED")
                : r.invoiceId
                  ? badge("PAID")
                  : badge("PENDING"),
          ],
          [
            "Thao tác",
            (r) =>
              !r.isVoided && !r.invoiceId
                ? btn("Hủy ghi nhận", "usage.void", r.id)
                : "",
          ],
          ]);
        break;
      case "cards":
      case "mycard":
        html = table(d.cards, [
          ["Mã thẻ", (r) => `<strong>${E(r.id)}</strong>`],
          ["Khách hàng", (r) => E(name("customers", r.customerId))],
          [
            "Điểm tích lũy",
            (r) =>
              `<strong class="points">${Number(r.points).toLocaleString("vi-VN")}</strong>`,
          ],
          [
            "Hạng tham khảo",
            (r) =>
              r.points >= 1000
                ? "Kim cương"
                : r.points >= 500
                  ? "Vàng"
                  : r.points >= 100
                    ? "Bạc"
                    : "Thành viên",
          ],
          ["Trạng thái", (r) => badge(r.isActive ? "ACTIVE" : "DISABLED")],
          [
            "Thao tác",
            (r) =>
              page === "cards" && r.isActive
                ? btn("Vô hiệu hóa", "card.disable", r.id)
                : "",
          ],
        ]);
        break;
      case "invoices":
        html = table([...d.invoices].reverse(), [
          [
            "Hóa đơn",
            (r) =>
              `<strong>${E(r.id)}</strong><small>${date(r.issuedAt)}</small>`,
          ],
          ["Khách hàng", (r) => E(name("customers", r.customerId))],
          [
            "Tổng tiền",
            (r) =>
              money(r.roomCharge + r.serviceCharge + r.surcharge - r.discount),
          ],
          ["Đã cọc", (r) => money(r.deposit)],
          ["Trạng thái", (r) => badge(r.status)],
          [
            "Chứng từ",
            (r) =>
              `<a class="small" target="_blank" rel="noopener" href="/api/invoice/${encodeURIComponent(r.id)}">Xem / In ↗</a>`,
          ],
        ]);
        break;
      case "catalog":
        html = catalogPanel();
        break;
      case "accounts":
        html = table(d.accounts, [
          [
            "Tài khoản",
            (r) => `<strong>${E(r.name)}</strong><small>${E(r.email)}</small>`,
          ],
          ["Vai trò", (r) => badge(r.role)],
          ["Điện thoại", (r) => E(r.phone)],
          ["Trạng thái", (r) => badge(r.isActive ? "ACTIVE" : "DISABLED")],
          [
            "Thao tác",
            (r) =>
              (admin || r.role !== "ADMIN"
                ? btn("Sửa", "account.edit", r.id)
                : "") +
              (r.role !== "ADMIN"
                ? btn(r.isActive ? "Khóa" : "Mở", "account.toggle", r.id)
                : "") +
              (admin && !["ADMIN", "CUSTOMER"].includes(r.role)
                ? btn("Phân quyền", "account.role", r.id)
                : "") +
              (admin && r.role === "MANAGER" && r.isActive
                ? btn("Chuyển Admin", "admin.transfer", r.id)
                : ""),
          ],
        ]);
        break;
      case "reports":
        html = report();
        break;
      case "system":
        html =
          `<div class="tabs">${btn("Cấu hình khách sạn", "system.edit")}${btn("Tạo bản sao lưu", "system.backup")}</div><div class="panel settings-summary"><h3>${E(d.settings[0].hotelName)}</h3><p>${E(d.settings[0].address)} · ${E(d.settings[0].hotline)}</p><p>Nhận phòng: ngoài khung 12:00–14:00 · Trả phòng cố định: 12:00</p><p class="muted">Giá đặt phòng tính theo ngày. Khoảng 12:00–14:00 dành cho buồng phòng.</p></div><h3>Lịch sử sao lưu</h3>` +
          table(d.backups, [
            [
              "Mã / Thời gian",
              (r) => E(r.id) + `<small>${date(r.backupAt)}</small>`,
            ],
            ["Tệp", (r) => E(r.filePath)],
            ["Ghi chú", (r) => E(r.note)],
            ["Thao tác", (r) => btn("Khôi phục", "system.restore", r.id)],
          ]) +
          `<h3>Nhật ký gần nhất (tối đa 500)</h3><div class="panel table-scroll"><table><thead><tr><th>Thời gian</th><th>Người thao tác</th><th>Hành động</th><th>Đối tượng</th></tr></thead><tbody>${d.audit
            .slice(0, 100)
            .map(
              (a) =>
                `<tr><td>${date(a.eventAt)}</td><td>${E(d.accounts.find((x) => x.id === a.actorId)?.email || a.actorId || "Hệ thống")}</td><td>${E(a.action)}</td><td>${E(a.objectId)}<small>${E(a.detail)}</small></td></tr>`,
            )
            .join("")}</tbody></table></div>`;
        break;
      case "profile":
        html = `<div class="panel profile-panel"><div class="avatar large">${E($(".user-menu strong").textContent.slice(0, 1))}</div><h2>${E($(".user-menu strong").textContent)}</h2><p>${E(labels[role])}</p>${btn("Cập nhật hồ sơ", "profile.edit")}${btn("Đổi mật khẩu", "profile.password")}</div>`;
        break;
      case "search":
        html = `<div class="panel"><form id="search-form" class="search-form"><label>Ngày nhận phòng<input name="startAt" type="date" required></label><label>Ngày trả phòng (12:00)<input name="endAt" type="date" required></label><label>Số khách<input name="guests" type="number" min="1" max="20" value="2" required></label><button class="primary">Tìm phòng ↗</button></form></div><div id="available-results" class="search-cards"></div>`;
        break;
    }
    $("#page-content").innerHTML = html;
    document
      .querySelectorAll("#side-nav button")
      .forEach((b) => b.classList.toggle("active", b.dataset.page === page));
  }
  function choosePage(p) {
    if (!document.querySelector(`[data-page="${p}"]`)) return;
    page = p;
    query = "";
    pageNo = 1;
    location.hash = p;
    render();
    $(".sidebar").classList.remove("open");
  }
  function catalogFields(kind, r = {}) {
    const f = [
      field("kind", "", "hidden", kind),
      field("id", "", "hidden", r.id || ""),
    ];
    if (kind === "rooms")
      return f.concat(!r.id ? [field("code", "Mã phòng")] : [], [
        field("name", "Tên phòng", "text", r.name),
        field("typeId", "Loại phòng", "select", r.typeId, opts("types")),
        field("note", "Ghi chú", "textarea", r.note),
      ]);
    if (kind === "types")
      return f.concat([
        field("name", "Tên loại", "text", r.name),
        ...[
          "capacity",
          "beds",
          "hourlyPrice",
          "nightlyPrice",
          "dailyPrice",
        ].map((k, i) =>
          field(
            k,
            [
              "Sức chứa",
              "Số giường",
              "Giá giờ (chưa áp dụng)",
              "Giá đêm (chưa áp dụng)",
              "Giá ngày",
            ][i],
            "number",
            r[k] || 1,
          ),
        ),
        field("amenities", "Tiện nghi", "textarea", r.amenities),
      ]);
    if (kind === "services")
      return f.concat([
        field("name", "Tên dịch vụ", "text", r.name),
        field("unit", "Đơn vị", "text", r.unit),
        field("price", "Đơn giá", "number", r.price || 10000),
        field("description", "Mô tả", "textarea", r.description),
      ]);
    return f.concat([
      field("name", "Tên đợt lễ", "text", r.name),
      field("typeId", "Loại phòng", "select", r.typeId, opts("types")),
      field("startDate", "Ngày bắt đầu", "date", r.startDate?.slice(0, 10)),
      field("endDate", "Ngày kết thúc", "date", r.endDate?.slice(0, 10)),
      field("percent", "Tăng giá (%)", "number", r.percent || 10),
    ]);
  }
  async function act(action, id) {
    const hidden = () => field("id", "", "hidden", id);
    if (action.startsWith("go.")) return choosePage(action.split(".")[1]);
    if (action === "prev" || action === "next") {
      pageNo += action === "prev" ? -1 : 1;
      return render();
    }
    if (action === "catalog.tab") {
      sessionStorage.setItem("catalogTab", id);
      query = "";
      return render();
    }
    if (action === "report.filter") {
      const html = report();
      $("#page-content").innerHTML = html;
      return;
    }
    if (action === "report.export") {
      const from = $("#report-from").value,
        to = $("#report-to").value;
      const rows = d.invoices.filter(
        (r) =>
          r.status === "PAID" &&
          (!from || r.issuedAt.slice(0, 10) >= from) &&
          (!to || r.issuedAt.slice(0, 10) <= to),
      );
      const csv =
        "\uFEFF" +
        [
          [
            "Ma hoa don",
            "Ngay UTC",
            "Tien phong",
            "Dich vu",
            "Phu thu",
            "Giam gia",
            "Doanh thu",
          ],
          ...rows.map((r) => [
            r.id,
            r.issuedAt,
            r.roomCharge,
            r.serviceCharge,
            r.surcharge,
            r.discount,
            r.roomCharge + r.serviceCharge + r.surcharge - r.discount,
          ]),
        ]
          .map((a) =>
            a.map((x) => '"' + String(x).replace(/"/g, '""') + '"').join(","),
          )
          .join("\r\n");
      const url = URL.createObjectURL(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "doanh-thu.csv";
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    if (action === "room.detail") {
      const r = d.rooms.find((x) => x.id === id);
      const task = d.tasks?.find((t) => t.roomId === id && t.status !== "DONE");
      const overdue = task && Date.parse(task.deadlineAt) < Date.now();
      form(
        r.name,
        [
          field("status", "Trạng thái", "text", labels[r.status]),
          field("type", "Loại phòng", "text", name("types", r.typeId)),
          field("note", "Ghi chú", "textarea", r.note),
        ],
        async () => {},
        "Đóng",
        task
          ? `Hạn dọn: ${date(task.deadlineAt)}${overdue ? " — QUÁ HẠN" : ""}`
          : "",
      );
      document
        .querySelectorAll("#dialog-fields input, #dialog-fields textarea")
        .forEach((input) => {
          input.readOnly = true;
          input.required = false;
        });
      for (const damage of (d.damages || []).filter((x) => x.roomId === id)) {
        $("#dialog-fields").insertAdjacentHTML(
          "beforeend",
          `<p class="form-note">${E(damage.description)} <a target="_blank" rel="noopener" href="/damage-photo/${encodeURIComponent(damage.id)}">Xem ảnh hiện trạng ↗</a></p>`,
        );
      }
      if (clean && ["DIRTY", "MAINTENANCE"].includes(r.status)) {
        $("#dialog-fields").insertAdjacentHTML(
          "beforeend",
          btn("Xác nhận đã dọn sạch", "room.clean", id) +
            btn("Báo hỏng + ảnh", "room.damage", id),
        );
      }
      return;
    }
    if (action === "booking.new") {
      const local = (t) =>
        new Date(t - new Date().getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
      form(
        "Đặt phòng tại quầy",
        [
          field(
            "customerId",
            "Khách hàng",
            "select",
            "",
            opts("customers", (x) => x.isActive),
          ),
          field(
            "roomId",
            "Phòng (server kiểm tra lịch trùng)",
            "select",
            "",
            opts(
              "rooms",
              (r) => !["MAINTENANCE", "DISABLED"].includes(r.status),
            ),
          ),
          field(
            "startAt",
            "Ngày nhận phòng",
            "date",
            local(Date.now()).slice(0, 10),
          ),
          field(
            "endAt",
            "Ngày trả phòng (12:00)",
            "date",
            local(Date.now() + 86400000).slice(0, 10),
          ),
          field("guests", "Số khách", "number", 1),
          field("deposit", "Cọc tiền mặt", "number", 100000),
        ],
        async (b) => {
          await command("booking.create", b);
        },
        "Tạo phiếu",
        "Tiền phòng tính theo ngày. Phòng phải sẵn sàng trước khi nhận.",
      );
      return;
    }
    if (action === "booking.deposit")
      return actionForm(
        "Xác nhận đã nhận cọc",
        [
          hidden(),
          field("amount", "Số tiền thực nhận", "number", 100000),
          field("method", "Phương thức", "select", "CASH", [
            ["CASH", "Tiền mặt"],
            ["TRANSFER", "Chuyển khoản"],
            ["CARD", "Thẻ"],
          ]),
        ],
        action,
        "Xác nhận thủ công sau khi kiểm tra tiền đã nhận. Chưa kết nối ngân hàng.",
      );
    if (action === "stay.checkin")
      return actionForm(
        "Nhận phòng",
        [hidden(), field("identityNo", "CCCD / Hộ chiếu khách lưu trú")],
        action,
        "Chỉ nhận trong khoảng lưu trú và phòng đã sẵn sàng.",
      );
    if (action === "stay.move")
      return actionForm(
        "Đổi phòng",
        [
          hidden(),
          field(
            "roomId",
            "Phòng mới",
            "select",
            "",
            opts("rooms", (x) => x.status === "AVAILABLE"),
          ),
        ],
        action,
        "Phòng cũ chuyển Cần dọn. Phụ thu bằng chênh lệch giá dương của thời gian còn lại.",
      );
    if (action === "stay.checkout") {
      const p = await api("/api/action/stay.preview", { id });
      return actionForm(
        "Bảng kê trả phòng",
        [
          hidden(),
          field("expectedDue", "", "hidden", p.due),
          field("method", "Phương thức thu", "select", "CASH", [
            ["CASH", "Tiền mặt"],
            ["TRANSFER", "Chuyển khoản"],
            ["CARD", "Thẻ"],
          ]),
        ],
        action,
        `Tiền phòng ${money(p.roomCharge)} · Dịch vụ ${money(p.serviceCharge)} · Phụ thu ${money(p.surcharge)} · Đã cọc ${money(p.deposit)}. CÒN THU: ${money(p.due)}. ${p.lines.map((l) => l.name + " × " + l.quantity).join("; ")}`,
      );
    }
    if (action === "usage.new" || action === "usage.stay")
      return actionForm(
        "Ghi dịch vụ sử dụng",
        [
          field(
            "stayId",
            "Phiếu thuê",
            "select",
            action === "usage.stay" ? id : "",
            d.stays
              .filter((s) => !s.checkOutAt)
              .map((s) => [s.id, s.id + " · " + name("rooms", s.roomId)]),
          ),
          field(
            "serviceId",
            "Dịch vụ",
            "select",
            "",
            d.services
              .filter((s) => s.isActive)
              .map((s) => [s.id, s.name + " · " + money(s.price)]),
          ),
          field("quantity", "Số lượng", "number", 1),
        ],
        "usage.add",
      );
    if (action === "customer.new" || action === "customer.edit") {
      const c = d.customers.find((x) => x.id === id) || {};
      return actionForm(
        "Hồ sơ khách hàng",
        [
          field("id", "", "hidden", c.id || ""),
          field("name", "Họ tên", "text", c.name),
          field("phone", "Điện thoại", "tel", c.phone),
          field("identityNo", "CCCD / Hộ chiếu", "text", c.identityNo),
          field("address", "Địa chỉ", "textarea", c.address),
        ],
        "customer.save",
      );
    }
    if (action === "card.new")
      return actionForm(
        "Cấp thẻ thành viên",
        [
          field(
            "customerId",
            "Khách hàng",
            "select",
            "",
            opts(
              "customers",
              (x) => x.isActive && !d.cards.some((c) => c.customerId === x.id),
            ),
          ),
        ],
        "card.issue",
      );
    if (action === "catalog.new" || action === "catalog.edit") {
      const kind = sessionStorage.getItem("catalogTab") || "rooms";
      return actionForm(
        "Danh mục " +
          {
            rooms: "phòng",
            types: "loại phòng",
            services: "dịch vụ",
            holidays: "giá lễ",
          }[kind],
        catalogFields(
          kind,
          d[kind].find((x) => x.id === id),
        ),
        "catalog.save",
      );
    }
    if (action === "catalog.toggle")
      return actionForm(
        "Đổi trạng thái danh mục",
        [
          hidden(),
          field(
            "kind",
            "",
            "hidden",
            sessionStorage.getItem("catalogTab") || "rooms",
          ),
        ],
        action,
      );
    if (action === "account.new")
      return actionForm(
        "Tạo tài khoản nhân viên",
        [
          field("name", "Họ tên"),
          field("email", "Email", "email"),
          field("phone", "Điện thoại", "tel"),
          field("password", "Mật khẩu ban đầu", "password"),
          field("role", "Vai trò", "select", "RECEPTIONIST", [
            ["MANAGER", "Quản lý"],
            ["RECEPTIONIST", "Nhân viên"],
            ["HOUSEKEEPER", "Buồng phòng"],
          ]),
        ],
        "account.create",
      );
    if (action === "account.edit") {
      const a = d.accounts.find((x) => x.id === id);
      return actionForm(
        "Cập nhật tài khoản",
        [
          hidden(),
          field("name", "Họ tên", "text", a.name),
          field("email", "Email", "email", a.email),
          field("phone", "Điện thoại", "tel", a.phone),
        ],
        "account.update",
      );
    }
    if (action === "account.role")
      return actionForm(
        "Phân quyền nhân viên",
        [
          hidden(),
          field(
            "role",
            "Vai trò",
            "select",
            d.accounts.find((x) => x.id === id).role,
            [
              ["MANAGER", "Quản lý"],
              ["RECEPTIONIST", "Nhân viên"],
              ["HOUSEKEEPER", "Buồng phòng"],
            ],
          ),
        ],
        action,
      );
    if (action === "admin.transfer") {
      const r = await api("/api/action/admin.challenge", { targetId: id });
      return actionForm(
        "Chuyển quyền Admin",
        [
          field("requestId", "", "hidden", r.requestId),
          field("code", "Mã OTP 6 chữ số"),
        ],
        "admin.transfer",
        `OTP DEMO LOCAL: ${r.demoCode}. Chưa gửi SMS thật. Hết hạn sau 5 phút; tối đa 5 lần thử. Admin hiện tại sẽ trở thành Quản lý và phải đăng nhập lại.`,
      );
    }
    if (action === "system.edit") {
      const s = d.settings[0];
      return actionForm(
        "Cấu hình khách sạn",
        [
          "hotelName",
          "address",
          "hotline",
          "lateFeeFrom",
          "lateFeePercent",
          "bankCode",
          "bankAccount",
          "bankOwner",
        ].map((k, i) =>
          field(
            k,
            [
              "Tên khách sạn",
              "Địa chỉ",
              "Hotline",
              "Mốc phụ thu trễ (chưa áp dụng)",
              "Phụ thu trễ % (chưa áp dụng)",
              "Mã ngân hàng",
              "Số tài khoản",
              "Chủ tài khoản",
            ][i],
            k === "lateFeePercent"
              ? "number"
              : ["lateFeeFrom"].includes(k)
                ? "time"
                : "text",
            s[k],
          ),
        ),
        "system.settings",
      );
    }
    if (action === "profile.edit") {
      const c =
        d.customers?.find(
          (x) => x.accountId === document.body.dataset.userId,
        ) || {};
      return actionForm(
        "Cập nhật hồ sơ",
        [
          field(
            "name",
            "Họ tên",
            "text",
            c.name || $(".user-menu strong").textContent,
          ),
          field("phone", "Điện thoại", "tel", c.phone || d.me.phone),
          {
            ...field(
              "identityNo",
              "CCCD / Hộ chiếu",
              "text",
              c.identityNo || "",
            ),
            optional: true,
          },
          {
            ...field("address", "Địa chỉ", "textarea", c.address || ""),
            optional: true,
          },
        ],
        "profile.update",
      );
    }
    if (action === "profile.password")
      return actionForm(
        "Đổi mật khẩu",
        [
          field("oldPassword", "Mật khẩu hiện tại", "password"),
          field("newPassword", "Mật khẩu mới", "password"),
          field("confirmPassword", "Nhập lại mật khẩu mới", "password"),
        ],
        "profile.password",
      );
    if (action === "room.damage") {
      $("#editor").close();
      form(
        "Báo hỏng phòng",
        [hidden(), field("description", "Mô tả hư hỏng", "textarea")],
        async (b) => {
          const file = $("#damage-photo").files[0];
          if (!file) throw new Error("Chọn ảnh JPG/PNG.");
          const fd = new FormData();
          fd.append("photo", file);
          fd.append("id", id);
          fd.append("description", b.description);
          const res = await fetch("/api/damage", {
            method: "POST",
            headers: { "X-CSRF-Token": $('meta[name="csrf-token"]').content },
            body: fd,
          });
          const r = await res.json();
          if (!res.ok) throw new Error(r.error);
          await refresh();
          toast("Đã ghi nhận hư hỏng.");
        },
      );
      $("#dialog-fields").insertAdjacentHTML(
        "beforeend",
        '<label>Ảnh hiện trạng (JPG/PNG, tối đa 3 MB)<input id="damage-photo" type="file" accept="image/png,image/jpeg" required></label>',
      );
      return;
    }
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
  document.addEventListener("submit", async (e) => {
    if (e.target.id !== "search-form") return;
    e.preventDefault();
    const b = Object.fromEntries(new FormData(e.target));
    try {
      const rows = await api("/api/availability?" + new URLSearchParams(b));
      $("#available-results").innerHTML =
        rows
          .map(
            (r) =>
              `<article class="room-result-card"><span class="eyebrow">${E(r.type.name)}</span><h3>${E(r.name)}</h3><p>${r.type.capacity} khách · ${r.type.beds} giường</p><strong>${money(r.quote)}</strong>${btn("Đặt phòng", "customer.book", r.id, "primary")}</article>`,
          )
          .join("") ||
        '<p class="empty">Không có phòng phù hợp. Hãy đổi ngày hoặc số khách.</p>';
      document.querySelectorAll('[data-action="customer.book"]').forEach(
        (el) =>
          (el.onclick = async (ev) => {
            ev.stopPropagation();
            actionForm(
              "Đặt phòng",
              [
                field("roomId", "", "hidden", el.dataset.id),
                ...["startAt", "endAt", "guests"].map((k) =>
                  field(k, "", "hidden", b[k]),
                ),
              ],
              "booking.create",
              "Kiểm tra lại thông tin trước khi xác nhận. Sau khi gửi, nhân viên sẽ liên hệ để xác nhận đặt phòng và tiền cọc.",
            );
          }),
      );
    } catch (err) {
      toast(err.message);
    }
  });
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
      const initial = location.hash.slice(1);
      choosePage(
        document.querySelector(`[data-page="${E(initial)}"]`)
          ? initial
          : role === "CUSTOMER"
            ? "search"
            : role === "HOUSEKEEPER" || role === "RECEPTIONIST"
              ? "board"
              : "overview",
      );
    } catch (err) {
      $("#page-content").textContent = err.message;
    }
  })();
})();
