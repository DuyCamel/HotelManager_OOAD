/** Server-derived reporting UI; the browser never submits financial totals. */
let reportData = null;
let reportError = "";
let reportLoading = null;
let activeContext = null;

const statusLabels = {
  PENDING: "Chờ cọc",
  CONFIRMED: "Đã cọc",
  CHECKED_IN: "Đang lưu trú",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
  DRAFT: "Nháp",
  PAID: "Đã thanh toán",
  RECORDED: "Chưa lập hóa đơn",
  INVOICED: "Đã lên hóa đơn",
  VOIDED: "Đã hủy",
  AVAILABLE: "Sẵn sàng",
  OCCUPIED: "Đang ở",
  DIRTY: "Cần dọn",
  MAINTENANCE: "Bảo trì",
  DISABLED: "Ngừng hoạt động",
  CASH: "Tiền mặt",
  TRANSFER: "Chuyển khoản",
  CARD: "Thẻ",
  UNSPECIFIED: "Chưa xác định",
};

function queryFor(range) {
  const query = new URLSearchParams();
  if (range?.from) query.set("from", range.from);
  if (range?.to) query.set("to", range.to);
  return query;
}

async function loadReport(ctx, range) {
  if (reportLoading) return reportLoading;
  reportError = "";
  const root = document.querySelector("#page-content");
  if (root)
    root.innerHTML =
      '<div class="admin-loading"><span></span><p>Đang tổng hợp dữ liệu trên máy chủ…</p></div>';
  reportLoading = ctx
    .api(`/api/modules/reports?${queryFor(range)}`)
    .then((result) => {
      reportData = result;
    })
    .catch((error) => {
      reportError = error.message;
    })
    .finally(() => {
      reportLoading = null;
      if (activeContext?.page === "reports") {
        const content = document.querySelector("#page-content");
        if (content) content.innerHTML = renderReport(activeContext);
      }
    });
  return reportLoading;
}

function dimensionTable(ctx, title, rows, type) {
  const { E, money } = ctx;
  return `<article class="panel admin-dimension-card">
    <div class="admin-card-heading"><h3>${E(title)}</h3><span>${rows.reduce((sum, row) => sum + row.count, 0)} bản ghi</span></div>
    <div class="admin-dimension-list">${rows
      .map(
        (row) => `<div><span>${E(statusLabels[row.status || row.method] || row.status || row.method)}</span><strong>${row.count}</strong>${type === "money" ? `<small>${money(row.amount ?? row.revenue)}</small>` : ""}</div>`,
      )
      .join("")}</div>
  </article>`;
}

