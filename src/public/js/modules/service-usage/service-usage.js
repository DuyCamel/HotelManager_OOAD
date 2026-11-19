/** Reception service usage log with a strictly read-only service directory. */
const usageFilters = { query: "", stay: "", status: "" };
let activeContext;
let handlersInstalled = false;

const sameId = (left, right) => String(left) === String(right);

function stayFor(ctx, usage) {
  return (ctx.d.stays || []).find((stay) => sameId(stay.id, usage.stayId));
}

function bookingForStay(ctx, stay) {
  return (ctx.d.bookings || []).find((booking) =>
    sameId(booking.id, stay?.bookingId),
  );
}

function customerForStay(ctx, stay) {
  const booking = bookingForStay(ctx, stay);
  return (ctx.d.customers || []).find((customer) =>
    sameId(customer.id, booking?.customerId),
  );
}

function currentRoomId(ctx, stay) {
  if (stay?.currentRoomId) return stay.currentRoomId;
  const current = (ctx.d.history || []).find(
    (item) => sameId(item.stayId, stay?.id) && !item.toAt,
  );
  return current?.roomId || stay?.roomId || bookingForStay(ctx, stay)?.roomId;
}

function roomForStay(ctx, stay) {
  const roomId = currentRoomId(ctx, stay);
  return (ctx.d.rooms || []).find((room) => sameId(room.id, roomId));
}

function typeForStay(ctx, stay) {
  const room = roomForStay(ctx, stay);
  return (ctx.d.types || []).find((type) => sameId(type.id, room?.typeId));
}

function serviceFor(ctx, usage) {
  return (ctx.d.services || []).find((service) =>
    sameId(service.id, usage.serviceId),
  );
}

function usageStatus(ctx, usage) {
  if (usage.isVoided) return "CANCELLED";
  if (usage.invoiceId) return "PAID";
  if (stayFor(ctx, usage)?.checkOutAt) return "COMPLETED";
  return "PENDING";
}

