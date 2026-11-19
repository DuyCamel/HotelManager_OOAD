/** Immutable invoice explorer and confirmation-gated checkout. */
import { openPayment } from "../../core/payments.js";
const invoiceFilters = {
  query: "",
  status: "",
  method: "",
  from: "",
  to: "",
};

let activeContext;
let handlersInstalled = false;

const sameId = (left, right) => String(left) === String(right);

const methodLabels = {
  CASH: "Tiền mặt",
  TRANSFER: "Chuyển khoản",
  BANK: "Chuyển khoản",
  CARD: "Thẻ",
};

function invoiceTotal(invoice) {
  return (
    Number(invoice.roomCharge || 0) +
    Number(invoice.serviceCharge || 0) +
    Number(invoice.surcharge || 0) -
    Number(invoice.discount || 0)
  );
}

function invoiceDue(invoice) {
  const value = Number(invoice.amountDue);
  return invoice.amountDue !== null &&
    invoice.amountDue !== undefined &&
    invoice.amountDue !== "" &&
    Number.isFinite(value)
    ? value
    : invoiceTotal(invoice) - Number(invoice.deposit || 0);
}

function stayFor(ctx, invoice) {
  return (ctx.d.stays || []).find((stay) => sameId(stay.id, invoice.stayId));
}

function bookingForStay(ctx, stay) {
  return (ctx.d.bookings || []).find((booking) =>
    sameId(booking.id, stay?.bookingId),
  );
}

function customerFor(ctx, invoice) {
  const stay = stayFor(ctx, invoice);
  const booking = bookingForStay(ctx, stay);
  const customerId = invoice.customerId || booking?.customerId;
  return (ctx.d.customers || []).find((customer) =>
    sameId(customer.id, customerId),
  );
}

function paymentFor(ctx, invoice) {
  return (ctx.d.payments || []).find(
    (payment) =>
      sameId(payment.invoiceId, invoice.id) && payment.kind === "SETTLEMENT",
  );
}

function currentRoomId(ctx, stay) {
  if (stay?.currentRoomId) return stay.currentRoomId;
  const history = (ctx.d.history || []).find(
    (item) => sameId(item.stayId, stay?.id) && !item.toAt,
  );
  return history?.roomId || stay?.roomId || bookingForStay(ctx, stay)?.roomId;
}

function invoiceLines(ctx, invoice) {
  const rows = (ctx.d.lines || []).filter((line) =>
    sameId(line.invoiceId, invoice.id),
  );
  if (rows.length) return rows;
  const fallback = [];
  if (Number(invoice.roomCharge || 0))
    fallback.push({
      description: "Tiền lưu trú (tổng hợp)",
      quantity: 1,
      unitPrice: Number(invoice.roomCharge),
      lineType: "ROOM",
    });
  if (Number(invoice.serviceCharge || 0))
    fallback.push({
      description: "Dịch vụ (không có chi tiết dòng)",
      quantity: 1,
      unitPrice: Number(invoice.serviceCharge),
      lineType: "SERVICE",
    });
  if (Number(invoice.surcharge || 0))
    fallback.push({
      description: "Phụ thu",
      quantity: 1,
      unitPrice: Number(invoice.surcharge),
      lineType: "SURCHARGE",
    });
  return fallback;
}

function lineAmount(line) {
  const mapped = Number(line.lineAmount);
  return line.lineAmount !== null &&
    line.lineAmount !== undefined &&
    line.lineAmount !== "" &&
    Number.isFinite(mapped)
    ? mapped
    : Number(line.quantity || 0) * Number(line.unitPrice || 0);
}

