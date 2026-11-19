/** Fast counter booking and hold-aware booking lists. */
import { depositAmount, openPayment } from "../../core/payments.js";
const ACTIVE_STATUSES = new Set(["PENDING", "CONFIRMED", "CHECKED_IN"]);
const bookingFilters = { query: "", channel: "", status: "", schedule: "" };
let activeContext;
let handlersInstalled = false;
let holdTimer;

const sameId = (left, right) => String(left) === String(right);
const fixedDeposit = (charge) =>
  Math.max(1, Math.round(Number(charge || 0) * 0.4));

function localDate(value = Date.now()) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function customerFor(ctx, booking) {
  return (ctx.d.customers || []).find((customer) =>
    sameId(customer.id, booking.customerId),
  );
}

function roomFor(ctx, booking) {
  return (ctx.d.rooms || []).find((room) => sameId(room.id, booking.roomId));
}

function typeFor(ctx, room) {
  return (ctx.d.types || []).find((type) => sameId(type.id, room?.typeId));
}

function customerLookupValue(customer) {
  return [customer.name, customer.identityNo, customer.phone, customer.id]
    .filter(Boolean)
    .join(" · ");
}

function resolveCustomer(ctx, value) {
  const query = String(value || "").trim().toLocaleLowerCase("vi");
  if (!query) return null;
  const customers = (ctx.d.customers || []).filter((customer) => customer.isActive);
  const exact = customers.find((customer) => {
    const keys = [
      customer.id,
      customer.phone,
      customer.identityNo,
      customerLookupValue(customer),
    ];
    return keys.some(
      (key) => String(key || "").toLocaleLowerCase("vi") === query,
    );
  });
  if (exact) return exact;
  const matches = customers.filter((customer) =>
    customerLookupValue(customer).toLocaleLowerCase("vi").includes(query),
  );
  return matches.length === 1 ? matches[0] : null;
}

function formatCountdown(remaining) {
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function holdDescription(booking, concise = false) {
  const channel = booking.channel === "ONLINE" ? "Online" : "Tại quầy";
  if (booking.status !== "PENDING") return channel;
  if (!booking.holdUntil) return `${channel} · chưa có hạn`;
  const remaining = Date.parse(booking.holdUntil) - Date.now();
  if (!Number.isFinite(remaining)) return `${channel} · hạn không hợp lệ`;
  if (remaining < 0) return "Giữ chỗ đã quá hạn";
  const timer = formatCountdown(remaining);
  return concise ? `⏱ Còn ${timer}` : `${channel} · còn ${timer}`;
}

function isExpiredHold(booking) {
  return (
    booking.status === "PENDING" &&
    booking.holdUntil &&
    Date.parse(booking.holdUntil) < Date.now()
  );
}

function updateHoldLabels() {
  document.querySelectorAll("[data-hold-until]").forEach((element) => {
    const remaining = Date.parse(element.dataset.holdUntil) - Date.now();
    if (!Number.isFinite(remaining)) {
      element.textContent = "Hạn giữ không hợp lệ";
      return;
    }
    if (remaining < 0) {
      element.textContent = "Giữ chỗ đã quá hạn";
      element.classList.add("is-expired");
      const depositButton = element
        .closest("tr")
        ?.querySelector('[data-action="booking.deposit"]');
      if (depositButton) {
        depositButton.disabled = true;
        depositButton.title = "Giữ chỗ đã quá hạn; tải lại dữ liệu trước khi xử lý.";
      }
      return;
    }
    element.textContent = `⏱ Còn ${formatCountdown(remaining)}`;
    element.classList.remove("is-expired");
  });
}

function matchesFilters(ctx, booking) {
  const customer = customerFor(ctx, booking);
  const room = roomFor(ctx, booking);
  const query = bookingFilters.query.trim().toLocaleLowerCase("vi");
  if (query) {
    const value = [
      booking.id,
      booking.status,
      booking.channel,
      customer?.name,
      customer?.phone,
      customer?.identityNo,
      customer?.id,
      room?.name,
      room?.id,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("vi");
    if (!value.includes(query)) return false;
  }
  if (bookingFilters.channel && booking.channel !== bookingFilters.channel)
    return false;
  if (bookingFilters.schedule === "ARRIVING_TODAY" && (!["PENDING", "CONFIRMED"].includes(booking.status) || localDate(booking.startAt) !== localDate())) return false;
  if (bookingFilters.status && booking.status !== bookingFilters.status)
    return false;
  return true;
}

function bookingTime(booking) {
  const value = booking.createdAt || booking.startAt || booking.endAt;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function newestFirst(left, right) {
  return (
    bookingTime(right) - bookingTime(left) ||
    String(right.id || "").localeCompare(String(left.id || ""), "vi", {
      numeric: true,
    })
  );
}

function option(ctx, value, label, selected) {
  return `<option value="${ctx.E(value)}" ${value === selected ? "selected" : ""}>${ctx.E(label)}</option>`;
}


const CODE39_PATTERNS = {
  '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
  '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
  '8': '100100100', '9': '001100100', 'A': '100001001', 'B': '001001001',
  'C': '101001000', 'D': '000011001', 'E': '100011000', 'F': '001011000',
  'G': '000001101', 'H': '100001100', 'I': '001001100', 'J': '000011100',
  'K': '100000011', 'L': '001000011', 'M': '101000010', 'N': '000010011',
  'O': '100010010', 'P': '001010010', 'Q': '000000111', 'R': '100000110',
  'S': '001000110', 'T': '000010110', 'U': '110000001', 'V': '011000001',
  'W': '111000000', 'X': '010010001', 'Y': '110010000', 'Z': '011010000',
  '-': '010000101', '.': '110000100', ' ': '011000100', '*': '010010100',
  '/': '010100010', '+': '010001010', '%': '000101010'
};

function generateBarcodeSvg(rawText, height = 36) {
  const text = '*' + String(rawText || '').toUpperCase().replace(/[^0-9A-Z\-. /+%]/g, '') + '*';
  const narrow = 1.25;
  const wide = 2.75;
  const rects = [];
  let x = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const pattern = CODE39_PATTERNS[ch] || CODE39_PATTERNS['*'];
    for (let j = 0; j < 9; j++) {
      const isBar = (j % 2 === 0);
      const isWide = pattern[j] === '1';
      const width = isWide ? wide : narrow;
      if (isBar) {
        rects.push('<rect x="' + x.toFixed(1) + '" y="0" width="' + width.toFixed(1) + '" height="' + height + '" fill="#173f35" />');
      }
      x += width;
    }
    x += narrow;
  }
  const totalWidth = Math.ceil(x);
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + totalWidth + ' ' + height + '" preserveAspectRatio="none" class="scanned-barcode-svg" role="img" aria-label="Mã vạch: ' + rawText + '">' + rects.join('') + '</svg>';
}

function formatCalendarDate(value) {
  if (!value) return "—";
  const str = String(value).trim();
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m && str.length === 10) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(str);
  if (Number.isNaN(d.valueOf())) return "—";
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).formatToParts(d);
    const p = Object.fromEntries(parts.map((item) => [item.type, item.value]));
    return `${p.day}/${p.month}/${p.year}`;
  } catch {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
}

