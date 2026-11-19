/** Server-filtered audit trail with paging and CSV export. */
let auditData = null;
let auditError = "";
let auditLoading = null;
let activeContext = null;
let selected = { page: "1", pageSize: "25" };

function auditQuery(values = selected) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values))
    if (value !== "" && value !== undefined) query.set(key, value);
  return query;
}

async function loadAudit(ctx, values = selected) {
  if (auditLoading) return auditLoading;
  selected = { ...values };
  auditError = "";
  const root = document.querySelector("#page-content");
  if (root && !auditData)
    root.innerHTML =
      '<div class="admin-loading" style="min-height: 360px; display: flex; flex-direction: column; align-items: center; justify-content: center;"><span></span><p>Đang truy vấn nhật ký…</p></div>';
  auditLoading = ctx
    .api(`/api/modules/audit?${auditQuery()}`)
    .then((result) => {
      auditData = result;
      selected = {
        ...selected,
        ...result.filters,
        page: String(result.pagination.page),
        pageSize: String(result.pagination.pageSize),
      };
    })
    .catch((error) => {
      auditError = error.message;
    })
    .finally(() => {
      auditLoading = null;
      if (activeContext?.page === "audit") {
        const content = document.querySelector("#page-content");
        if (content) content.innerHTML = renderAudit(activeContext);
      }
    });
  return auditLoading;
}

function option(value, label, current, E) {
  return `<option value="${E(value)}" ${String(value) === String(current) ? "selected" : ""}>${E(label)}</option>`;
}

function renderAudit(ctx) {
  const { E, date } = ctx;
  if (auditError)
    return `<div class="admin-callout error"><strong>Không thể tải nhật ký</strong><p>${E(auditError)}</p><button type="button" class="small" data-audit-retry>Thử lại</button></div>`;
  if (!auditData)
    return '<div class="admin-loading"><span></span><p>Đang truy vấn nhật ký…</p></div>';
  const data = auditData;
  const pages = data.pagination.pages;
  const page = data.pagination.page;
  const exportQuery = auditQuery({
    q: selected.q,
    actor: selected.actor,
    action: selected.action,
    objectType: selected.objectType,
    from: selected.from,
    to: selected.to,
  });
  return `<div class="admin-shell audit-admin">
    <section class="panel admin-card no-print">
      <form id="audit-filters" class="admin-filter-grid audit-filters">
        <label class="wide">Từ khóa<input name="q" type="search" value="${E(selected.q || "")}" placeholder="Hành động, mã, chi tiết…"></label>
        <label>Người thao tác<select name="actor"><option value="">Tất cả</option>${data.options.actors.map((row) => option(row.id, row.label, selected.actor, E)).join("")}</select></label>
        <label>Hành động<select name="action"><option value="">Tất cả</option>${data.options.actions.map((value) => option(value, value, selected.action, E)).join("")}</select></label>
        <label>Đối tượng<select name="objectType"><option value="">Tất cả</option>${data.options.objectTypes.map((value) => option(value, value, selected.objectType, E)).join("")}</select></label>
        <label>Từ ngày<input name="from" type="date" lang="vi-VN" value="${E(selected.from || "")}"></label>
        <label>Đến ngày<input name="to" type="date" lang="vi-VN" value="${E(selected.to || "")}"></label>
        <label>Số dòng<select name="pageSize">${[25, 50, 100].map((value) => option(value, `${value} dòng`, selected.pageSize, E)).join("")}</select></label>
        <div class="admin-button-group"><button class="primary" type="submit">Lọc nhật ký</button><button class="small" type="button" data-audit-reset>Đặt lại</button><a class="small admin-link-button" href="/api/modules/audit.csv?${E(exportQuery)}" download>Xuất CSV</a></div>
      </form>
      <p class="admin-data-note">${data.pagination.total} kết quả · Ngày lọc theo ${E(data.timeZone)} · Nội dung CSV được chống công thức bảng tính.</p>
    </section>
    <section class="panel admin-card audit-table">
      <div class="table-scroll"><table>
        <thead><tr><th>Thời gian</th><th>Người thao tác</th><th>Hành động</th><th>Đối tượng</th><th>Chi tiết</th></tr></thead>
        <tbody>${data.rows
          .map(
            (event) => `<tr><td><strong>${E(date(event.eventAt))}</strong></td><td>${E(event.actorLabel)}</td><td><strong>${E(event.action)}</strong></td><td>${E(event.objectType)}${event.objectId ? `<small>${E(event.objectId)}</small>` : ""}</td><td class="audit-detail">${E(event.detail || "—")}</td></tr>`,
          )
          .join("") || '<tr><td colspan="5" class="empty">Không có sự kiện phù hợp.</td></tr>'}</tbody>
      </table></div>
      <div class="pagination"><span>Trang ${page} / ${pages}</span><div>
        <button type="button" class="small" data-audit-page="${page - 1}" ${page === 1 ? "disabled" : ""}>← Trước</button>
        <button type="button" class="small" data-audit-page="${page + 1}" ${page === pages ? "disabled" : ""}>Sau →</button>
      </div></div>
    </section>
  </div>`;
}

if (typeof document !== "undefined") {
  document.addEventListener("submit", (event) => {
    if (event.target.id !== "audit-filters" || !activeContext) return;
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.target));
    loadAudit(activeContext, { ...values, page: "1" });
  });
  document.addEventListener("click", (event) => {
    if (!activeContext) return;
    const page = event.target.closest("[data-audit-page]");
    if (page)
      return loadAudit(activeContext, {
        ...selected,
        page: page.dataset.auditPage,
      });
    if (event.target.closest("[data-audit-reset]"))
      return loadAudit(activeContext, { page: "1", pageSize: "25" });
    if (event.target.closest("[data-audit-retry]"))
      return loadAudit(activeContext, selected);
  });
}

export default function createModule(ctx) {
  activeContext = ctx;
  return {
    render() {
      if (ctx.page !== "audit") return "";
      if (!auditData && !auditLoading) queueMicrotask(() => loadAudit(ctx));
      return renderAudit(ctx);
    },
    async act() {},
  };
}
