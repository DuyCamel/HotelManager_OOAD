/** SePay intents are applied only by the server, never by a browser receipt. */
export function trustedQrUrl(value) {
  try {
    const url = new URL(value);
    return url.origin === "https://vietqr.app" &&
      url.pathname === "/img" && !url.username && !url.password
      ? url.href : null;
  } catch {
    return null;
  }
}

export function defaultDeposit(roomCharge) {
  return Math.max(1, Math.round(Number(roomCharge || 0) * 0.4));
}

export function depositAmount(value, roomCharge) {
  if (typeof value === "string" && !value.trim())
    throw new Error("Tiền cọc phải là số nguyên dương, không vượt quá tiền phòng.");
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > Number(roomCharge))
    throw new Error("Tiền cọc phải là số nguyên dương, không vượt quá tiền phòng.");
  return amount;
}

function paymentDialog(title) {
  const dialog = document.createElement("dialog");
  dialog.className = "operations-dialog sepay-payment-dialog";
  dialog.setAttribute("aria-label", title);
  dialog.innerHTML = `<div class="dialog-head"><h2>${title}</h2><button type="button" class="icon-button" data-operation-close aria-label="Đóng">×</button></div><div data-payment-body></div>`;
  dialog.addEventListener("click", (event) => {
    const closeButton = event.target instanceof Element ? event.target.closest("[data-operation-close]") : null;
    if (event.target === dialog || (closeButton && dialog.contains(closeButton)))
      dialog.close();
  });
  dialog.addEventListener("close", () => dialog.remove(), { once: true });
  document.body.append(dialog);
  dialog.showModal();
  return dialog;
}