function calculateNights(startAt, endAt) {
  if (!startAt || !endAt) return 1;
  const s = new Date(String(startAt).length === 10 ? `${startAt}T12:00:00` : startAt);
  const e = new Date(String(endAt).length === 10 ? `${endAt}T12:00:00` : endAt);
  const ms = e.getTime() - s.getTime();
  return (!Number.isNaN(ms) && ms > 0) ? Math.max(1, Math.round(ms / 86400000)) : 1;
}

function playScanBeep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const audioCtx = new AudioCtx();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.12);
  } catch {
    // Audio unallowed
  }
}

function findBookingByCode(ctx, rawCode) {
  const code = String(rawCode || "").trim().toUpperCase();
  if (!code) return null;

  let match = (ctx.d.bookings || []).find((b) => String(b.id || "").toUpperCase() === code);
  if (match) return match;

  const cleanCode = code.replace(/[^A-Z0-9]/g, "");
  match = (ctx.d.bookings || []).find((b) => String(b.id || "").toUpperCase().replace(/[^A-Z0-9]/g, "") === cleanCode);
  if (match) return match;

  const lower = String(rawCode).trim().toLowerCase();
  const matchedCustomer = (ctx.d.customers || []).find((c) =>
    [c.phone, c.identityNo, c.id].filter(Boolean).some((k) => String(k).trim().toLowerCase() === lower)
  );
  if (matchedCustomer) {
    const customerBookings = (ctx.d.bookings || [])
      .filter((b) => sameId(b.customerId, matchedCustomer.id))
      .sort((a, b) => (bookingTime(b) - bookingTime(a)));
    if (customerBookings.length > 0) return customerBookings[0];
  }

  return null;
}