function renderReport(ctx) {
  const { E, money, btn } = ctx;
  if (reportError)
    return `<div class="admin-callout error"><strong>Không thể tạo báo cáo</strong><p>${E(reportError)}</p><button type="button" class="small" data-report-retry>Thử lại</button></div>`;
  if (!reportData)
    return '<div class="admin-loading"><span></span><p>Đang tổng hợp dữ liệu trên máy chủ…</p></div>';
  const data = reportData;
  const maximum = Math.max(1, ...data.daily.map((row) => row.revenue));
  const chartRows = data.daily.slice(-31);
  const genDate = new Date(data.generatedAt);
  const generated = Number.isNaN(genDate.getTime())
    ? data.generatedAt
    : (() => {
        try {
          const parts = new Intl.DateTimeFormat("en-GB", {
            timeZone: data.timeZone || "Asia/Ho_Chi_Minh",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }).formatToParts(genDate);
          const p = Object.fromEntries(parts.map((item) => [item.type, item.value]));
          return `${p.hour}:${p.minute} ${p.day}/${p.month}/${p.year}`;
        } catch {
          return genDate.toLocaleString("vi-VN");
        }
      })();
  const recent = [...data.daily].reverse().slice(0, 14);
  return `<div class="admin-shell report-admin">
    <section class="panel admin-card report-controls no-print">
      <div class="admin-filter-grid">
        <label>Từ ngày<input type="date" lang="vi-VN" id="report-from" value="${E(data.range.from)}"></label>
        <label>Đến ngày<input type="date" lang="vi-VN" id="report-to" value="${E(data.range.to)}"></label>
        <div class="admin-button-group">${btn("Áp dụng", "report.filter", "", "primary")}${btn("Xuất CSV", "report.export")}<button type="button" class="small" data-report-print>In báo cáo</button></div>
      </div>
      <p class="admin-data-note">Tổng hợp lúc ${E(generated)} · Múi giờ nghiệp vụ ${E(data.timeZone)} · CSV được tạo lại trên máy chủ.</p>
    </section>
    <section class="admin-kpis report-kpis" aria-label="Chỉ số báo cáo">
      <article class="featured"><span>Doanh thu ghi nhận</span><strong>${money(data.totals.revenue)}</strong><small>Không cộng tiền cọc hai lần</small></article>
      <article><span>Tiền phòng</span><strong>${money(data.totals.room)}</strong><small>${data.totals.paidInvoices} hóa đơn đã thanh toán</small></article>
      <article><span>Dịch vụ</span><strong>${money(data.totals.service)}</strong><small>Trên hóa đơn đã thanh toán</small></article>
      <article><span>Công suất phòng</span><strong>${data.occupancy.rate.toFixed(1)}%</strong><small>${data.occupancy.occupiedRoomNights}/${data.occupancy.availableRoomNights} lượt phòng-đêm</small></article>
    </section>
    <section class="admin-report-grid">
      <article class="panel admin-card admin-chart-card">
        <div class="admin-card-heading"><div><span class="eyebrow">DOANH THU</span><h2>Theo ngày địa phương</h2></div><span>${chartRows.length < data.daily.length ? `31/${data.daily.length} ngày có doanh thu gần nhất` : `${data.daily.length} ngày có doanh thu`}</span></div>
        <div class="admin-bars">${
          chartRows
            .map(
              (row) => `<div class="admin-bar-row"><span>${E(row.date.slice(5))}</span><div><i style="width:${Math.max(2, (row.revenue * 100) / maximum)}%"></i></div><strong>${money(row.revenue)}</strong></div>`,
            )
            .join("") || '<p class="empty">Chưa có doanh thu trong khoảng này.</p>'
        }</div>
      </article>
      <article class="panel admin-card occupancy-card">
        <div class="admin-card-heading"><div><span class="eyebrow">CÔNG SUẤT</span><h2>Theo loại phòng</h2></div></div>
        <div class="occupancy-list">${data.occupancy.roomTypes
          .map(
            (row) => `<div><div><strong>${E(row.name)}</strong><span>${row.rooms} phòng · ${row.occupiedRoomNights} lượt phòng-đêm</span></div><b>${row.occupancyRate.toFixed(1)}%</b></div>`,
          )
          .join("")}</div>
        <p class="admin-data-note">${E(data.occupancy.basis)}</p>
      </article>
    </section>
    <section class="admin-dimensions">
      ${dimensionTable(ctx, "Trạng thái đặt phòng", data.bookingStatuses)}
      ${dimensionTable(ctx, "Trạng thái dịch vụ", data.serviceStatuses, "money")}
      ${dimensionTable(ctx, "Ảnh chụp trạng thái phòng", data.roomStatuses)}
      ${dimensionTable(ctx, "Phương thức trên hóa đơn", data.paymentMethods, "money")}
    </section>
    <section class="panel admin-card report-detail">
      <div class="admin-card-heading"><div><span class="eyebrow">CHI TIẾT</span><h2>14 ngày doanh thu gần nhất</h2></div><span>Xem toàn bộ trong CSV</span></div>
      <div class="table-scroll"><table><thead><tr><th>Ngày</th><th>Hóa đơn</th><th>Tiền phòng</th><th>Dịch vụ</th><th>Phụ thu</th><th>Giảm giá</th><th>Doanh thu</th></tr></thead><tbody>${
        recent
          .map(
            (row) => `<tr><td>${E(row.date)}</td><td>${row.invoices}</td><td>${money(row.room)}</td><td>${money(row.service)}</td><td>${money(row.surcharge)}</td><td>${money(row.discount)}</td><td><strong>${money(row.revenue)}</strong></td></tr>`,
          )
          .join("") || '<tr><td colspan="7" class="empty">Không có hóa đơn đã thanh toán.</td></tr>'
      }</tbody></table></div>
    </section>
  </div>`;
}

if (typeof document !== "undefined") {
  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-report-print]")) window.print();
    if (event.target.closest("[data-report-retry]") && activeContext)
      loadReport(activeContext, reportData?.range);
  });
}

export default function createModule(ctx) {
  activeContext = ctx;
  return {
    render() {
      if (ctx.page !== "reports") return "";
      if (!reportData && !reportLoading)
        queueMicrotask(() => loadReport(ctx));
      return renderReport(ctx);
    },
    async act(action) {
      const range = {
        from: document.querySelector("#report-from")?.value || "",
        to: document.querySelector("#report-to")?.value || "",
      };
      if (action === "report.filter") return loadReport(ctx, range);
      if (action === "report.export") {
        const response = await fetch(
          `/api/modules/reports.csv?${queryFor(range)}`,
          { headers: { Accept: "text/csv" } },
        );
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.error || "Không thể xuất báo cáo.");
        }
        const url = URL.createObjectURL(await response.blob());
        const link = document.createElement("a");
        link.href = url;
        link.download = `bao-cao-${range.from}-${range.to}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      }
    },
    report: () => renderReport(ctx),
  };
}