export async function openPayment(ctx, request, onApplied = null) {
  const dialog = paymentDialog("Chuyển khoản SePay");
  const body = dialog.querySelector("[data-payment-body]");
  body.textContent = "Đang tạo / tiếp tục yêu cầu thanh toán...";
  let stopped = false;
  let timer;
  let deadline;
  let busy = false;
  let applied = false;
  const stop = () => {
    stopped = true;
    clearTimeout(timer);
    window.removeEventListener("pagehide", stop);
  };
  dialog.addEventListener("close", stop, { once: true });
  window.addEventListener("pagehide", stop);
  let intent;
  const storageKey = `hotel.sepay.${request.kind}.${request.bookingId || request.stayId}`;
  try {
    let previousId;
    // Supplied amounts and settlement previews must be revalidated by the server.
    try {
      if (request.kind === "DEPOSIT" && request.amount === undefined)
        previousId = window.sessionStorage.getItem(storageKey);
    } catch { /* Storage can be disabled. */ }
    if (previousId) {
      try { intent = await ctx.api(`/api/payments/${encodeURIComponent(previousId)}`); }
      catch (error) {
        if (error.status !== 404) throw error;
        try { window.sessionStorage.removeItem(storageKey); } catch { /* Storage can be disabled. */ }
      }
    }
    if (!intent && request.kind === "DEPOSIT" && request.amount === undefined)
      throw new Error("QR cũ không còn. Nhập lại số tiền cọc đã thống nhất để tiếp tục.");
    if (!intent) intent = await ctx.api("/api/action/payments.create", request);
    try { window.sessionStorage.setItem(storageKey, intent.id); } catch { /* Server still deduplicates requests. */ }
  } catch (error) {
    dialog.close();
    if (error.status === 503)
      throw new Error("Chuyển khoản SePay chưa sẵn sàng. Liên hệ lễ tân hoặc chọn tiền mặt; chưa có tiền nào được xác nhận.");
    throw new Error(`${error.message} Nếu đã gửi tiền, không chuyển lần nữa; kiểm tra lại hoặc liên hệ lễ tân.`);
  }
  if (stopped) return;
  const E = window.Hotel.escape;
  const qr = trustedQrUrl(intent.qrUrl);
  body.innerHTML = `<div class="bank-payment-card"><div class="bank-qr-frame">${qr ? `<img src="${E(qr)}" alt="QR chuyển khoản đúng số tiền và mã thanh toán">` : '<p>QR không hợp lệ. Không chuyển tiền; liên hệ lễ tân.</p>'}</div><div class="bank-payment-details"><dl class="operation-detail-list"><dt>Số tiền chính xác</dt><dd>${E(ctx.money(intent.amount))}</dd><dt>Nội dung chuyển khoản</dt><dd>${E(intent.id)}</dd><dt>Ngân hàng</dt><dd>${E(intent.bankId)}</dd><dt>Số tài khoản</dt><dd>${E(intent.accountNo)}</dd><dt>Chủ tài khoản</dt><dd>${E(intent.accountName)}</dd><dt>Hết hạn</dt><dd>${E(ctx.date ? ctx.date(intent.expiresAt) : new Date(intent.expiresAt).toLocaleString("vi-VN"))}</dd></dl></div></div><p data-payment-guide>Chuyển đúng số tiền và nội dung trên. Quét QR hoặc báo đã gửi không xác nhận đã thu tiền. Nếu đã chuyển, không chuyển lần hai và không đổi sang tiền mặt trước khi lễ tân đối soát.</p><p data-payment-status role="status" aria-live="polite"></p><div class="dialog-actions"><button type="button" data-operation-close>Đóng</button><button type="button" data-payment-check>Kiểm tra lại</button><a data-payment-invoice class="primary" target="_blank" rel="noopener" hidden>In hóa đơn</a></div>`;
  const image = body.querySelector("img");
  image?.addEventListener("error", () => {
    image.replaceWith(document.createTextNode("Không tải được QR. Không dùng ảnh QR khác; liên hệ lễ tân."));
  });
  const guide = body.querySelector("[data-payment-guide]");
  const status = body.querySelector("[data-payment-status]");
  const check = body.querySelector("[data-payment-check]");
  const render = async (payment) => {
    if (stopped) return;
    const messages = {
      PENDING: "Đang chờ ngân hàng xác nhận. Chưa ghi nhận tiền.",
      APPLIED: "Cảm ơn quý khách đã hoàn tất thanh toán! Ngân hàng đã xác nhận và hệ thống Aurora đã ghi nhận khoản tiền của quý khách. Hẹn gặp quý khách tại Aurora Hotel!",
      REVIEW: "Khoản chuyển cần kiểm tra / hoàn tiền. Liên hệ lễ tân; không chuyển thêm.",
      EXPIRED: "Yêu cầu đã hết hạn. Không chuyển tiền. Nếu đã gửi, liên hệ lễ tân để kiểm tra / hoàn tiền.",
      CANCELLED: "Yêu cầu đã hủy. Không chuyển tiền. Nếu đã gửi, liên hệ lễ tân để kiểm tra / hoàn tiền.",
    };
    status.textContent = messages[payment.status] || "Trạng thái không xác định. Liên hệ lễ tân; không chuyển thêm.";
    if (payment.status === "REVIEW" && payment.reviewReason)
      status.textContent += ` ${payment.reviewReason}`;
    const pending = payment.status === "PENDING";
    check.hidden = !pending;
    if (!pending) {
      clearTimeout(timer);
      body.querySelector(".bank-payment-card").hidden = true;
      if (guide) guide.hidden = payment.status === "APPLIED";
      if (["EXPIRED", "CANCELLED"].includes(payment.status)) {
        try { window.sessionStorage.removeItem(storageKey); } catch { /* Storage can be disabled. */ }
      }
    }
    if (payment.status === "APPLIED" && !applied) {
      applied = true;
      const headTitle = dialog.querySelector(".dialog-head h2");
      if (headTitle) headTitle.textContent = "Cảm ơn quý khách!";
      if (payment.invoiceId) {
        const link = body.querySelector("[data-payment-invoice]");
        link.href = `/api/invoice/${encodeURIComponent(payment.invoiceId)}`;
        link.hidden = false;
      }
      try { await ctx.refresh(); }
      catch { status.textContent += " Không tải lại được dữ liệu; tải lại workspace để cập nhật."; }
      if (typeof onApplied === "function") {
        try {
          const message = await onApplied(payment);
          if (message) status.textContent += ` ${message}`;
        } catch (error) {
          status.textContent += ` Không xác nhận được bước tiếp theo: ${error.message}`;
        }
      }
    }
    return pending;
  };
  const poll = async () => {
    if (stopped || busy) return;
    busy = true;
    check.disabled = true;
    let pending = true;
    try {
      pending = await render(await ctx.api(`/api/payments/${encodeURIComponent(intent.id)}`));
    } catch (error) {
      if (!stopped) status.textContent = `${error.message} Chưa xác định đã thu tiền; không chuyển lần hai. Kiểm tra lại hoặc liên hệ lễ tân.`;
    } finally {
      busy = false;
      check.disabled = false;
    }
    if (stopped || !pending) return;
    if (Date.now() < deadline) timer = setTimeout(poll, 3000);
    else status.textContent += " Đã dừng tự kiểm tra sau khoảng 60 giây. Không chuyển lần hai. Bấm Kiểm tra lại hoặc liên hệ lễ tân.";
  };
  check.addEventListener("click", () => {
    clearTimeout(timer);
    deadline = Date.now() + 60000;
    poll();
  });
  deadline = Date.now() + 60000;
  if (await render(intent)) poll();
}

export async function openDeposit(ctx, booking) {
  const amount = defaultDeposit(booking?.roomCharge);
  try {
    await openPayment(ctx, { kind: "DEPOSIT", bookingId: booking.id, amount });
  } catch (error) {
    if (typeof ctx.toast === "function") ctx.toast(error.message);
    else alert(error.message);
  }
}