function openBookingScanner(ctx, initialCode = "") {
  let mediaStream = null;
  let scanningActive = false;

  const dialog = document.createElement("dialog");
  dialog.className = "operations-dialog booking-scanner-dialog";
  dialog.setAttribute("aria-label", "Quét mã đặt phòng");

  dialog.innerHTML = `
    <div class="dialog-head">
      <div>
        <span class="eyebrow">LỄ TÂN AURORA</span>
        <h2>Quét mã & Tra cứu đặt phòng</h2>
      </div>
      <button type="button" class="icon-button" data-operation-close aria-label="Đóng">✕</button>
    </div>
    <div class="scanner-dialog-body">
      <!-- Input bar -->
      <div class="scanner-search-bar">
        <div class="scanner-input-field">
          <span class="scanner-icon" aria-hidden="true">🔍</span>
          <input type="text" class="scanner-code-input" placeholder="Quét mã vạch bằng máy quét hoặc nhập mã đặt phòng..." autocomplete="off">
          <button type="button" class="scanner-submit-btn primary">Tra cứu</button>
        </div>
        <button type="button" class="scanner-camera-btn">📹 Quét bằng Camera</button>
      </div>

      <!-- Camera viewport (ẩn mặc định) -->
      <div class="scanner-camera-viewport" hidden style="display: none;">
        <div class="scanner-camera-frame">
          <video class="scanner-video" playsinline muted></video>
          <div class="scanner-laser-line"></div>
          <div class="scanner-corner tl"></div>
          <div class="scanner-corner tr"></div>
          <div class="scanner-corner bl"></div>
          <div class="scanner-corner br"></div>
        </div>
        <p class="scanner-camera-message">Hướng camera vào mã vạch trên phiếu hoặc điện thoại của khách</p>
        <button type="button" class="small scanner-close-camera-btn">✕ Đóng máy ảnh</button>
      </div>

      <!-- Vùng hiển thị kết quả -->
      <div class="scanner-result-area"></div>
    </div>
  `;

  const input = dialog.querySelector(".scanner-code-input");
  const submitBtn = dialog.querySelector(".scanner-submit-btn");
  const cameraBtn = dialog.querySelector(".scanner-camera-btn");
  const cameraViewport = dialog.querySelector(".scanner-camera-viewport");
  const closeCameraBtn = dialog.querySelector(".scanner-close-camera-btn");
  const videoElement = dialog.querySelector(".scanner-video");
  const resultArea = dialog.querySelector(".scanner-result-area");
  const searchBar = dialog.querySelector(".scanner-search-bar");
  const dialogTitle = dialog.querySelector(".dialog-head h2");

  const stopCamera = () => {
    scanningActive = false;
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
    }
    cameraViewport.hidden = true;
    cameraViewport.style.display = "none";
    cameraBtn.style.display = "";
  };

  const startCamera = async () => {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      videoElement.srcObject = mediaStream;
      await videoElement.play();
      cameraViewport.hidden = false;
      cameraViewport.style.display = "flex";
      cameraBtn.style.display = "none";
      scanningActive = true;

      if ("BarcodeDetector" in window) {
        const barcodeDetector = new window.BarcodeDetector({
          formats: ["code_39", "code_128", "qr_code", "ean_13"],
        });
        const scanLoop = async () => {
          if (!scanningActive || videoElement.paused || videoElement.ended) return;
          try {
            const detected = await barcodeDetector.detect(videoElement);
            if (detected.length > 0 && detected[0].rawValue) {
              const code = detected[0].rawValue.trim();
              stopCamera();
              playScanBeep();
              input.value = code;
              displayBookingResult(code);
              return;
            }
          } catch {
            // Next frame
          }
          if (scanningActive) requestAnimationFrame(scanLoop);
        };
        requestAnimationFrame(scanLoop);
      }
    } catch (err) {
      ctx.toast("Không thể truy cập camera. Vui lòng quét bằng máy đọc mã vạch hoặc nhập mã.");
      stopCamera();
    }
  };

  cameraBtn.addEventListener("click", startCamera);
  closeCameraBtn.addEventListener("click", stopCamera);

  const displayBookingResult = (codeQuery) => {
    const booking = findBookingByCode(ctx, codeQuery);
    if (!booking) {
      resultArea.innerHTML = `
        <div class="scanner-not-found">
          <div class="not-found-icon">⚠️</div>
          <strong>Không tìm thấy phiếu đặt phòng</strong>
          <p>Mã "<span>${ctx.E(codeQuery)}</span>" không khớp với dữ liệu trên hệ thống. Vui lòng kiểm tra lại mã hoặc CCCD/SĐT của khách.</p>
          <button type="button" class="small scanner-retry-btn">Nhập lại</button>
        </div>
      `;
      resultArea.querySelector(".scanner-retry-btn")?.addEventListener("click", () => {
        input.value = "";
        input.focus();
        showQuickList();
      });
      return;
    }

    playScanBeep();
    const customer = customerFor(ctx, booking);
    const room = roomFor(ctx, booking);
    const type = typeFor(ctx, room);
    const nights = calculateNights(booking.startAt, booking.endAt);
    const remainingMoney = Math.max(0, Number(booking.roomCharge || 0) - Number(booking.deposit || 0));
    const statusText = {
      PENDING: "Chờ đặt cọc",
      CONFIRMED: "Đã xác nhận cọc",
      CHECKED_IN: "Đang lưu trú",
      COMPLETED: "Đã hoàn tất",
      CANCELLED: "Đã hủy",
    }[booking.status] || booking.status;

    let actionBtnHtml = "";
    if (booking.status === "CONFIRMED") {
      actionBtnHtml = `
        <button type="button" class="accent scanner-action-btn btn-go-checkin" data-id="${booking.id}">🛎️ Làm thủ tục Nhận phòng (Check-in)</button>
        <button type="button" class="danger scanner-action-btn btn-go-cancel" data-id="${booking.id}">✕ Hủy đơn (Không hoàn cọc)</button>
      `;
    } else if (booking.status === "PENDING") {
      actionBtnHtml = `
        <button type="button" class="primary scanner-action-btn btn-go-deposit" data-id="${booking.id}">💵 Thu tiền cọc (${ctx.money(fixedDeposit(booking.roomCharge))})</button>
        <button type="button" class="scanner-action-btn btn-go-cancel" data-id="${booking.id}">Hủy phiếu</button>
      `;
    }

    resultArea.innerHTML = `
      <div class="scanned-booking-card">
        <div class="scanned-card-head">
          <div class="scanned-code-title">
            <span class="scanned-tag">MÃ ĐẶT PHÒNG</span>
            <strong class="scanned-code-num">${booking.id}</strong>
            <span class="channel-pill ${booking.channel === 'ONLINE' ? 'is-online' : ''}">${booking.channel === 'ONLINE' ? 'ONLINE' : 'TẠI QUẦY'}</span>
          </div>
          <span class="badge ${booking.status}">${statusText}</span>
        </div>

        <div class="scanned-barcode-wrap">
          ${generateBarcodeSvg(booking.id, 38)}
          <span class="scanned-barcode-txt">* ${booking.id} *</span>
        </div>

        <div class="scanned-grid-details">
          <!-- Cột 1: Thông tin khách -->
          <div class="scanned-detail-box">
            <h4>THÔNG TIN KHÁCH HÀNG</h4>
            <div class="scanned-row-item"><span class="lbl">Họ tên:</span><strong>${ctx.E(customer?.name || "Chưa có dữ liệu khách")}</strong></div>
            <div class="scanned-row-item"><span class="lbl">CCCD / Hộ chiếu:</span><span>${ctx.E(customer?.identityNo || "—")}</span></div>
            <div class="scanned-row-item"><span class="lbl">Điện thoại:</span><span>${ctx.E(customer?.phone || "—")}</span></div>
            <div class="scanned-row-item"><span class="lbl">Địa chỉ:</span><span>${ctx.E(customer?.address || "—")}</span></div>
          </div>

          <!-- Cột 2: Phòng & Thời gian -->
          <div class="scanned-detail-box">
            <h4>PHÒNG & THỜI GIAN LƯU TRÚ</h4>
            <div class="scanned-row-item"><span class="lbl">Phòng xếp:</span><strong>${ctx.E(room?.name || booking.roomId || "Chưa gán")}</strong> (${ctx.E(type?.name || "Tiêu chuẩn")} · Tầng ${room?.floor || 1})</div>
            <div class="scanned-row-item"><span class="lbl">Nhận phòng:</span><span>${formatCalendarDate(booking.startAt)} (từ ${ctx.d.settings?.[0]?.checkInTime || "14:00"})</span></div>
            <div class="scanned-row-item"><span class="lbl">Trả phòng:</span><span>${formatCalendarDate(booking.endAt)} (trước ${ctx.d.settings?.[0]?.checkOutTime || "12:00"})</span></div>
            <div class="scanned-row-item"><span class="lbl">Quy mô:</span><span>${nights} đêm · ${booking.guests || 1} khách</span></div>
          </div>

          <!-- Hàng 3: Tài chính -->
          <div class="scanned-detail-box full-width">
            <h4>CHI TIẾT TÀI CHÍNH</h4>
            <div class="scanned-financial-grid">
              <div class="fin-cell"><span>Tổng tiền phòng:</span><strong>${ctx.money(booking.roomCharge)}</strong></div>
              <div class="fin-cell is-deposit"><span>Tiền cọc ghi nhận:</span><strong class="text-success">✓ ${ctx.money(booking.deposit)}</strong></div>
              <div class="fin-cell is-remaining"><span>Còn lại thu tại quầy:</span><strong class="text-highlight">${ctx.money(remainingMoney)}</strong></div>
            </div>
          </div>
        </div>

        <div class="scanned-card-actions">
          <button type="button" class="scanner-action-btn btn-print-voucher">🖨️ In phiếu xác nhận</button>
          <button type="button" class="scanner-action-btn btn-rescan">🔍 Quét mã khác</button>
          ${actionBtnHtml}
        </div>
      </div>
    `;

    resultArea.querySelector(".btn-rescan")?.addEventListener("click", () => {
      searchBar.style.display = "";
      dialogTitle.textContent = "Quét mã & Tra cứu đặt phòng";
      input.value = "";
      input.focus();
      showQuickList();
    });

    resultArea.querySelector(".btn-print-voucher")?.addEventListener("click", () => {
      window.print();
    });

    resultArea.querySelector(".btn-go-checkin")?.addEventListener("click", () => {
      stopCamera();
      dialog.close();
      if (typeof ctx.act === "function") {
        ctx.act("stay.checkin", booking.id);
      } else {
        const dummy = document.createElement("button");
        dummy.dataset.action = "stay.checkin";
        dummy.dataset.id = booking.id;
        document.body.append(dummy);
        dummy.click();
        dummy.remove();
      }
    });

    resultArea.querySelector(".btn-go-deposit")?.addEventListener("click", () => {
      stopCamera();
      dialog.close();
      if (typeof ctx.act === "function") {
        ctx.act("booking.deposit", booking.id);
      } else {
        const dummy = document.createElement("button");
        dummy.dataset.action = "booking.deposit";
        dummy.dataset.id = booking.id;
        document.body.append(dummy);
        dummy.click();
        dummy.remove();
      }
    });

    resultArea.querySelector(".btn-go-cancel")?.addEventListener("click", () => {
      stopCamera();
      dialog.close();
      if (typeof ctx.act === "function") {
        ctx.act("booking.cancel", booking.id);
      }
    });
  };

  const showQuickList = () => {
    const arrivingToday = (ctx.d.bookings || []).filter(
      (b) => ["CONFIRMED", "PENDING"].includes(b.status) && localDate(b.startAt) === localDate()
    );
    const recent = (ctx.d.bookings || [])
      .filter((b) => ["CONFIRMED", "PENDING", "CHECKED_IN"].includes(b.status))
      .sort((a, b) => bookingTime(b) - bookingTime(a))
      .slice(0, 5);

    const targetList = arrivingToday.length ? arrivingToday : recent;
    const titleText = arrivingToday.length ? "Khách có lịch nhận phòng hôm nay:" : "Phiếu đặt phòng đang xử lý gần đây:";

    resultArea.innerHTML = `
      <div class="scanner-quick-wrap">
        <p class="scanner-quick-heading">${titleText}</p>
        <div class="scanner-quick-cards">
          ${targetList.map((b) => {
            const c = customerFor(ctx, b);
            const r = roomFor(ctx, b);
            return `
              <div class="scanner-quick-item" data-code="${b.id}">
                <div class="quick-item-main">
                  <strong>${b.id}</strong>
                  <span>${ctx.E(c?.name || "Khách")} · ${ctx.E(r?.name || b.roomId || "Phòng")}</span>
                  <small>${formatCalendarDate(b.startAt)} → ${formatCalendarDate(b.endAt)}</small>
                </div>
                <span class="badge ${b.status}">${b.status}</span>
              </div>
            `;
          }).join("") || '<p class="empty">Không có phiếu gần đây.</p>'}
        </div>
      </div>
    `;

    resultArea.querySelectorAll(".scanner-quick-item").forEach((item) => {
      item.addEventListener("click", () => {
        const code = item.dataset.code;
        input.value = code;
        displayBookingResult(code);
      });
    });
  };

  submitBtn.addEventListener("click", () => {
    if (input.value.trim()) displayBookingResult(input.value.trim());
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (input.value.trim()) displayBookingResult(input.value.trim());
    }
  });

  dialog.addEventListener("click", (event) => {
    const closeBtn = event.target.closest("[data-operation-close]");
    if (event.target === dialog || (closeBtn && dialog.contains(closeBtn))) {
      stopCamera();
      dialog.close();
    }
  });

  dialog.addEventListener("close", () => {
    stopCamera();
    dialog.remove();
  }, { once: true });

  document.body.append(dialog);
  dialog.showModal();

  if (initialCode) {
    dialogTitle.textContent = "Phiếu xác nhận đặt phòng";
    searchBar.style.display = "none";
    input.value = initialCode;
    displayBookingResult(initialCode);
  } else {
    dialogTitle.textContent = "Quét mã & Tra cứu đặt phòng";
    searchBar.style.display = "";
    showQuickList();
    setTimeout(() => input.focus(), 100);
  }

  return dialog;
}

