
/** Account administration with explicit filters and role boundaries. */
if (
  typeof document !== "undefined" &&
  !document.querySelector('link[href="/assets/css/workspace/admin.css"]')
) {
  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = "/assets/css/workspace/admin.css";
  document.head.append(stylesheet);
}

const filters = { q: "", role: "", active: "", page: 1 };
let metadata = null;
let metadataError = "";
let loadingMetadata = null;
let activeContext = null;

function loadMetadata(ctx) {
  if (metadata || loadingMetadata) return;
  loadingMetadata = ctx
    .api("/api/modules/accounts")
    .then((result) => {
      metadata = result;
      metadataError = "";
    })
    .catch((error) => {
      metadataError = error.message;
    })
    .finally(() => {
      loadingMetadata = null;
      if (activeContext?.page === "accounts") {
        const root = document.querySelector("#page-content");
        if (root) root.innerHTML = renderAccounts(activeContext);
      }
    });
}

function getAccountFilterData(ctx) {
  const { E, badge, btn, d, manager, role } = ctx;
  const viewerId = document.body.dataset.userId;
  const roleRank = {
    MANAGER: 1,
    ADMIN: 2,
    RECEPTIONIST: 3,
    HOUSEKEEPER: 4,
    CUSTOMER: 5,
  };
  const sortedAccounts = (d.accounts || []).slice().sort((a, b) => {
    const diff = (roleRank[a.role] || 99) - (roleRank[b.role] || 99);
    if (diff !== 0) return diff;
    const timeA = Date.parse(a.createdAt || "") || 0;
    const timeB = Date.parse(b.createdAt || "") || 0;
    if (timeA !== timeB) return timeB - timeA;
    return String(b.id || "").localeCompare(String(a.id || ""));
  });
  const rows = sortedAccounts.filter((account) => {
    const haystack = `${account.name} ${account.email} ${account.phone}`.toLowerCase();
    return (
      (!filters.q || haystack.includes(filters.q.toLowerCase())) &&
      (!filters.role || account.role === filters.role) &&
      (!filters.active ||
        String(account.isActive) === String(filters.active === "ACTIVE"))
    );
  });
  const pageSize = 12;
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  filters.page = Math.min(filters.page, pages);
  const visible = rows.slice(
    (filters.page - 1) * pageSize,
    filters.page * pageSize,
  );
  const capabilities = metadata?.capabilities || {
    createStaff: ["ADMIN", "MANAGER"].includes(role),
    assignRoles: manager,
    transferAdmin: manager,
  };
  const accountRows = visible
    .map((account) => {
      const canManage = manager || account.role !== "MANAGER";
      const canToggle =
        canManage && account.role !== "MANAGER" && account.id !== viewerId;
      const canAssign =
        capabilities.assignRoles &&
        account.isActive &&
        ["ADMIN", "RECEPTIONIST", "HOUSEKEEPER"].includes(account.role) &&
        account.id !== viewerId;
      const canTransfer =
        manager && capabilities.transferAdmin &&
        account.role === "ADMIN" &&
        account.isActive;
      return `<tr>
        <td data-label="Tài khoản"><strong>${E(account.name)}</strong><small>${E(account.email)}</small></td>
        <td data-label="Vai trò">${badge(account.role)}</td>
        <td data-label="Điện thoại">${E(account.phone)}</td>
        <td data-label="Trạng thái"><span class="badge ${account.isActive ? "ACTIVE" : "DISABLED"}">${account.isActive ? "Đang hoạt động" : "Đã khóa"}</span></td>
        <td data-label="Thao tác" class="admin-actions">
          ${canManage ? btn("Sửa", "account.edit", account.id) : ""}
          ${canToggle ? btn(account.isActive ? "Khóa" : "Mở", "account.toggle", account.id) : ""}
          ${canAssign ? btn("Đổi vai trò", "account.role", account.id) : ""}
          ${canTransfer ? btn("Chuyển quyền Quản lý", "admin.transfer", account.id, "danger-outline") : ""}
          ${account.id === viewerId ? '<span class="admin-self">Đang đăng nhập</span>' : ""}
        </td>
      </tr>`;
    })
    .join("");

  return { rows, pages, accountRows };
}

