/** Backup capability and history UI with typed destructive confirmations. */
let backupData = null;
let backupError = "";
let backupLoading = null;
let activeContext = null;

async function loadBackups(ctx) {
  if (backupLoading) return backupLoading;
  backupError = "";
  backupLoading = ctx
    .api("/api/modules/backups")
    .then((result) => {
      backupData = result;
    })
    .catch((error) => {
      backupError = error.message;
    })
    .finally(() => {
      backupLoading = null;
      if (activeContext?.page === "backups") {
        const root = document.querySelector("#page-content");
        if (root) root.innerHTML = renderBackups(activeContext);
      }
    });
  return backupLoading;
}

function runBackupCommand(ctx, action, fields, title, button, note) {
  ctx.form(
    title,
    fields,
    async (body) => {
      backupData = null;
      try {
        return await ctx.command(action, body);
      } finally {
        await loadBackups(ctx);
      }
    },
    button,
    note,
  );
}

function renderBackups(ctx) {
  const { E, date, d } = ctx;
  if (backupError)
    return `<div class="admin-callout error"><strong>Không thể tải trạng thái sao lưu</strong><p>${E(backupError)}</p><button type="button" class="small" data-backup-retry>Thử lại</button></div>`;
  if (!backupData)
    return '<div class="admin-loading"><span></span><p>Đang kiểm tra khả năng sao lưu…</p></div>';
  const data = backupData;
  const successful = data.history.filter((row) => row.status === "SUCCESS").length;
  const failed = data.history.filter((row) => row.status === "FAILED").length;
  const modeTitle = data.mode === "demo" ? "Dữ liệu demo JSON" : "SQL Server COPY_ONLY";
  const rows = data.history
    .map((row) => {
      const actor = (d.accounts || []).find(
        (account) => account.id === row.createdBy,
      );
      return `<tr>
        <td><strong>${E(row.id)}</strong><small>${E(date(row.backupAt))}</small></td>
        <td><span class="badge ${E(row.status)}">${E(row.status === "SUCCESS" ? "Thành công" : row.status === "FAILED" ? "Thất bại" : row.status)}</span><small>${E(actor?.email || row.createdBy)}</small></td>
        <td><code class="admin-path">${E(row.filePath)}</code></td>
        <td class="backup-note">${E(row.note || "—")}</td>
        <td>${row.canRestore ? `<button type="button" class="small danger-outline" data-backup-restore="${E(row.id)}">Khôi phục demo</button>` : '<span class="muted">Không khả dụng</span>'}</td>
      </tr>`;
    })
    .join("");
  return `<div class="admin-shell backup-admin">
    <section class="admin-kpis">
      <article><span>Chế độ</span><strong class="text-stat">${E(data.mode)}</strong></article>
      <article><span>Thành công</span><strong>${successful}</strong></article>
      <article><span>Thất bại</span><strong>${failed}</strong></article>
      <article><span>Khôi phục trên web</span><strong class="text-stat">${data.canRestore ? "Chỉ demo" : "Không"}</strong></article>
    </section>
    <section class="panel admin-card backup-capability ${!data.sqlBackupConfigured ? "warning" : ""}">
      <div><span class="eyebrow">KHẢ NĂNG HIỆN TẠI</span><h2>${E(modeTitle)}</h2>
        <p>${data.mode === "demo" ? "Tạo bản chụp JSON có chứa toàn bộ dữ liệu demo. Tệp này chỉ dùng cho môi trường demo, không thay thế SQL .bak." : "Máy chủ yêu cầu SQL Server tạo tệp .bak bằng COPY_ONLY và CHECKSUM tại SQL_BACKUP_DIR. Đường dẫn thuộc máy SQL Server, không đến từ trình duyệt."}</p>
        ${!data.sqlBackupConfigured ? '<p class="admin-inline-error">SQL_BACKUP_DIR chưa được cấu hình; lần chạy sẽ được ghi FAILED trong lịch sử.</p>' : ""}
      </div>
      <button type="button" class="primary" data-backup-create>Tạo bản sao lưu</button>
    </section>
    ${data.mode === "sqlserver" ? '<section class="admin-callout"><strong>Khôi phục SQL thực hiện ngoại tuyến</strong><p>Web không cung cấp nút restore. Dùng SSMS trong cửa sổ bảo trì, ngắt kết nối ứng dụng, xác minh CHECKSUM và kiểm thử bản sao trước khi chuyển lưu lượng.</p></section>' : '<section class="admin-callout warning"><strong>Khôi phục demo thay thế toàn bộ dữ liệu</strong><p>Chỉ các bản JSON SUCCESS do ứng dụng tạo mới có nút khôi phục. Sau khi khôi phục, mọi phiên đăng nhập bị kết thúc.</p></section>'}
    <section class="panel admin-card">
      <div class="admin-card-heading"><div><span class="eyebrow">LỊCH SỬ</span><h2>Kết quả sao lưu</h2></div><span>${data.history.length} lần chạy</span></div>
      <div class="table-scroll"><table><thead><tr><th>Mã / thời gian</th><th>Trạng thái</th><th>Tệp đích</th><th>Ghi chú / lỗi</th><th>Thao tác</th></tr></thead><tbody>${rows || '<tr><td colspan="5" class="empty">Chưa có lịch sử sao lưu.</td></tr>'}</tbody></table></div>
    </section>
  </div>`;
}

if (typeof document !== "undefined") {
  document.addEventListener("click", (event) => {
    if (!activeContext) return;
    if (event.target.closest("[data-backup-create]"))
      return runBackupCommand(
        activeContext,
        "system.backup",
        [activeContext.field("confirm", 'Nhập "SAO LUU" để xác nhận')],
        "Xác nhận tạo bản sao",
        "Tạo bản sao",
        "Tác vụ có thể tốn thời gian và tài nguyên I/O. Không đóng trang cho đến khi có kết quả.",
      );
    const restore = event.target.closest("[data-backup-restore]");
    if (restore) {
      const id = restore.dataset.backupRestore;
      return runBackupCommand(
        activeContext,
        "system.restore",
        [
          activeContext.field("id", "", "hidden", id),
          activeContext.field(
            "confirm",
            `Nhập "KHOI PHUC ${id}" để xác nhận`,
          ),
        ],
        "Khôi phục bản sao demo",
        "Khôi phục toàn bộ",
        "Dữ liệu hiện tại sẽ bị thay thế và tất cả phiên đăng nhập sẽ kết thúc.",
      );
    }
    if (event.target.closest("[data-backup-retry]"))
      return loadBackups(activeContext);
  });
}

export default function createModule(ctx) {
  activeContext = ctx;
  return {
    render() {
      if (ctx.page !== "backups") return "";
      if (!backupData && !backupLoading)
        queueMicrotask(() => loadBackups(ctx));
      return renderBackups(ctx);
    },
    async act() {},
  };
}