function renderFilters(ctx) {
  const statuses = [
    ["PENDING", "Chờ cọc"],
    ["CONFIRMED", "Đã cọc"],
    ["CHECKED_IN", "Đang lưu trú"],
    ["COMPLETED", "Hoàn tất"],
    ["CANCELLED", "Đã hủy"],
  ];
  return `<div class="operation-toolbar booking-filter-toolbar" aria-label="Bộ lọc đặt phòng">
    <label class="operation-filter operation-filter-wide">Khách, CCCD, phòng hoặc mã phiếu
      <div class="booking-search-input-wrap">
        <input type="search" data-booking-filter="query" value="${ctx.E(bookingFilters.query)}" placeholder="Tìm nhanh theo khách, CCCD, phòng, mã phiếu…" autocomplete="off">
        ${ctx.role !== "CUSTOMER" ? `<button type="button" class="btn-search-scan-icon" data-action="booking.scan" title="Quét mã vạch hoặc camera">📷</button>` : ""}
      </div>
    </label>
    <label class="operation-filter">Kênh đặt
      <select data-booking-filter="channel">
        <option value="">Tất cả</option>
        ${option(ctx, "COUNTER", "Tại quầy", bookingFilters.channel)}
        ${option(ctx, "ONLINE", "Online", bookingFilters.channel)}
      </select>
    </label>
    <label class="operation-filter">Trạng thái
      <select data-booking-filter="status"><option value="">Tất cả</option>${statuses
        .map(([value, label]) => option(ctx, value, label, bookingFilters.status))
        .join("")}</select>
    </label>
    <label class="operation-filter">Lịch đón khách
      <select data-booking-filter="schedule"><option value="">Tất cả</option>${option(ctx, "ARRIVING_TODAY", "Khách đến hôm nay", bookingFilters.schedule)}</select>
    </label>
  </div>`;
}

function bookingActions(ctx, booking) {
  const actions = [];
  const expired = isExpiredHold(booking);
  if (ctx.role !== "CUSTOMER") {
    actions.push(ctx.btn("Xem phiếu", "booking.scan", booking.id, ""));
  }
  if (booking.status === "PENDING") {
    actions.push(ctx.btn("Hủy", "booking.cancel", booking.id));
    if (ctx.role !== "CUSTOMER" && !expired)
      actions.push(
        ctx.btn("Xác nhận cọc", "booking.deposit", booking.id, "primary"),
      );
  }
  if (booking.status === "CONFIRMED" && ctx.role !== "CUSTOMER") {
    actions.push(ctx.btn("Nhận phòng", "stay.checkin", booking.id, "accent"));
    actions.push(ctx.btn("Hủy (Không hoàn cọc)", "booking.cancel", booking.id, "danger"));
  }
  return actions.join("");
}