function updateAccountsView(ctx) {
  const tableBody = document.querySelector(".accounts-admin tbody");
  const resultEl = document.querySelector(".accounts-admin .admin-filter-result");
  const paginationEl = document.querySelector(".accounts-admin .pagination");
  if (!tableBody || !resultEl || !paginationEl) {
    const root = document.querySelector("#page-content");
    if (root) root.innerHTML = renderAccounts(ctx);
    return;
  }
  const { rows, pages, accountRows } = getAccountFilterData(ctx);
  resultEl.innerHTML = `<strong>${rows.length}</strong><span>tài khoản phù hợp</span>`;
  tableBody.innerHTML = accountRows || '<tr><td colspan="5" class="empty">Không có tài khoản phù hợp.</td></tr>';
  paginationEl.innerHTML = `<span>Trang ${filters.page} / ${pages}</span><div>
    <button type="button" class="small" data-accounts-page="${filters.page - 1}" ${filters.page === 1 ? "disabled" : ""}>← Trước</button>
    <button type="button" class="small" data-accounts-page="${filters.page + 1}" ${filters.page === pages ? "disabled" : ""}>Sau →</button>
  </div>`;
}

function renderAccounts(ctx) {
  const { E, badge, btn, d, manager, role } = ctx;
  const { rows, pages, accountRows } = getAccountFilterData(ctx);
  const roleOptions = [
    ["", "Tất cả vai trò"],
    ["MANAGER", "Quản lý"],
    ["ADMIN", "Admin"],
    ["RECEPTIONIST", "Lễ tân"],
    ["HOUSEKEEPER", "Buồng phòng"],
    ["CUSTOMER", "Khách hàng"],
  ];
  const roleSummary = metadata?.roles
    ?.map(
      (role) => `<article class="admin-permission-card">
        <div>${badge(role.code)}<strong>${E(role.label)}</strong></div>
        <p>${role.permissions.map(E).join(" · ")}</p>
      </article>`,
    )
    .join("");

  return `<div class="admin-shell accounts-admin">
    <section class="admin-kpis" aria-label="Tóm tắt tài khoản">
      <article><span>Tổng tài khoản</span><strong>${d.accounts?.length || 0}</strong></article>
      <article><span>Đang hoạt động</span><strong>${(d.accounts || []).filter((row) => row.isActive).length}</strong></article>
      <article><span>Nhân sự</span><strong>${(d.accounts || []).filter((row) => row.role !== "CUSTOMER").length}</strong></article>
      <article><span>Khách hàng</span><strong>${(d.accounts || []).filter((row) => row.role === "CUSTOMER").length}</strong></article>
    </section>
    <section class="panel admin-card">
      <form class="admin-filter-grid account-filters" data-account-filters>
        <label>Tìm tài khoản<input type="search" data-account-filter="q" placeholder="Tên, email, điện thoại" value="${E(filters.q)}"></label>
        <label>Vai trò<select data-account-filter="role">${roleOptions.map(([value, label]) => `<option value="${value}" ${filters.role === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>
        <label>Trạng thái<select data-account-filter="active">
          <option value="">Tất cả trạng thái</option>
          <option value="ACTIVE" ${filters.active === "ACTIVE" ? "selected" : ""}>Đang hoạt động</option>
          <option value="DISABLED" ${filters.active === "DISABLED" ? "selected" : ""}>Đã khóa</option>
        </select></label>
        <div class="admin-filter-result"><strong>${rows.length}</strong><span>tài khoản phù hợp</span></div>
      </form>
      <div class="table-scroll"><table>
        <thead><tr><th>Tài khoản</th><th>Vai trò</th><th>Điện thoại</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
        <tbody>${accountRows || '<tr><td colspan="5" class="empty">Không có tài khoản phù hợp.</td></tr>'}</tbody>
      </table></div>
      <div class="pagination"><span>Trang ${filters.page} / ${pages}</span><div>
        <button type="button" class="small" data-accounts-page="${filters.page - 1}" ${filters.page === 1 ? "disabled" : ""}>← Trước</button>
        <button type="button" class="small" data-accounts-page="${filters.page + 1}" ${filters.page === pages ? "disabled" : ""}>Sau →</button>
      </div></div>
    </section>
    <section class="admin-section-heading"><div><span class="eyebrow">PHÂN QUYỀN</span><h2>Quyền theo vai trò</h2></div><p>${manager ? "Chuyển quyền Quản lý chỉ được thực hiện qua quy trình OTP riêng; không thể cấp từ biểu mẫu đổi vai trò." : "Admin có thể cập nhật, khóa và đổi vai trò tài khoản nhân sự thường; không thể sửa tài khoản Quản lý."}</p></section>
    <section class="admin-permissions">
      ${roleSummary || `<p class="admin-callout ${metadataError ? "error" : ""}">${E(metadataError || "Đang tải ma trận quyền…")}</p>`}
    </section>
  </div>`;
}

if (typeof document !== "undefined") {
  document.addEventListener("submit", (event) => {
    if (event.target.matches("[data-account-filters]")) event.preventDefault();
  });
  document.addEventListener("input", (event) => {
    const input = event.target.closest('[data-account-filter="q"]');
    if (!input || !activeContext) return;
    filters.q = input.value;
    filters.page = 1;
    updateAccountsView(activeContext);
  });
  document.addEventListener("change", (event) => {
    const input = event.target.closest("[data-account-filter]");
    if (!input || !activeContext || input.dataset.accountFilter === "q") return;
    filters[input.dataset.accountFilter] = input.value;
    filters.page = 1;
    updateAccountsView(activeContext);
  });
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-accounts-page]");
    if (!button || !activeContext) return;
    filters.page = Number(button.dataset.accountsPage);
    updateAccountsView(activeContext);
  });
}

function attachConflictChecker(ctx) {
  queueMicrotask(() => {
    const dialog = document.querySelector("#editor");
    if (!dialog) return;
    const emailInput = dialog.querySelector('input[name="email"]');
    const phoneInput = dialog.querySelector('input[name="phone"]');
    const idInput = dialog.querySelector('input[name="id"]');
    const msgEl = dialog.querySelector(".form-message");
    if (!msgEl) return;

    const check = () => {
      const currentId = idInput?.value || "";
      const email = emailInput?.value?.trim()?.toLowerCase() || "";
      const phone = phoneInput?.value?.trim() || "";
      const accounts = ctx.d.accounts || [];

      if (phone && !/^0[0-9]{9}$/.test(phone)) {
        msgEl.innerHTML = `<div style="color:var(--danger);margin:8px 0">⚠️ Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0 (hiện có ${phone.length} ký tự).</div>`;
        return;
      }

      // Check conflict with existing account
      let found = null;
      let conflictField = "";
      if (email) {
        found = accounts.find((a) => a.id !== currentId && a.email?.toLowerCase() === email);
        if (found) conflictField = "Email";
      }
      if (!found && phone) {
        found = accounts.find((a) => a.id !== currentId && a.phone === phone);
        if (found) conflictField = "Số điện thoại";
      }

      if (found) {
        if (found.role === "CUSTOMER") {
          const isManager = ctx.manager;
          msgEl.innerHTML = `
            <div style="background:#f4f7f4;border:1px solid #c2d6cb;border-radius:10px;padding:12px;margin:8px 0;color:#173f35;text-align:left">
              <div style="font-weight:600;margin-bottom:4px">⚠️ ${conflictField} này đang gắn với tài khoản Khách hàng:</div>
              <div style="font-size:13px;margin-bottom:8px"><strong>${ctx.E(found.name)}</strong> (${ctx.E(found.email)} · ${ctx.E(found.phone)})</div>
              <div style="font-size:12px;margin-bottom:8px;color:#2c5243">Bạn có muốn chuyển đổi tài khoản khách này thành nhân viên không?</div>
              ${isManager ? `
                <label style="display:flex;align-items:flex-start;gap:8px;font-size:13px;cursor:pointer;background:#fff;padding:8px 10px;border-radius:6px;border:1px solid #b1cfc0">
                  <input type="checkbox" name="convertCustomer" value="true" style="margin-top:3px;width:auto">
                  <span><strong>Chuyển đổi tài khoản khách này thành nhân viên</strong><br><small style="color:#5e7a6d">Nếu muốn nhân viên dùng tài khoản riêng (để giữ tài khoản khách cá nhân/khi nghỉ việc), hãy bỏ chọn và nhập email/SĐT khác.</small></span>
                </label>
              ` : `<div style="font-size:12px;color:#a34d40">Chỉ Quản lý mới có quyền chuyển đổi tài khoản khách thành nhân viên. Vui lòng dùng email/SĐT khác.</div>`}
            </div>
          `;
          return;
        }
        msgEl.innerHTML = `<div style="color:var(--danger);margin:8px 0">⚠️ ${conflictField} này đã thuộc tài khoản nhân sự ${ctx.labels[found.role] || found.role} '<strong>${ctx.E(found.name)}</strong>'. Vui lòng dùng ${conflictField.toLowerCase()} khác.</div>`;
        return;
      }

      // If no conflict, clear message if it was a warning
      if (msgEl.innerHTML.includes("⚠️")) {
        msgEl.innerHTML = "";
      }
    };

    emailInput?.addEventListener("input", check);
    phoneInput?.addEventListener("input", check);
  });
}

export default function createModule(ctx) {
  activeContext = ctx;
  return {
    render() {
      if (ctx.page !== "accounts") return "";
      queueMicrotask(() => loadMetadata(ctx));
      return renderAccounts(ctx);
    },
    async act(action, id) {
      const hidden = () => ctx.field("id", "", "hidden", id);
      if (action === "account.new") {
        attachConflictChecker(ctx);
        return ctx.actionForm(
          "Tạo tài khoản nhân viên",
          [
            ctx.field("name", "Họ tên"),
            ctx.field("email", "Email", "email"),
            ctx.field("phone", "Điện thoại", "tel"),
            ctx.field("password", "Mật khẩu ban đầu", "password"),
            ctx.field("role", "Vai trò", "select", "ADMIN", [
              ["ADMIN", "Admin"],
              ["RECEPTIONIST", "Lễ tân"],
              ["HOUSEKEEPER", "Buồng phòng"],
            ]),
          ],
          "account.create",
          "Quản lý và Admin có thể tạo tài khoản nhân viên. Mật khẩu phải có ít nhất 8 ký tự. Email và số điện thoại phải là duy nhất.",
        );
      }
      const account = (ctx.d.accounts || []).find((row) => row.id === id);
      if (!account) return;
      if (action === "account.edit") {
        attachConflictChecker(ctx);
        return ctx.actionForm(
          "Cập nhật tài khoản",
          [
            hidden(),
            ctx.field("name", "Họ tên", "text", account.name),
            ctx.field("email", "Email", "email", account.email),
            ctx.field("phone", "Điện thoại", "tel", account.phone),
          ],
          "account.update",
          account.role === "CUSTOMER"
            ? "Tên và điện thoại của hồ sơ khách hàng liên kết sẽ được đồng bộ."
            : "Thay đổi thông tin không làm đổi vai trò.",
        );
      }
      if (action === "account.role")
        return ctx.actionForm(
          "Đổi vai trò nhân viên",
          [
            hidden(),
            ctx.field("role", "Vai trò mới", "select", account.role, [
              ["ADMIN", "Admin"],
              ["RECEPTIONIST", "Lễ tân"],
              ["HOUSEKEEPER", "Buồng phòng"],
            ]),
          ],
          action,
          "Không thể cấp quyền Quản lý tại đây. Phiên hiện tại của nhân viên sẽ bị thu hồi sau khi đổi vai trò.",
        );
    },
  };
}