function matchesInvoice(ctx, invoice) {
  const customer = customerFor(ctx, invoice);
  const payment = paymentFor(ctx, invoice);
  const query = invoiceFilters.query.trim().toLocaleLowerCase("vi");
  if (query) {
    const value = [
      invoice.id,
      invoice.stayId,
      invoice.status,
      invoice.method,
      invoice.paymentReference || payment?.externalReference,
      customer?.id,
      invoice.customerName || customer?.name,
      invoice.customerPhone || customer?.phone,
      invoice.customerIdentity || customer?.identityNo,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("vi");
    if (!value.includes(query)) return false;
  }
  if (invoiceFilters.status && invoice.status !== invoiceFilters.status)
    return false;
  const method = invoice.method || payment?.method;
  if (invoiceFilters.method && method !== invoiceFilters.method) return false;
  const day = String(invoice.issuedAt || "").slice(0, 10);
  if (invoiceFilters.from && day && day < invoiceFilters.from) return false;
  if (invoiceFilters.to && day && day > invoiceFilters.to) return false;
  return true;
}

function option(ctx, value, label, selected) {
  return `<option value="${ctx.E(value)}" ${value === selected ? "selected" : ""}>${ctx.E(label)}</option>`;
}

function renderFilters(ctx) {
  return `<div class="operation-toolbar invoice-filter-toolbar" aria-label="Bộ lọc hóa đơn">
    <label class="operation-filter operation-filter-wide">Mã, khách, CCCD hoặc tham chiếu
      <input type="search" data-invoice-filter="query" value="${ctx.E(invoiceFilters.query)}" placeholder="Tìm chứng từ…" autocomplete="off">
    </label>
    <label class="operation-filter">Trạng thái
      <select data-invoice-filter="status"><option value="">Tất cả</option>
        ${option(ctx, "PAID", "Đã thanh toán", invoiceFilters.status)}
        ${option(ctx, "DRAFT", "Nháp", invoiceFilters.status)}
      </select>
    </label>
    <label class="operation-filter">Phương thức
      <select data-invoice-filter="method"><option value="">Tất cả</option>
        ${option(ctx, "CASH", "Tiền mặt", invoiceFilters.method)}
        ${option(ctx, "TRANSFER", "Chuyển khoản", invoiceFilters.method)}
        ${option(ctx, "CARD", "Thẻ", invoiceFilters.method)}
      </select>
    </label>
    <label class="operation-filter">Từ ngày<input type="date" data-invoice-filter="from" value="${ctx.E(invoiceFilters.from)}"></label>
    <label class="operation-filter">Đến ngày<input type="date" data-invoice-filter="to" value="${ctx.E(invoiceFilters.to)}"></label>
  </div>`;
}

function invoiceRow(ctx, invoice) {
  const customer = customerFor(ctx, invoice);
  const payment = paymentFor(ctx, invoice);
  const method = invoice.method || payment?.method;
  const reference = invoice.paymentReference || payment?.externalReference;
  return `<tr>
    <td class="record-cell"><button type="button" class="invoice-id-button" data-invoice-detail="${ctx.E(invoice.id)}">${ctx.E(invoice.id)}</button><small>${ctx.date(invoice.issuedAt)}</small></td>
    <td class="customer-cell"><strong>${ctx.E(invoice.customerName || customer?.name || "Chưa có dữ liệu khách")}</strong><small>${ctx.E(invoice.customerIdentity || invoice.customerPhone || customer?.identityNo || customer?.phone || customer?.id || "—")}</small></td>
    <td>${ctx.E(invoice.roomName || invoice.stayId || "—")}</td>
    <td class="amount"><strong>${ctx.money(invoiceTotal(invoice))}</strong><small>Cọc ${ctx.money(invoice.deposit)} · Thu ${ctx.money(invoiceDue(invoice))}</small></td>
    <td><strong>${ctx.E(methodLabels[method] || method || "Chưa có")}</strong><small>${ctx.E(reference || "Không có mã tham chiếu")}</small></td>
    <td>${ctx.badge(invoice.status)}</td>
    <td class="operation-actions"><button type="button" class="small" data-invoice-detail="${ctx.E(invoice.id)}">Chi tiết</button><a class="small" target="_blank" rel="noopener" href="/api/invoice/${encodeURIComponent(invoice.id)}">In chứng từ</a></td>
  </tr>`;
}

function renderInvoices(ctx) {
  const rows = (ctx.d.invoices || [])
    .filter((invoice) => matchesInvoice(ctx, invoice))
    .sort(
      (left, right) =>
        Date.parse(right.issuedAt || 0) - Date.parse(left.issuedAt || 0),
    );
  return `<div class="readonly-banner"><strong>Chứng từ bất biến</strong><span>Hóa đơn đã lập chỉ được xem và in. Không có thao tác sửa số tiền, khách hàng hoặc dòng chi tiết trên màn hình này.</span></div>
    ${renderFilters(ctx)}
    <section class="operation-section">
      <header class="operation-section-head"><div><h2>Danh sách hóa đơn</h2><p>Mở chi tiết để đối chiếu dòng tiền và mã tham chiếu.</p></div><span class="readonly-pill">${rows.length} chứng từ</span></header>
      <div class="operation-table-wrap"><table class="operation-table"><thead><tr>
        <th>Hóa đơn</th><th>Khách hàng</th><th>Phiếu thuê</th><th>Tổng / Còn thu</th><th>Thanh toán</th><th>Trạng thái</th><th>Chứng từ</th>
      </tr></thead><tbody>${
        rows.map((invoice) => invoiceRow(ctx, invoice)).join("") ||
        '<tr><td colspan="7" class="empty">Không có hóa đơn phù hợp bộ lọc.</td></tr>'
      }</tbody></table></div>
    </section>`;
}

function rerenderInvoices(focusSearch = false) {
  if (!activeContext || activeContext.page !== "invoices") return;
  const target = document.querySelector("#page-content");
  if (!target) return;
  target.innerHTML = renderInvoices(activeContext);
  if (focusSearch) {
    const input = target.querySelector('[data-invoice-filter="query"]');
    input?.focus();
    input?.setSelectionRange?.(input.value.length, input.value.length);
  }
}

function detailItem(ctx, label, value) {
  return `<div><dt>${ctx.E(label)}</dt><dd>${ctx.E(value ?? "—")}</dd></div>`;
}

function removeDialog(id) {
  const current = document.querySelector(`#${id}`);
  if (!current) return;
  if (current.open) current.close();
  else current.remove();
}

function attachDialogLifecycle(dialog) {
  dialog.addEventListener(
    "click",
    (event) => {
      const target = typeof event.target?.closest === "function" ? event.target : event.target?.parentElement;
      const closeButton = target?.closest?.("[data-operation-close]");
      if (event.target === dialog || (closeButton && dialog.contains(closeButton)))
        dialog.close();
    },
    { passive: true },
  );
  dialog.addEventListener("close", () => dialog.remove(), { once: true });
}

function openInvoiceDetail(ctx, id) {
  const invoice = (ctx.d.invoices || []).find((item) => sameId(item.id, id));
  if (!invoice) return ctx.toast("Không còn dữ liệu hóa đơn này.");
  removeDialog("invoice-detail-dialog");
  const customer = customerFor(ctx, invoice);
  const stay = stayFor(ctx, invoice);
  const booking = bookingForStay(ctx, stay);
  const payment = paymentFor(ctx, invoice);
  const method = invoice.method || payment?.method;
  const lines = invoiceLines(ctx, invoice);
  const roomId = currentRoomId(ctx, stay);
  const room = (ctx.d.rooms || []).find((item) => sameId(item.id, roomId));
  const dialog = document.createElement("dialog");
  dialog.id = "invoice-detail-dialog";
  dialog.className = "operations-dialog invoice-detail-dialog";
  dialog.setAttribute("aria-labelledby", "invoice-detail-title");
  dialog.setAttribute("aria-describedby", "invoice-detail-note");
  dialog.innerHTML = `<div class="dialog-head"><div><span class="eyebrow">CHỨNG TỪ CHỈ ĐỌC</span><h2 id="invoice-detail-title">${ctx.E(invoice.id)}</h2><p>${ctx.date(invoice.issuedAt)} · ${ctx.badge(invoice.status)}</p></div><button type="button" class="icon-button" data-operation-close aria-label="Đóng chi tiết hóa đơn">×</button></div>
    <div id="invoice-detail-note" class="readonly-banner"><strong>Đã chốt</strong><span>Dữ liệu bên dưới là bản trình bày bất biến của chứng từ hiện có.</span></div>
    <div class="invoice-detail-grid">
      <section><h3>Khách và kỳ lưu trú</h3><dl class="operation-detail-list">
        ${detailItem(ctx, "Khách hàng", invoice.customerName || customer?.name || "Chưa có dữ liệu")}
        ${detailItem(ctx, "CCCD / Hộ chiếu", invoice.customerIdentity || customer?.identityNo || stay?.identityNo)}
        ${detailItem(ctx, "Điện thoại", invoice.customerPhone || customer?.phone)}
        ${detailItem(ctx, "Phiếu thuê", invoice.stayId)}
        ${detailItem(ctx, "Phòng", invoice.roomName || room?.name || roomId)}
        ${detailItem(ctx, "Kỳ đặt", booking ? `${ctx.date(booking.startAt)} → ${ctx.date(booking.endAt)}` : "—")}
      </dl></section>
      <section><h3>Thanh toán</h3><dl class="operation-detail-list">
        ${detailItem(ctx, "Phương thức", methodLabels[method] || method || "Chưa có")}
        ${detailItem(ctx, "Mã tham chiếu", invoice.paymentReference || payment?.externalReference || "Không có")}
        ${detailItem(ctx, "Thời điểm thu", ctx.date(payment?.paidAt || invoice.issuedAt))}
        ${detailItem(ctx, "Trạng thái", ctx.labels[invoice.status] || invoice.status)}
      </dl></section>
    </div>
    <div class="bill-table-wrap"><table class="bill-table"><thead><tr><th>Nội dung</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>${lines
      .map(
        (line) =>
          `<tr><td>${ctx.E(line.description || line.lineType || "Dòng hóa đơn")}</td><td>${Number(line.quantity || 0)}</td><td>${ctx.money(line.unitPrice)}</td><td>${ctx.money(lineAmount(line))}</td></tr>`,
      )
      .join("") || '<tr><td colspan="4" class="empty">Không có dữ liệu dòng hóa đơn.</td></tr>'}</tbody></table></div>
    <div class="bill-totals">
      ${Number(invoice.discount || 0) ? `<p><span>Giảm giá thành viên</span><strong>− ${ctx.money(invoice.discount)}</strong></p>` : ""}
      <p><span>Tổng trước cọc</span><strong>${ctx.money(invoiceTotal(invoice))}</strong></p>
      <p><span>Đã đặt cọc</span><strong>− ${ctx.money(invoice.deposit)}</strong></p>
      <h3><span>Đã thu khi trả phòng</span><strong>${ctx.money(invoiceDue(invoice))}</strong></h3>
    </div>
    <div class="dialog-actions"><button type="button" data-operation-close>Đóng</button><a class="primary" target="_blank" rel="noopener" href="/api/invoice/${encodeURIComponent(invoice.id)}">Mở bản in</a></div>`;
  document.body.append(dialog);
  attachDialogLifecycle(dialog);
  dialog.showModal();
  dialog.querySelector("[data-operation-close]")?.focus();
}

function createCheckoutDialog(ctx) {
  removeDialog("checkout-dialog");
  const dialog = document.createElement("dialog");
  dialog.id = "checkout-dialog";
  dialog.className = "operations-dialog checkout-dialog";
  dialog.setAttribute("aria-labelledby", "checkout-dialog-title");
  dialog.setAttribute("aria-describedby", "checkout-dialog-description");
  dialog.innerHTML = `<div class="dialog-head"><div><span class="eyebrow">CHECKOUT DESK</span><h2 id="checkout-dialog-title">Đang tải bảng kê</h2><p id="checkout-dialog-description">Dữ liệu được tính lại từ server.</p></div><button type="button" class="icon-button" data-operation-close aria-label="Đóng trả phòng">×</button></div><div data-checkout-body><p class="empty">Đang tải chi tiết…</p></div>`;
  document.body.append(dialog);
  attachDialogLifecycle(dialog);
  dialog.showModal();
  dialog.querySelector("[data-operation-close]")?.focus();
  return dialog;
}

function previewRows(ctx, preview) {
  const rows = [
    {
      name: "Tiền lưu trú",
      quantity: 1,
      unitPrice: Number(preview.roomCharge || 0),
      total: Number(preview.roomCharge || 0),
    },
    ...(preview.lines || []).map((line) => ({
      name: line.name || line.description || line.serviceId || "Dịch vụ",
      quantity: Number(line.quantity || 0),
      unitPrice: Number(line.unitPrice || 0),
      total:
        Number.isFinite(Number(line.total))
          ? Number(line.total)
          : Number(line.quantity || 0) * Number(line.unitPrice || 0),
    })),
  ];
  if (Number(preview.surcharge || 0))
    rows.push({
      name: "Phụ thu",
      quantity: 1,
      unitPrice: Number(preview.surcharge),
      total: Number(preview.surcharge),
    });
  return rows;
}

function renderCheckoutProgress(step) {
  return `<div class="checkout-progress" aria-label="Bước ${step} trên 2"><span class="is-active"></span><span class="${step > 1 ? "is-active" : ""}"></span></div>`;
}

function renderPreviewStep(ctx, dialog, preview, stayId) {
  const stay = (ctx.d.stays || []).find((item) => sameId(item.id, stayId));
  const booking = bookingForStay(ctx, stay);
  const customer = (ctx.d.customers || []).find((item) =>
    sameId(item.id, booking?.customerId),
  );
  const rows = previewRows(ctx, preview);
  const requiresPayment = Number(preview.due || 0) > 0;
  dialog.querySelector("#checkout-dialog-title").textContent = "Đối chiếu bảng kê";
  dialog.querySelector("#checkout-dialog-description").textContent =
    `${customer?.name || "Khách hàng"} · Phiếu ${stayId}`;
  const body = dialog.querySelector("[data-checkout-body]");
  body.innerHTML = `${renderCheckoutProgress(1)}
    <div class="readonly-banner"><strong>Bước 1</strong><span>Kiểm tra từng dòng và số còn thu trước khi chọn phương thức. Chưa có hóa đơn nào được tạo ở bước này.</span></div>
    <div class="bill-table-wrap"><table class="bill-table"><thead><tr><th>Nội dung</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>${rows
      .map(
        (line) =>
          `<tr><td>${ctx.E(line.name)}</td><td>${line.quantity}</td><td>${ctx.money(line.unitPrice)}</td><td>${ctx.money(line.total)}</td></tr>`,
      )
      .join("")}</tbody></table></div>
    <div class="bill-totals">
      <p><span>Tiền phòng</span><strong>${ctx.money(preview.roomCharge)}</strong></p>
      <p><span>Dịch vụ</span><strong>${ctx.money(preview.serviceCharge)}</strong></p>
      <p><span>Phụ thu</span><strong>${ctx.money(preview.surcharge)}</strong></p>
      ${preview.tier ? `<p><span>Hạng thành viên (${ctx.E(preview.tier.name)} · ${Number(preview.tier.points || 0).toLocaleString("vi-VN")} điểm)</span><strong>${preview.tier.percent ? `−${preview.tier.percent}%` : "0%"}</strong></p>` : ""}
      ${Number(preview.discount || 0) ? `<p><span>Giảm giá hạng ${ctx.E(preview.tier?.name || "thành viên")}</span><strong>− ${ctx.money(preview.discount)}</strong></p>` : ""}
      ${preview.tier ? `<p><span>Điểm tích lũy dự kiến</span><strong>+${Number(preview.tier.earnedPoints || 0).toLocaleString("vi-VN")} điểm</strong></p>` : preview.canIssueCard && Number(preview.earnedPoints || 0) > 0 ? `<p><span>Thẻ thành viên mới (tự động cấp khi trả phòng)</span><strong>+${Number(preview.earnedPoints || 0).toLocaleString("vi-VN")} điểm</strong></p>` : ""}
      <p><span>Đã đặt cọc</span><strong>− ${ctx.money(preview.deposit)}</strong></p>
      <h3><span>Còn phải thu</span><strong>${ctx.money(preview.due)}</strong></h3>
    </div>
    <div class="readonly-banner" style="align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
      <div><strong>Phụ thu phát sinh / Đền bù</strong><span>Cập nhật tổng phụ thu (trả phòng muộn, minibar/hư hỏng…) trước khi chốt bảng kê.</span></div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input type="number" data-surcharge-amount min="0" max="100000000" step="1000" value="${Number(preview.surcharge || 0)}" aria-label="Tổng tiền phụ thu" style="width:140px">
        <input type="text" data-surcharge-note maxlength="200" placeholder="Lý do phụ thu…" aria-label="Lý do phụ thu" style="width:180px">
        <button type="button" class="small" data-surcharge-apply>Cập nhật phụ thu</button>
      </div>
    </div>
    <form data-checkout-review>
      ${
        requiresPayment
           ? '<fieldset class="payment-options"><legend class="eyebrow">Chọn phương thức thu</legend><label class="payment-option"><input type="radio" name="method" value="CASH" checked><strong>Tiền mặt</strong><small>Xác nhận sau khi đã nhận và đếm đủ tiền.</small></label><label class="payment-option"><input type="radio" name="method" value="TRANSFER"><strong>Ngân hàng / QR SePay</strong><small>Chờ ngân hàng xác nhận, không xác nhận thu thủ công.</small></label><label class="payment-option"><input type="radio" name="method" value="CARD"><strong>Thẻ</strong><small>Xác nhận sau khi giao dịch thẻ đã hoàn tất.</small></label></fieldset>'
          : '<input type="hidden" name="method" value="CASH"><div class="readonly-banner"><strong>Không còn thu</strong><span>Tiền cọc đã bao phủ toàn bộ bảng kê. Vẫn cần xác nhận biên nhận trước khi lập hóa đơn và kết thúc kỳ lưu trú.</span></div>'
      }
      <div class="dialog-actions"><button type="button" data-operation-close>Hủy</button><button class="primary">${requiresPayment ? "Tiếp tục xác nhận thu" : "Tiếp tục xác nhận hoàn tất"}</button></div>
    </form>`;
   body.querySelector("[data-surcharge-apply]")?.addEventListener("click", async (event) => {
     const btn = event.currentTarget;
     const amountInput = body.querySelector("[data-surcharge-amount]");
     const noteInput = body.querySelector("[data-surcharge-note]");
     btn.disabled = true;
     try {
       await ctx.api("/api/action/stay.surcharge", {
         id: stayId,
         amount: Number(amountInput?.value || 0),
         note: noteInput?.value || "",
       });
       const nextPreview = await ctx.api("/api/action/stay.preview", { id: stayId });
       renderPreviewStep(ctx, dialog, nextPreview, stayId);
     } catch (err) {
       ctx.toast(err.message);
       btn.disabled = false;
     }
   });
   body.querySelector("[data-checkout-review]").addEventListener("submit", async (event) => {
     event.preventDefault();
     const method = new FormData(event.currentTarget).get("method") || "CASH";
     if (method === "TRANSFER") {
       const button = event.currentTarget.querySelector("button.primary");
       button.disabled = true;
       const message = document.createElement("p");
       message.setAttribute("role", "alert");
       body.querySelector("[data-transfer-error]")?.remove();
       message.dataset.transferError = "";
       body.append(message);
       try {
         await openPayment(ctx, {
           kind: "SETTLEMENT",
           stayId,
           expectedDue: preview.due,
           fingerprint: preview.fingerprint,
         });
         dialog.close();
       } catch (error) {
         message.textContent = error.message;
         button.disabled = false;
       }
       return;
     }
     renderConfirmationStep(ctx, dialog, preview, stayId, method);
  });
  body.querySelector('input[name="method"]')?.focus();
}

async function finalizeCheckout(ctx, dialog, preview, stayId, method, form) {
  const button = form.querySelector('button[type="submit"]');
  const error = form.querySelector(".dialog-error");
  button.disabled = true;
  error.textContent = "";
  try {
    const values = Object.fromEntries(new FormData(form));
    const result = await ctx.command("stay.checkout", {
      id: stayId,
      expectedDue: preview.due,
      fingerprint: preview.fingerprint,
      method,
      reference: values.reference || "",
      receiptConfirmed: true,
    });
    dialog.querySelector("#checkout-dialog-title").textContent =
      "Đã hoàn tất trả phòng";
    dialog.querySelector("#checkout-dialog-description").textContent =
      "Hóa đơn chỉ được tạo sau xác nhận thu tiền vừa thực hiện.";
    dialog.querySelector("[data-checkout-body]").innerHTML = `<div class="checkout-success"><strong>${ctx.E(result.id || "Đã tạo hóa đơn")}</strong><p>${ctx.E(result.message || "Đã lập hóa đơn và kết thúc kỳ lưu trú.")}</p>${preview.tier ? `<p class="muted">Đã cộng +${Number(preview.tier.earnedPoints || 0).toLocaleString("vi-VN")} điểm vào thẻ ${ctx.E(preview.tier.cardId)} (Hạng ${ctx.E(preview.tier.name)}).</p>` : preview.canIssueCard && Number(preview.earnedPoints || 0) > 0 ? `<p class="muted">Đã tự động mở thẻ thành viên mới cho khách và cộng +${Number(preview.earnedPoints || 0).toLocaleString("vi-VN")} điểm.</p>` : ""}<div class="dialog-actions"><button type="button" data-operation-close>Đóng</button>${result.id ? `<a class="primary" target="_blank" rel="noopener" href="/api/invoice/${encodeURIComponent(result.id)}">Xem hóa đơn</a>` : ""}</div></div>`;
    dialog.querySelector("[data-checkout-body] [data-operation-close]")?.addEventListener("click", () => dialog.close());
  } catch (checkoutError) {
    error.textContent = checkoutError.message;
    button.disabled = false;
  }
}

function renderConfirmationStep(ctx, dialog, preview, stayId, method) {
  const noBalance = Number(preview.due || 0) === 0;
  dialog.querySelector("#checkout-dialog-title").textContent = noBalance
    ? "Xác nhận không còn phải thu"
    : method === "CARD"
      ? "Xác nhận giao dịch thẻ"
      : "Xác nhận nhận tiền mặt";
  dialog.querySelector("#checkout-dialog-description").textContent =
    "Hóa đơn chỉ được tạo sau xác nhận biên nhận ở bước này.";
  const body = dialog.querySelector("[data-checkout-body]");
  const bankCard = `<div class="invoice-detail-grid"><section><h3>Số tiền cần nhận</h3><div class="bill-totals"><h3><span>${method === "CARD" ? "Thẻ" : "Tiền mặt"}</span><strong>${ctx.money(preview.due)}</strong></h3></div></section><section><h3>Kiểm soát</h3><p class="muted">Kiểm tra đã nhận đủ tiền và hoàn tất biên nhận trước khi xác nhận. Không có thao tác hoàn tác hóa đơn trên giao diện.</p></section></div>`;
  body.innerHTML = `${renderCheckoutProgress(2)}${bankCard}
    <form data-checkout-confirm>
      ${
        method === "CARD"
          ? '<label>Mã giao dịch thẻ<input name="reference" maxlength="100" required autocomplete="off"></label>'
          : ""
      }
      <label class="receipt-confirmation"><input type="checkbox" name="receiptConfirmed" value="yes" required><span>${
        noBalance
            ? "Tôi xác nhận bảng kê không còn số tiền phải thu và đồng ý kết thúc kỳ lưu trú."
            : method === "CARD"
              ? `Tôi xác nhận giao dịch thẻ ${ctx.money(preview.due)} đã hoàn tất.`
            : `Tôi xác nhận đã nhận và đếm đủ ${ctx.money(preview.due)} tiền mặt.`
      }</span></label>
      <p class="dialog-error" role="alert"></p>
      <div class="dialog-actions"><button type="button" data-checkout-back>Quay lại bảng kê</button><button type="submit" class="primary">Xác nhận biên nhận & tạo hóa đơn</button></div>
    </form>`;
  body.querySelector("[data-checkout-back]").addEventListener("click", () =>
    renderPreviewStep(ctx, dialog, preview, stayId),
  );
  body.querySelector("[data-checkout-confirm]").addEventListener(
    "submit",
    (event) => {
      event.preventDefault();
      finalizeCheckout(ctx, dialog, preview, stayId, method, event.currentTarget);
    },
  );
  body.querySelector('input[name="reference"], input[name="receiptConfirmed"]')?.focus();
}

async function openCheckout(ctx, stayId) {
  const dialog = createCheckoutDialog(ctx);
  try {
    const preview = await ctx.api("/api/action/stay.preview", { id: stayId });
    if (!dialog.isConnected) return;
    if (Number(preview.due) < 0) {
      dialog.querySelector("#checkout-dialog-title").textContent =
        "Cần xử lý hoàn cọc";
      dialog.querySelector("#checkout-dialog-description").textContent =
        "Tiền cọc đang lớn hơn tổng bảng kê.";
      const body = dialog.querySelector("[data-checkout-body]");
      body.replaceChildren();
      const message = document.createElement("p");
      message.className = "form-message";
      message.textContent =
        "Liên hệ lễ tân để xử lý hoàn cọc. Không thể lập hóa đơn từ màn hình này cho tới khi quy trình hoàn cọc được xử lý.";
      body.append(message);
      return;
    }
    renderPreviewStep(ctx, dialog, preview, stayId);
  } catch (error) {
    if (!dialog.isConnected) return;
    dialog.querySelector("#checkout-dialog-title").textContent =
      "Không thể tải bảng kê";
    const body = dialog.querySelector("[data-checkout-body]");
    body.replaceChildren();
    const message = document.createElement("p");
    message.className = "form-message";
    message.textContent = error.message;
    body.append(message);
  }
}

function updateFilter(event) {
  const control = event.target.closest("[data-invoice-filter]");
  if (!control) return;
  if (event.type === "input" && control.tagName === "SELECT") return;
  if (event.type === "change" && control.type === "search") return;
  invoiceFilters[control.dataset.invoiceFilter] = control.value;
  rerenderInvoices(control.dataset.invoiceFilter === "query");
}

function installHandlers() {
  if (handlersInstalled) return;
  handlersInstalled = true;
  document.addEventListener("input", updateFilter);
  document.addEventListener("change", updateFilter);
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-invoice-detail]");
    if (!trigger || !activeContext) return;
    openInvoiceDetail(activeContext, trigger.dataset.invoiceDetail);
  });
}

export default function createModule(ctx) {
  activeContext = ctx;
  installHandlers();
  return {
    render() {
      return ctx.page === "invoices" ? renderInvoices(ctx) : "";
    },
    async act(action, id) {
      if (action === "stay.checkout") return openCheckout(ctx, id);
    },
  };
}