function bookingRow(ctx, booking) {
  const customer = customerFor(ctx, booking);
  const room = roomFor(ctx, booking);
  const type = typeFor(ctx, room);
  const expired = isExpiredHold(booking);
  const hold =
    booking.status === "PENDING" && booking.holdUntil
      ? `<span class="hold-state${expired ? " is-expired" : ""}" data-hold-until="${ctx.E(booking.holdUntil || "")}">${ctx.E(holdDescription(booking, true))}</span>`
      : "";
  return `<tr data-new="${ACTIVE_STATUSES.has(booking.status)}">
    <td class="record-cell"><strong>${ctx.E(booking.id)}</strong><small>${ctx.date(booking.createdAt || booking.startAt)}</small></td>
    <td class="customer-cell"><strong>${ctx.E(customer?.name || "Chưa có dữ liệu khách")}</strong><small>${ctx.E(customer?.identityNo || customer?.phone || customer?.id || "—")}</small></td>
    <td><strong>${ctx.E(room?.name || booking.roomId || "—")}</strong><small>${ctx.E(type?.name || "Chưa có loại")}</small></td>
    <td>${ctx.date(booking.startAt)}<small>→ ${ctx.date(booking.endAt)} · ${Number(booking.guests || 0)} khách</small></td>
    <td class="amount">${ctx.money(booking.roomCharge)}<small>${
      booking.status === "PENDING" && Number(booking.deposit || 0) === 0
        ? `Cần cọc 40%: ${ctx.money(fixedDeposit(booking.roomCharge))}`
        : booking.status === "CANCELLED" && Number(booking.deposit || 0) > 0
          ? `Giữ cọc (no-show): ${ctx.money(booking.deposit)}`
          : booking.status === "CANCELLED"
            ? `Đã hoàn cọc / không giữ`
            : `Đã cọc ${ctx.money(booking.deposit)}`
    }</small></td>
    <td><span class="channel-pill${booking.channel === "ONLINE" ? " is-online" : ""}">${booking.channel === "ONLINE" ? "ONLINE" : "TẠI QUẦY"}</span>${hold}</td>
    <td>${ctx.badge(booking.status)}</td>
    <td class="operation-actions">${bookingActions(ctx, booking)}</td>
  </tr>`;
}

function bookingTable(ctx, rows, emptyMessage) {
  return `<div class="operation-table-wrap"><table class="operation-table"><thead><tr>
    <th>Mã / Tạo lúc</th><th>Khách hàng / CCCD</th><th>Phòng</th><th>Kỳ lưu trú</th><th>Tiền phòng</th><th>Kênh / Giữ chỗ</th><th>Trạng thái</th><th>Thao tác</th>
  </tr></thead><tbody>${
    rows.map((booking) => bookingRow(ctx, booking)).join("") ||
    `<tr><td colspan="8" class="empty">${ctx.E(emptyMessage)}</td></tr>`
  }</tbody></table></div>`;
}

function renderBookings(ctx, source = ctx.d.bookings || []) {
  const filtered = source.filter((booking) => matchesFilters(ctx, booking));
  const active = filtered
    .filter((booking) => ACTIVE_STATUSES.has(booking.status))
    .sort(newestFirst);
  const history = filtered
    .filter((booking) => !ACTIVE_STATUSES.has(booking.status))
    .sort(newestFirst);
  return `${renderFilters(ctx)}
    <section class="operation-section">
      <header class="operation-section-head"><div><h2>Đang xử lý</h2><p>Phiếu mới nhất ở trên; giữ chỗ online hiển thị hạn còn lại.</p></div><span class="readonly-pill">${active.length} phiếu hoạt động</span></header>
      ${bookingTable(ctx, active, "Không có đặt phòng đang hoạt động phù hợp.")}
    </section>
    <section class="operation-section">
      <header class="operation-section-head"><div><h2>Đã hoàn tất / hủy</h2><p>Tách khỏi hàng đợi vận hành để tra cứu nhanh.</p></div><span class="readonly-pill">${history.length} phiếu lịch sử</span></header>
      ${bookingTable(ctx, history, "Không có phiếu lịch sử phù hợp.")}
    </section>`;
}

function rerenderBookings(focusSearch = false) {
  if (!activeContext || !["bookings", "mybookings"].includes(activeContext.page))
    return;
  const target = document.querySelector("#page-content");
  if (!target) return;
  target.innerHTML = renderBookings(activeContext);
  updateHoldLabels();
  if (focusSearch) {
    const input = target.querySelector('[data-booking-filter="query"]');
    input?.focus();
    input?.setSelectionRange?.(input.value.length, input.value.length);
  }
}

function updateFilter(event) {
  const control = event.target.closest("[data-booking-filter]");
  if (!control) return;
  if (event.type === "input" && control.tagName === "SELECT") return;
  if (event.type === "change" && control.type === "search") return;
  bookingFilters[control.dataset.bookingFilter] = control.value;
  rerenderBookings(control.dataset.bookingFilter === "query");
}

function installHandlers() {
  if (handlersInstalled) return;
  handlersInstalled = true;
  document.addEventListener("input", updateFilter);
  document.addEventListener("change", updateFilter);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.matches?.('[data-booking-filter="query"]')) {
      const q = e.target.value.trim();
      if (q && activeContext && activeContext.role !== "CUSTOMER") {
        const found = findBookingByCode(activeContext, q);
        if (found) {
          e.preventDefault();
          openBookingScanner(activeContext, found.id);
        }
      }
    }
  });
  holdTimer = window.setInterval(updateHoldLabels, 1000);
  window.addEventListener("pagehide", () => window.clearInterval(holdTimer), {
    once: true,
  });
}

function updateLookupMessage(ctx, input, output) {
  const customer = resolveCustomer(ctx, input.value);
  output.classList.toggle("is-error", Boolean(input.value && !customer));
  output.textContent = customer
    ? `Đã chọn: ${customer.name} · CCCD ${customer.identityNo || "chưa có"} · ${customer.phone || "chưa có SĐT"}`
    : input.value
      ? "Nhập chính xác hơn hoặc chọn một kết quả trong danh sách."
      : "Có thể tìm bằng họ tên, số điện thoại, mã khách hoặc CCCD.";
}

function roomOptions(ctx, selectedId) {
  return (ctx.d.rooms || [])
    .filter((room) => !["MAINTENANCE", "DISABLED"].includes(room.status))
    .map((room) => {
      const type = typeFor(ctx, room);
      return [
        room.id,
        `${room.name || room.id} · ${type?.name || "Chưa có loại"}`,
        sameId(room.id, selectedId),
      ];
    });
}