function matchesUsage(ctx, usage) {
  const stay = stayFor(ctx, usage);
  const customer = customerForStay(ctx, stay);
  const room = roomForStay(ctx, stay);
  const service = serviceFor(ctx, usage);
  const query = usageFilters.query.trim().toLocaleLowerCase("vi");
  if (query) {
    const value = [
      usage.id,
      usage.stayId,
      service?.name,
      service?.id,
      customer?.name,
      customer?.identityNo,
      room?.name,
      room?.id,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("vi");
    if (!value.includes(query)) return false;
  }
  if (usageFilters.stay && !sameId(usage.stayId, usageFilters.stay))
    return false;
  if (usageFilters.status && usageStatus(ctx, usage) !== usageFilters.status)
    return false;
  return true;
}

function option(ctx, value, label, selected) {
  return `<option value="${ctx.E(value)}" ${String(value) === String(selected) ? "selected" : ""}>${ctx.E(label)}</option>`;
}

function renderFilters(ctx) {
  const stayOptions = (ctx.d.stays || [])
    .slice()
    .sort(
      (left, right) =>
        Number(Boolean(left.checkOutAt)) - Number(Boolean(right.checkOutAt)) ||
        Date.parse(right.checkInAt || 0) - Date.parse(left.checkInAt || 0),
    )
    .map((stay) => {
      const customer = customerForStay(ctx, stay);
      const room = roomForStay(ctx, stay);
      return option(
        ctx,
        stay.id,
        `${stay.id} · ${room?.name || currentRoomId(ctx, stay) || "—"} · ${customer?.name || "Khách"}`,
        usageFilters.stay,
      );
    })
    .join("");
  return `<div class="operation-toolbar invoice-filter-toolbar" aria-label="Bộ lọc dịch vụ sử dụng">
    <label class="operation-filter operation-filter-wide">Dịch vụ, khách, phòng hoặc phiếu thuê
      <input type="search" data-usage-filter="query" value="${ctx.E(usageFilters.query)}" placeholder="Tìm phát sinh…" autocomplete="off">
    </label>
    <label class="operation-filter">Phiếu thuê
      <select data-usage-filter="stay"><option value="">Tất cả</option>${stayOptions}</select>
    </label>
    <label class="operation-filter">Trạng thái
      <select data-usage-filter="status"><option value="">Tất cả</option>
        ${option(ctx, "PENDING", "Chờ chốt", usageFilters.status)}
        ${option(ctx, "COMPLETED", "Đã chốt bảng kê", usageFilters.status)}
        ${option(ctx, "PAID", "Đã gắn hóa đơn", usageFilters.status)}
        ${option(ctx, "CANCELLED", "Đã hủy", usageFilters.status)}
      </select>
    </label>
  </div>`;
}

function renderUsageRow(ctx, usage) {
  const stay = stayFor(ctx, usage);
  const customer = customerForStay(ctx, stay);
  const room = roomForStay(ctx, stay);
  const service = serviceFor(ctx, usage);
  const status = usageStatus(ctx, usage);
  const canVoid = !usage.isVoided && !usage.invoiceId && stay && !stay.checkOutAt;
  return `<tr>
    <td class="record-cell"><strong>${ctx.E(service?.name || usage.serviceId || "Dịch vụ")}</strong><small>${ctx.E(usage.id || "—")}</small></td>
    <td class="customer-cell"><strong>${ctx.E(customer?.name || "Chưa có dữ liệu khách")}</strong><small>${ctx.E(room?.name || currentRoomId(ctx, stay) || "—")} · ${ctx.E(usage.stayId)}</small></td>
    <td>${Number(usage.quantity || 0)} <small>${ctx.E(service?.unit || "đơn vị")}</small></td>
    <td class="amount">${ctx.money(usage.unitPrice)}<small>Tổng ${ctx.money(Number(usage.unitPrice || 0) * Number(usage.quantity || 0))}</small></td>
    <td>${ctx.date(usage.usedAt)}</td>
    <td>${ctx.badge(status)}${status === "COMPLETED" ? '<small>Phiếu thuê đã kết thúc</small>' : ""}</td>
    <td class="operation-actions">${canVoid ? ctx.btn("Hủy ghi nhận", "usage.void", usage.id) : ""}</td>
  </tr>`;
}

function renderCatalog(ctx) {
  const services = (ctx.d.services || []).slice().sort((left, right) =>
    String(left.name || "").localeCompare(String(right.name || ""), "vi"),
  );
  return `<section class="operation-section">
    <header class="operation-section-head"><div><h2>Danh mục dịch vụ lễ tân</h2><p>Giá hiện hành để tư vấn; đơn giá thực tế được server chụp lại khi ghi nhận.</p></div><span class="readonly-pill">Chỉ đọc · ${services.filter((service) => service.isActive).length} đang bán</span></header>
    <div class="service-catalog-grid">${
      services
        .map(
          (service) =>
            `<article class="service-catalog-card"><header><h3>${ctx.E(service.name || service.id)}</h3><strong>${ctx.money(service.price)}</strong></header><p>${ctx.E(service.description || "Chưa có mô tả")}</p><small>${ctx.E(service.unit || "Đơn vị")} · ${service.isActive ? "Đang phục vụ" : "Ngừng phục vụ"}</small></article>`,
        )
        .join("") || '<p class="operation-empty">Chưa có danh mục dịch vụ.</p>'
    }</div>
  </section>`;
}

function renderUsage(ctx) {
  const rows = (ctx.d.usage || [])
    .filter((usage) => matchesUsage(ctx, usage))
    .sort(
      (left, right) => Date.parse(right.usedAt || 0) - Date.parse(left.usedAt || 0),
    );
  return `<div class="readonly-banner"><strong>Giá dịch vụ</strong><span>Lễ tân được xem danh mục và ghi phát sinh, không được sửa tên, đơn vị hoặc đơn giá dịch vụ.</span></div>
    ${renderFilters(ctx)}
    <section class="operation-section">
      <header class="operation-section-head"><div><h2>Lịch sử dịch vụ</h2><p>Tra cứu phát sinh và hủy ghi nhận khi khách còn lưu trú; dòng đã chốt không thể sửa.</p></div><span class="readonly-pill">${rows.length} dòng</span></header>
      <div class="operation-table-wrap"><table class="operation-table"><thead><tr>
        <th>Dịch vụ</th><th>Khách / Phòng</th><th>Số lượng</th><th>Đơn giá / Tổng</th><th>Ghi nhận</th><th>Trạng thái</th><th>Thao tác</th>
      </tr></thead><tbody>${
        rows.map((usage) => renderUsageRow(ctx, usage)).join("") ||
        '<tr><td colspan="7" class="empty">Không có phát sinh phù hợp.</td></tr>'
      }</tbody></table></div>
    </section>
    ${renderCatalog(ctx)}`;
}

function rerender(focusSearch = false) {
  if (!activeContext || activeContext.page !== "usage") return;
  const target = document.querySelector("#page-content");
  if (!target) return;
  target.innerHTML = renderUsage(activeContext);
  if (focusSearch) {
    const input = target.querySelector('[data-usage-filter="query"]');
    input?.focus();
    input?.setSelectionRange?.(input.value.length, input.value.length);
  }
}

function updateFilter(event) {
  const control = event.target.closest("[data-usage-filter]");
  if (!control) return;
  if (event.type === "input" && control.tagName === "SELECT") return;
  if (event.type === "change" && control.type === "search") return;
  usageFilters[control.dataset.usageFilter] = control.value;
  rerender(control.dataset.usageFilter === "query");
}

function installHandlers() {
  if (handlersInstalled) return;
  handlersInstalled = true;
  document.addEventListener("input", updateFilter);
  document.addEventListener("change", updateFilter);
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
      return ctx.page === "usage" ? renderUsage(ctx) : "";
    },
    async act(action, id) {
      if (!["usage.new", "usage.stay"].includes(action)) return;
      const stays = (ctx.d.stays || []).filter((stay) => !stay.checkOutAt);
      if (!stays.length) {
        ctx.toast("Không có phiếu thuê đang lưu trú để ghi dịch vụ.");
        return;
      }
      const stayOptions = stays.map((stay) => {
        const room = roomForStay(ctx, stay);
        const customer = customerForStay(ctx, stay);
        return [
          stay.id,
          `${stay.id} · ${room?.name || currentRoomId(ctx, stay) || "—"} · ${customer?.name || "Khách"}`,
        ];
      });
      const selectedStay =
        action === "usage.stay"
          ? stays.find((stay) => sameId(stay.id, id))
          : null;
      const servicesFor = (stay) => {
        const type = typeForStay(ctx, stay);
        const configured = new Map(
          (type?.serviceConfig || []).map((item) => [
            String(item.serviceId),
            item,
          ]),
        );
        return (ctx.d.services || [])
          .filter((service) => configured.has(String(service.id)))
          .map((service) => ({
            ...service,
            included: Boolean(configured.get(String(service.id))?.included),
          }));
      };
      const initialStay =
        selectedStay ||
        stays.find((stay) => servicesFor(stay).some((service) => service.isActive && !service.included)) ||
        stays[0];
      let services = servicesFor(initialStay);
      let selection;
      ctx.form(
        "Ghi dịch vụ sử dụng",
        [
          ctx.field(
            "stayId",
            "Phiếu thuê",
            "select",
            initialStay.id,
            stayOptions,
          ),
        ],
        async (body) => {
          const items = [...selection.querySelectorAll("[data-service-row]")]
            .filter((row) => row.querySelector("[data-service-check]").checked)
            .map((row) => ({
              serviceId: row.dataset.serviceRow,
              quantity: Number(row.querySelector("[data-service-quantity]").value),
            }));
          if (!items.length || items.length > 50)
            throw new Error("Chọn từ 1 đến 50 dịch vụ mỗi lần ghi nhận.");
          if (items.some((item) => !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 1000))
            throw new Error("Số lượng phải là số nguyên từ 1 đến 1000.");
          await ctx.command("usage.add", { stayId: body.stayId, items });
        },
        "Ghi các dịch vụ đã chọn",
        "Chỉ chọn dịch vụ tính phí đã cấu hình cho loại phòng. Dịch vụ chưa cấu hình được ẩn. Tổng tạm tính; server chốt đơn giá khi ghi nhận.",
      );
      const form = document.querySelector("#editor-form");
      const staySelect = form?.elements.stayId;
      selection = document.createElement("section");
      selection.className = "usage-selection";
      document.querySelector("#dialog-fields").append(selection);
      const renderSelection = () => {
        const activeStayId = staySelect?.value || initialStay.id;
        const recorded = (ctx.d.usage || [])
          .filter((u) => sameId(u.stayId, activeStayId))
          .sort((a, b) => Date.parse(b.usedAt || 0) - Date.parse(a.usedAt || 0));
        selection.innerHTML = `<div class="operation-table-wrap"><table class="operation-table"><thead><tr>
          <th>Dịch vụ</th><th>Trạng thái</th><th>Đơn giá</th><th>Chọn</th><th>Số lượng</th><th>Thành tiền</th>
          </tr></thead><tbody>${services.map((service) => {
            const disabled = service.included || !service.isActive;
            return `<tr data-service-row="${ctx.E(service.id)}">
              <td>${ctx.E(service.name || service.id)}<small>${ctx.E(service.unit || "đơn vị")}</small></td>
              <td>${service.included ? "Đã gồm trong giá phòng" : service.isActive ? "Tính phí" : "Ngừng phục vụ"}</td>
              <td>${ctx.money(service.included ? 0 : service.price)}</td>
              <td><input type="checkbox" data-service-check aria-label="${ctx.E(`Chọn ${service.name || service.id}`)}" ${disabled ? "disabled" : ""}></td>
              <td><input type="number" data-service-quantity aria-label="${ctx.E(`Số lượng ${service.name || service.id}`)}" min="1" max="1000" step="1" value="1" disabled required></td>
              <td data-service-subtotal>${ctx.money(0)}</td></tr>`;
          }).join("") || '<tr><td colspan="6">Loại phòng chưa có dịch vụ được cấu hình.</td></tr>'}</tbody></table></div>
          <p class="form-note">Tổng tạm tính: <strong data-service-total>${ctx.money(0)}</strong></p>
          ${recorded.length ? `<div class="operation-table-wrap" style="margin-top:12px"><table class="operation-table"><thead><tr>
            <th>Đã ghi nhận</th><th>SL</th><th>Thành tiền</th><th>Trạng thái</th><th>Thao tác</th>
          </tr></thead><tbody>${recorded.map((u) => {
            const svc = serviceFor(ctx, u);
            const canVoid = !u.isVoided && !u.invoiceId;
            return `<tr>
              <td>${ctx.E(svc?.name || u.serviceId)}<small>${ctx.date(u.usedAt)}</small></td>
              <td>${Number(u.quantity || 0)}</td>
              <td>${ctx.money(Number(u.unitPrice || 0) * Number(u.quantity || 0))}</td>
              <td>${u.isVoided ? "Đã hủy" : u.invoiceId ? "Đã lên HĐ" : "Đang tính"}</td>
              <td>${canVoid ? `<button type="button" class="small" data-void-usage="${ctx.E(u.id)}">Hủy ghi nhận</button>` : ""}</td>
            </tr>`;
          }).join("")}</tbody></table></div>` : ""}`;
      };
      const updateSelection = () => {
        let total = 0;
        selection.querySelectorAll("[data-service-row]").forEach((row) => {
          const checked = row.querySelector("[data-service-check]").checked;
          const quantity = row.querySelector("[data-service-quantity]");
          quantity.disabled = !checked;
          const service = services.find((item) => sameId(item.id, row.dataset.serviceRow));
          const count = Number(quantity.value);
          const subtotal = checked && Number.isSafeInteger(count) && count >= 1 && count <= 1000
            ? Number(service.price) * count : 0;
          row.querySelector("[data-service-subtotal]").textContent = ctx.money(subtotal);
          total += subtotal;
        });
        selection.querySelector("[data-service-total]").textContent = ctx.money(total);
      };
      selection.addEventListener("input", updateSelection);
      selection.addEventListener("change", updateSelection);
      selection.addEventListener("click", async (event) => {
        const voidBtn = event.target.closest?.("[data-void-usage]");
        if (voidBtn) {
          voidBtn.disabled = true;
          try {
            await ctx.command("usage.void", { id: voidBtn.dataset.voidUsage });
            renderSelection();
          } catch {
            voidBtn.disabled = false;
          }
          return;
        }
        if (event.target.closest?.("input, button")) return;
        const row = event.target.closest?.("[data-service-row]");
        const checkbox = row?.querySelector?.("[data-service-check]");
        if (checkbox && !checkbox.disabled) {
          checkbox.checked = !checkbox.checked;
          updateSelection();
        }
      });
      renderSelection();
      staySelect?.addEventListener("change", () => {
        const stay = stays.find((item) => sameId(item.id, staySelect.value));
        services = stay ? servicesFor(stay) : [];
        renderSelection();
      });
    },
  };
}