function installCounterBookingEnhancements(ctx, selectedRoomId) {
  const form = document.querySelector("#editor-form");
  const lookup = form?.elements.customerLookup;
  const roomSelect = form?.elements.roomId;
  const startInput = form?.elements.startAt;
  const endInput = form?.elements.endAt;
  const guestsInput = form?.elements.guests;
  const depositInput = form?.elements.deposit;
  if (!lookup || !roomSelect) return;

  lookup.setAttribute("list", "counter-customer-options");
  lookup.setAttribute("autocomplete", "off");
  lookup.setAttribute("aria-describedby", "counter-customer-match");
  const dataList = document.createElement("datalist");
  dataList.id = "counter-customer-options";
  for (const customer of (ctx.d.customers || []).filter(
    (item) => item.isActive,
  )) {
    const optionElement = document.createElement("option");
    optionElement.value = customerLookupValue(customer);
    dataList.append(optionElement);
  }
  const lookupMessage = document.createElement("p");
  lookupMessage.id = "counter-customer-match";
  lookupMessage.className = "lookup-match";
  lookupMessage.setAttribute("role", "status");
  const availabilityMessage = document.createElement("p");
  availabilityMessage.className = "availability-status";
  availabilityMessage.setAttribute("role", "status");
  document.querySelector("#dialog-fields")?.append(dataList, lookupMessage);
  roomSelect.closest("label")?.after(availabilityMessage);
  updateLookupMessage(ctx, lookup, lookupMessage);
  lookup.addEventListener("input", () =>
    updateLookupMessage(ctx, lookup, lookupMessage),
  );

  const newCustomer = document.createElement("section");
  newCustomer.className = "panel";
  newCustomer.style.gridColumn = "1 / -1";
  newCustomer.id = "counter-new-customer";
  newCustomer.hidden = true;
  newCustomer.setAttribute("aria-label", "Hồ sơ khách mới");
  const toggleCustomer = document.createElement("button");
  toggleCustomer.type = "button";
  toggleCustomer.textContent = "Thêm khách mới";
  toggleCustomer.setAttribute("aria-controls", newCustomer.id);
  const customerInputs = {};
  for (const [key, title, type, maxLength, required] of [
    ["name", "Họ tên", "text", 120, true],
    ["phone", "Điện thoại", "tel", 10, true],
    ["identityNo", "CCCD / Hộ chiếu (không bắt buộc)", "text", 30, false],
    ["address", "Địa chỉ (không bắt buộc)", "textarea", 512, false],
  ]) {
    const label = document.createElement("label");
    label.textContent = title;
    const input = document.createElement(type === "textarea" ? "textarea" : "input");
    if (type !== "textarea") input.type = type;
    input.maxLength = maxLength;
    input.required = required;
    input.disabled = true;
    input.autocomplete = { name: "name", phone: "tel", address: "street-address" }[key] || "off";
    if (key === "phone") {
      input.pattern = "0[0-9]{9}";
      input.title = "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0";
      input.placeholder = "0xxxxxxxxx";
    }
    customerInputs[key] = input;
    label.append(input);
    newCustomer.append(label);
  }
  const customerStatus = document.createElement("p");
  customerStatus.className = "lookup-match";
  customerStatus.setAttribute("role", "status");
  const saveCustomer = document.createElement("button");
  saveCustomer.type = "button";
  saveCustomer.className = "accent";
  saveCustomer.textContent = "Lưu và chọn khách";
  const cancelCustomer = document.createElement("button");
  cancelCustomer.type = "button";
  cancelCustomer.textContent = "Hủy thêm khách";
  newCustomer.append(customerStatus, saveCustomer, cancelCustomer);
  lookup.closest("label").after(toggleCustomer, newCustomer);
  const bookingSubmit = form.querySelector(".primary");
  const showCustomer = (show) => {
    newCustomer.hidden = !show;
    newCustomer.style.display = show ? "" : "none";
    toggleCustomer.hidden = show;
    toggleCustomer.style.display = show ? "none" : "";
    toggleCustomer.setAttribute("aria-expanded", String(show));
    lookup.disabled = show;
    bookingSubmit.disabled = show;
    for (const input of Object.values(customerInputs)) input.disabled = !show;
    if (show) {
      customerStatus.textContent = "Chỉ tạo hồ sơ khách, không tạo tài khoản hoặc thẻ thành viên.";
      customerStatus.classList.remove("is-error");
      customerInputs.name.focus();
    } else lookup.focus();
  };
  showCustomer(false);
  toggleCustomer.addEventListener("click", () => showCustomer(true));
  cancelCustomer.addEventListener("click", () => showCustomer(false));
  saveCustomer.addEventListener("click", async () => {
    if (saveCustomer.disabled) return;
    for (const input of Object.values(customerInputs))
      if (!input.reportValidity()) return;
    saveCustomer.disabled = cancelCustomer.disabled = true;
    for (const input of Object.values(customerInputs)) input.disabled = true;
    customerStatus.classList.remove("is-error");
    customerStatus.textContent = "Đang lưu hồ sơ khách…";
    try {
      const customer = await ctx.api("/api/action/customer.save", Object.fromEntries(
        Object.entries(customerInputs).map(([key, input]) => [key, input.value.trim()]),
      ));
      // Refresh replaces workspace data, not this open editor's context.
      ctx.d.customers = [...(ctx.d.customers || []).filter((item) => !sameId(item.id, customer.id)), customer];
      try {
        await ctx.refresh();
      } catch (error) {
        ctx.toast(`Đã lưu khách. Chưa tải lại được danh sách: ${error.message}`);
      }
      const customerOption = document.createElement("option");
      customerOption.value = customerLookupValue(customer);
      dataList.append(customerOption);
      lookup.value = customerOption.value;
      updateLookupMessage(ctx, lookup, lookupMessage);
      showCustomer(false);
      for (const input of Object.values(customerInputs)) input.value = "";
    } catch (error) {
      customerStatus.classList.add("is-error");
      customerStatus.textContent = `Chưa lưu được khách: ${error.message}`;
      for (const input of Object.values(customerInputs)) input.disabled = false;
    } finally {
      saveCustomer.disabled = cancelCustomer.disabled = false;
    }
  });

  const minimum = localDate();
  startInput.min = minimum;
  endInput.min = minimum;
  guestsInput.min = "1";
  guestsInput.max = "20";
  depositInput.min = "1";
  depositInput.readOnly = true;
  startInput.addEventListener("change", () => {
    endInput.min = startInput.value || minimum;
  });
  let requestNumber = 0;
  const updateQuote = () => {
    const optionElement = roomSelect.selectedOptions[0];
    const quote = Number(optionElement?.dataset.quote);
    if (Number.isFinite(quote) && quote > 0) {
      const requiredDeposit = fixedDeposit(quote);
      depositInput.max = String(quote);
      depositInput.value = String(requiredDeposit);
      availabilityMessage.textContent = `Giá phòng được server chốt: ${ctx.money(quote)} · Tiền cọc cố định (40%): ${ctx.money(requiredDeposit)}.`;
    }
  };
  const updateAvailability = async () => {
    if (!startInput.value || !endInput.value || !guestsInput.value) return;
    const currentRequest = ++requestNumber;
    availabilityMessage.classList.remove("is-error");
    availabilityMessage.textContent = "Đang kiểm tra lịch phòng và giá…";
    try {
      const rows = await ctx.api(
        "/api/availability?" +
          new URLSearchParams({
            startAt: startInput.value,
            endAt: endInput.value,
            guests: guestsInput.value,
          }),
      );
      if (currentRequest !== requestNumber) return;
      const previous = roomSelect.value || selectedRoomId;
      roomSelect.replaceChildren();
      if (!rows.length) {
        const empty = document.createElement("option");
        empty.value = "";
        empty.textContent = "Không có phòng phù hợp";
        roomSelect.append(empty);
        availabilityMessage.textContent =
          "Không có phòng trống cho ngày và số khách đã chọn.";
        availabilityMessage.classList.add("is-error");
        return;
      }
      for (const row of rows) {
        const optionElement = document.createElement("option");
        optionElement.value = row.id;
        optionElement.textContent = `${row.name || row.id} · ${row.type?.name || "Chưa có loại"} · ${ctx.money(row.quote)}`;
        optionElement.dataset.quote = String(row.quote ?? "");
        optionElement.selected = sameId(row.id, previous);
        roomSelect.append(optionElement);
      }
      if (!roomSelect.value) roomSelect.selectedIndex = 0;
      updateQuote();
    } catch (error) {
      if (currentRequest !== requestNumber) return;
      availabilityMessage.classList.add("is-error");
      availabilityMessage.textContent = `${error.message} Danh sách ban đầu vẫn được giữ; server sẽ kiểm tra lại khi tạo phiếu.`;
    }
  };
  for (const control of [startInput, endInput, guestsInput])
    control.addEventListener("change", updateAvailability);
  roomSelect.addEventListener("change", updateQuote);
  form.refreshRoomAvailability = updateAvailability;
  updateAvailability();
}

function openCounterBooking(ctx, selectedRoomId) {
  const policy = ctx.d.settings?.[0] || {};
  const today = localDate();
  const tomorrow = localDate(Date.now() + 86400000);
  const initialRoom =
    roomFor(ctx, { roomId: selectedRoomId }) ||
    (ctx.d.rooms || []).find(
      (room) => !["MAINTENANCE", "DISABLED"].includes(room.status),
    );
  const initialType = typeFor(ctx, initialRoom);
  const initialDeposit = fixedDeposit(initialType?.nightlyPrice || 350000);
  ctx.form(
    "Đặt phòng tại quầy",
    [
      ctx.field(
        "customerLookup",
        "Tìm khách bằng tên / SĐT / CCCD",
        "text",
      ),
      ctx.field(
        "roomId",
        "Phòng khả dụng",
        "select",
        selectedRoomId || "",
        roomOptions(ctx, selectedRoomId).map(([value, label]) => [value, label]),
      ),
      ctx.field("startAt", "Ngày nhận phòng", "date", today),
      ctx.field("endAt", `Ngày trả phòng (${policy.checkOutTime || "12:00"})`, "date", tomorrow),
      ctx.field("guests", "Số khách", "number", 1),
      ctx.field(
        "deposit",
        "Tiền cọc cố định (40% tiền phòng)",
        "number",
        initialDeposit,
      ),
      ctx.field("method", "Phương thức đặt cọc", "select", "CASH", [
        ["CASH", "Tiền mặt"],
        ["TRANSFER", "Chuyển khoản (SePay)"],
      ]),
      ctx.field(
        "receiptConfirmed",
        "Tôi xác nhận đã nhận và đếm tiền cọc",
        "checkbox",
        "yes",
      ),
      {
        ...ctx.field(
          "checkInNow",
          "Nhận phòng ngay sau khi xác nhận cọc",
          "checkbox",
          "yes",
        ),
        optional: true,
      },
    ],
    async (body) => {
      const customer = resolveCustomer(ctx, body.customerLookup);
      if (!customer)
        throw new Error(
          "Không xác định được khách. Chọn đúng một kết quả theo tên, SĐT hoặc CCCD.",
        );
      if (!body.roomId) throw new Error("Không có phòng khả dụng để tạo phiếu.");
      const checkInNow = body.checkInNow === "yes";
      const identityNo = String(customer.identityNo || "").trim();
      if (checkInNow && body.startAt !== today)
        throw new Error("Nhận phòng ngay chỉ áp dụng cho phiếu nhận trong hôm nay.");
      if (checkInNow && !identityNo)
        throw new Error("Hồ sơ khách chưa có CCCD / Hộ chiếu. Bổ sung trong hồ sơ khách trước khi nhận phòng ngay.");
      if (checkInNow && body.method === "CASH" && body.receiptConfirmed !== "yes")
        throw new Error("Phải xác nhận đã nhận tiền cọc trước khi nhận phòng ngay.");
      let booking;
      try {
        booking = await ctx.command("booking.create", {
          customerId: customer.id,
          roomId: body.roomId,
          startAt: body.startAt,
          endAt: body.endAt,
          guests: body.guests,
          deposit: body.deposit || initialDeposit,
          method: body.method,
          receiptConfirmed: body.method === "CASH" && body.receiptConfirmed === "yes",
        });
      } catch (error) {
        if (
          error.status === 409 ||
          /vừa được giữ|không khả dụng/i.test(error.message || "")
        ) {
          document.querySelector("#editor-form")?.refreshRoomAvailability?.();
        }
        throw error;
      }
      const receiveGuest = async () => {
        try {
          await ctx.api("/api/action/stay.checkin", { id: booking.id, identityNo });
        } catch (error) {
          return `Phiếu ${booking.id} đã ghi nhận cọc nhưng chưa xác nhận được kết quả nhận phòng: ${error.message} Kiểm tra phiếu trước khi thao tác lại; không chuyển thêm tiền.`;
        }
        try { await ctx.refresh(); }
        catch { return `Phiếu ${booking.id} đã nhận phòng. Tải lại trang để cập nhật danh sách.`; }
        return `Phiếu ${booking.id} đã nhận phòng.`;
      };
      if (checkInNow && body.method === "CASH") ctx.toast(await receiveGuest());
      if (body.method === "TRANSFER") {
        document.querySelector("#editor").close();
        try {
          await openPayment(ctx, {
            kind: "DEPOSIT", bookingId: booking.id,
            amount: depositAmount(
              body.deposit || fixedDeposit(booking.roomCharge),
              booking.roomCharge,
            ),
          }, checkInNow ? receiveGuest : undefined);
        } catch (error) {
          ctx.toast(`Phiếu ${booking.id} đã giữ chỗ, chưa nhận cọc. ${error.message}`);
        }
      }
    },
    "Tạo phiếu và nhận cọc tiền mặt",
    `Tiền cọc mặc định bằng 40% tiền phòng. Giữ phòng tối đa ${policy.bookingHoldMinutes || 10} phút. Tiền mặt: xác nhận đã nhận cọc. Chuyển khoản: chờ QR SePay xác nhận. Tích Nhận phòng ngay để tự nhận phòng sau khi cọc được xác nhận, không cần chuyển tab. Phiếu đặt trong ngày vẫn áp dụng giờ giới hạn ${policy.noShowTime || "22:00"}.`,
  );
  installCounterBookingEnhancements(ctx, selectedRoomId);
  const form = document.querySelector("#editor-form");
  const immediate = form.elements.checkInNow;
  const updateMethod = () => {
    const checkInNow = immediate.checked;
    const transfer = form.elements.method.value === "TRANSFER";
    const receipt = form.elements.receiptConfirmed;
    receipt.closest("label").dataset.sepayManual = "";
    receipt.closest("label").hidden = transfer;
    receipt.required = !transfer;
    receipt.disabled = transfer;
    form.querySelector(".primary").textContent = checkInNow
      ? transfer
        ? "Tạo phiếu, mở QR và nhận phòng sau khi cọc"
        : "Tạo phiếu và nhận phòng ngay"
      : transfer
        ? "Tạo phiếu và mở QR chuyển khoản"
        : "Tạo phiếu và nhận cọc tiền mặt";
  };
  form.elements.method.addEventListener("change", updateMethod);
  immediate.addEventListener("change", updateMethod);
  updateMethod();
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
      if (ctx.role === "CUSTOMER" && ["mybookings", "search"].includes(ctx.page)) {
        return "";
      }
      if (["bookings", "mybookings"].includes(ctx.page)) {
        queueMicrotask(updateHoldLabels);
        return renderBookings(ctx);
      }
      if (ctx.page === "search")
        return `<div class="panel"><form id="search-form" class="search-form"><label>Ngày nhận phòng<input name="startAt" type="date" lang="vi-VN" required></label><label>Ngày trả phòng (${ctx.d.settings?.[0]?.checkOutTime || "12:00"})<input name="endAt" type="date" lang="vi-VN" required></label><label>Số khách<input name="guests" type="number" min="1" max="20" value="2" required></label><button class="primary">Tìm phòng ↗</button></form></div><div id="available-results" class="search-cards"></div>`;
      return "";
    },
    async act(action, id) {
      if (action === "booking.scan" || action === "booking.detail") {
        return openBookingScanner(ctx, id);
      }
      if (action === "booking.cancel") {
        const booking = (ctx.d.bookings || []).find((b) => sameId(b.id, id));
        if (!booking) return ctx.toast("Không còn dữ liệu đặt phòng này.");
        const hasDeposit = Number(booking.deposit || 0) > 0;
        const title = hasDeposit ? "Hủy đặt phòng (Không hoàn cọc)" : "Hủy giữ chỗ";
        const message = hasDeposit
          ? `Xác nhận hủy đặt phòng ${booking.id} do khách không đến (No-show) hoặc quá hạn? Tiền cọc ${ctx.money(booking.deposit)} sẽ KHÔNG được hoàn lại theo quy định.`
          : `Xác nhận hủy phiếu giữ chỗ ${booking.id} và nhả phòng cho khách khác?`;

        return ctx.actionForm(
          title,
          [ctx.field("id", "", "hidden", id)],
          action,
          message,
        );
      }
      if (action === "booking.new") return openCounterBooking(ctx, id);
      if (action === "booking.deposit") {
        const booking = (ctx.d.bookings || []).find((item) => sameId(item.id, id));
        if (!booking) return ctx.toast("Không còn dữ liệu đặt phòng này.");
        const requiredDeposit = fixedDeposit(booking.roomCharge);
        const reference = ctx.field(
          "reference",
          "Mã tham chiếu (nếu chuyển khoản / thẻ)",
          "text",
          "",
        );
        reference.optional = true;
        ctx.form(
          "Thu tiền cọc (40% tiền phòng)",
          [
            ctx.field("id", "", "hidden", id),
            ctx.field(
              "amount",
              "Tiền cọc cố định (40% tiền phòng)",
              "number",
              requiredDeposit,
            ),
            ctx.field("method", "Phương thức", "select", "CASH", [
              ["CASH", "Tiền mặt"],
              ["TRANSFER", "Chuyển khoản"],
              ["CARD", "Thẻ"],
            ]),
            reference,
            ctx.field(
              "receiptConfirmed",
              "Tôi xác nhận đã nhận hoặc đối soát tiền cọc",
              "checkbox",
              "yes",
            ),
          ],
          async (body) => {
            const amount = depositAmount(
              body.amount || requiredDeposit,
              booking.roomCharge,
            );
            if (body.method === "TRANSFER")
              return openPayment(ctx, { kind: "DEPOSIT", bookingId: id, amount });
            return ctx.command(action, {
              ...body,
              amount,
              receiptConfirmed: body.receiptConfirmed === "yes",
            });
          },
          "Xác nhận tiền cọc",
          `Mức tiền cọc cố định bằng 40% tiền phòng (${ctx.money(requiredDeposit)} / ${ctx.money(booking.roomCharge)}). Chuyển khoản tạo QR SePay tự động xác nhận; tiền mặt / thẻ xác nhận sau khi đã nhận tiền.`,
        );
        const form = document.querySelector("#editor-form");
        const amountInput = form.elements.amount;
        amountInput.min = "1";
        amountInput.max = String(booking.roomCharge);
        amountInput.readOnly = true;
        const updateMethod = () => {
          const transfer = form.elements.method.value === "TRANSFER";
          const receipt = form.elements.receiptConfirmed;
          receipt.closest("label").dataset.sepayManual = "";
          form.elements.reference.closest("label").dataset.sepayManual = "";
          receipt.required = !transfer;
          receipt.disabled = transfer;
          receipt.closest("label").hidden = transfer;
          form.elements.reference.closest("label").hidden = transfer;
        };
        form.elements.method.addEventListener("change", updateMethod);
        updateMethod();
        return;
      }
    },
    bookingTable(rows) {
      return renderBookings(ctx, rows);
    },
  };
}
