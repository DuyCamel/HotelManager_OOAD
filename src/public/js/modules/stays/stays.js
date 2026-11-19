/** Active stay desk using StayRoomHistory as the canonical room source. */
const stayState = { query: "", schedule: "" };
let activeContext;
let handlersInstalled = false;

const sameId = (left, right) => String(left) === String(right);
const hotelDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .map(({ type, value: part }) => [type, part]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
};
const nextDate = (value) => {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};

function bookingFor(ctx, stay) {
  return (ctx.d.bookings || []).find((booking) =>
    sameId(booking.id, stay.bookingId),
  );
}

function customerFor(ctx, stay) {
  const booking = bookingFor(ctx, stay);
  return (ctx.d.customers || []).find((customer) =>
    sameId(customer.id, booking?.customerId),
  );
}

function currentRoomId(ctx, stay) {
  if (stay.currentRoomId) return stay.currentRoomId;
  const currentHistory = (ctx.d.history || []).find(
    (item) => sameId(item.stayId, stay.id) && !item.toAt,
  );
  return currentHistory?.roomId || stay.roomId || bookingFor(ctx, stay)?.roomId;
}

function roomFor(ctx, stay) {
  const roomId = currentRoomId(ctx, stay);
  return (ctx.d.rooms || []).find((room) => sameId(room.id, roomId));
}

function typeFor(ctx, room) {
  return (ctx.d.types || []).find((type) => sameId(type.id, room?.typeId));
}

function isRoomFreeForRange(ctx, roomId, startAt, endAt, excludeBookingId) {
  const rStart = Date.parse(startAt);
  const rEnd = Date.parse(endAt);
  if (!Number.isFinite(rStart) || !Number.isFinite(rEnd)) return true;
  const overlaps = (a, b) => {
    const s = Date.parse(a);
    const e = Date.parse(b);
    return Number.isFinite(s) && Number.isFinite(e) && rStart < e && rEnd > s;
  };
  const isActiveBooking = (b) =>
    b.status === "CONFIRMED" ||
    b.status === "CHECKED_IN" ||
    (b.status === "PENDING" && (!b.holdUntil || Date.parse(b.holdUntil) >= Date.now()));
  const stays = ctx.d.stays || [];
  const bookings = ctx.d.bookings || [];
  const history = ctx.d.history || [];
  for (const b of bookings) {
    if (sameId(b.id, excludeBookingId) || !isActiveBooking(b)) continue;
    const stay = stays.find((s) => sameId(s.bookingId, b.id) && !s.checkOutAt);
    const assignedId = stay ? currentRoomId(ctx, stay) : b.roomId;
    if (sameId(assignedId, roomId) && overlaps(b.startAt, b.endAt)) return false;
  }
  for (const hItem of history) {
    if (!sameId(hItem.roomId, roomId) || hItem.toAt) continue;
    const stay = stays.find((s) => sameId(s.id, hItem.stayId) && !s.checkOutAt);
    const b = stay && bookings.find((item) => sameId(item.id, stay.bookingId));
    if (stay && b && !sameId(b.id, excludeBookingId) && overlaps(b.startAt, b.endAt))
      return false;
  }
  return true;
}

function usageTotal(ctx, stay) {
  return (ctx.d.usage || [])
    .filter((item) => sameId(item.stayId, stay.id) && !item.isVoided)
    .reduce(
      (sum, item) => sum + Number(item.unitPrice || 0) * Number(item.quantity || 0),
      0,
    );
}

function matchesStay(ctx, stay, isActive = true) {
  if (isActive) {
    const booking = bookingFor(ctx, stay);
    if (stayState.schedule === "DUE_TODAY" && hotelDate(booking?.endAt) !== hotelDate(new Date()))
      return false;
    if (stayState.schedule === "OVERDUE" && !(Date.parse(booking?.endAt) < Date.now()))
      return false;
  }
  const query = stayState.query.trim().toLocaleLowerCase("vi");
  if (!query) return true;
  const customer = customerFor(ctx, stay);
  const room = roomFor(ctx, stay);
  return [
    stay.id,
    booking?.id,
    customer?.id,
    customer?.name,
    customer?.phone,
    customer?.identityNo,
    stay.identityNo,
    room?.id,
    room?.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("vi")
    .includes(query);
}

function renderStayRow(ctx, stay) {
  const booking = bookingFor(ctx, stay);
  const customer = customerFor(ctx, stay);
  const room = roomFor(ctx, stay);
  const type = typeFor(ctx, room);
  const services = usageTotal(ctx, stay);
  const roomCharge = Number(stay.roomCharge || booking?.roomCharge || 0);
  const surcharge = Number(stay.surcharge || 0);
  return `<tr>
    <td class="record-cell" data-label="Phiếu thuê"><strong>${ctx.E(stay.id)}</strong><small>Đặt phòng ${ctx.E(booking?.id || "—")}</small></td>
    <td class="customer-cell" data-label="Khách / CCCD"><strong>${ctx.E(customer?.name || "Chưa có dữ liệu khách")}</strong><small>CCCD ${ctx.E(stay.identityNo || customer?.identityNo || "chưa có")} · ${ctx.E(customer?.phone || "—")}</small></td>
    <td data-label="Phòng hiện tại"><strong>${ctx.E(room?.name || currentRoomId(ctx, stay) || "—")}</strong><small>${ctx.E(type?.name || "Chưa có loại")}</small></td>
    <td data-label="Nhận / Trả dự kiến">${ctx.date(stay.checkInAt)}<small>Dự kiến trả ${ctx.date(booking?.endAt)}${Date.parse(booking?.endAt) < Date.now() ? ' · <strong style="color:#a34d40">Quá giờ trả</strong>' : hotelDate(booking?.endAt) === hotelDate(new Date()) ? ' · <strong>Trả hôm nay</strong>' : ""}</small></td>
    <td class="amount" data-label="Tạm tính">${ctx.money(roomCharge + surcharge + services)}<small>Phòng ${ctx.money(roomCharge)} · DV ${ctx.money(services)}${surcharge ? ` · Phụ thu ${ctx.money(surcharge)}` : ""}</small></td>
    <td class="operation-actions" data-label="Thao tác">
      ${room ? ctx.btn("Xem phòng", "room.detail", room.id) : ""}
      ${ctx.btn("Đổi phòng", "stay.move", stay.id)}
      ${ctx.btn("Gia hạn", "stay.extend", stay.id)}
      ${ctx.btn("Dịch vụ", "usage.stay", stay.id)}
      ${ctx.btn("Trả phòng", "stay.checkout", stay.id, "primary")}
    </td>
  </tr>`;
}

function renderCompletedStayRow(ctx, stay) {
  const booking = bookingFor(ctx, stay);
  const customer = customerFor(ctx, stay);
  const room = roomFor(ctx, stay);
  const type = typeFor(ctx, room);
  const invoice = (ctx.d.invoices || []).find((inv) => inv.stayId === stay.id);
  const services = usageTotal(ctx, stay);
  const roomCharge = Number(stay.roomCharge || booking?.roomCharge || 0);
  const surcharge = Number(stay.surcharge || 0);
  const total = invoice?.total != null ? Number(invoice.total) : roomCharge + surcharge + services;
  return `<tr>
    <td class="record-cell" data-label="Phiếu thuê"><strong>${ctx.E(stay.id)}</strong><small>Đặt phòng ${ctx.E(booking?.id || "—")}</small></td>
    <td class="customer-cell" data-label="Khách / CCCD"><strong>${ctx.E(customer?.name || "Chưa có dữ liệu khách")}</strong><small>CCCD ${ctx.E(stay.identityNo || customer?.identityNo || "chưa có")} · ${ctx.E(customer?.phone || "—")}</small></td>
    <td data-label="Phòng"><strong>${ctx.E(room?.name || currentRoomId(ctx, stay) || "—")}</strong><small>${ctx.E(type?.name || "Chưa có loại")}</small></td>
    <td data-label="Thời gian lưu trú">${ctx.date(stay.checkInAt)}<small>Đã trả ${ctx.date(stay.checkOutAt)}</small></td>
    <td class="amount" data-label="Tổng tiền"><strong>${ctx.money(total)}</strong><small>${invoice ? `Hóa đơn ${ctx.E(invoice.id)}` : "Đã thanh toán"}</small></td>
    <td class="operation-actions" data-label="Thao tác">
      ${room ? ctx.btn("Xem phòng", "room.detail", room.id) : ""}
      ${invoice ? `<button type="button" class="small" data-invoice-detail="${ctx.E(invoice.id)}">Hóa đơn</button>` : ""}
      ${invoice ? `<a class="small" target="_blank" rel="noopener" href="/api/invoice/${encodeURIComponent(invoice.id)}" style="display:inline-flex;align-items:center;text-decoration:none">In hóa đơn</a>` : ""}
    </td>
  </tr>`;
}

function renderStays(ctx) {
  const stays = ctx.d.stays || [];
  const active = stays
    .filter((stay) => !stay.checkOutAt && matchesStay(ctx, stay, true))
    .sort(
      (left, right) =>
        Date.parse(right.checkInAt || 0) - Date.parse(left.checkInAt || 0),
    );
  const completed = stays
    .filter((stay) => stay.checkOutAt && matchesStay(ctx, stay, false))
    .sort(
      (left, right) =>
        Date.parse(right.checkOutAt || 0) - Date.parse(left.checkOutAt || 0),
    );

  return `<div class="operation-toolbar housekeeping-toolbar" aria-label="Tìm phiếu lưu trú">
      <label class="operation-filter operation-filter-wide">Khách, CCCD, phòng hoặc mã phiếu
        <input type="search" data-stay-filter="query" value="${ctx.E(stayState.query)}" placeholder="Tìm phiếu đang ở hoặc đã trả…" autocomplete="off">
      </label>
      <label class="operation-filter">Lịch trả phòng
        <select data-stay-filter="schedule">
          <option value="" ${!stayState.schedule ? "selected" : ""}>Tất cả đang ở</option>
          <option value="DUE_TODAY" ${stayState.schedule === "DUE_TODAY" ? "selected" : ""}>Trả phòng hôm nay</option>
          <option value="OVERDUE" ${stayState.schedule === "OVERDUE" ? "selected" : ""}>Quá giờ trả phòng</option>
        </select>
      </label>
    </div>
    <section class="operation-section">
      <header class="operation-section-head"><div><h2>Khách đang lưu trú</h2><p>Các kỳ lưu trú đang diễn ra. Kiểm tra phòng, đổi phòng, gia hạn hoặc thực hiện trả phòng.</p></div><span class="readonly-pill">${active.length} phiếu thuê</span></header>
      <div class="operation-table-wrap stays-table-wrap"><table class="operation-table stays-table"><thead><tr>
        <th>Phiếu thuê</th><th>Khách / CCCD</th><th>Phòng hiện tại</th><th>Nhận / Trả dự kiến</th><th>Tạm tính</th><th>Thao tác</th>
      </tr></thead><tbody>${
        active.map((stay) => renderStayRow(ctx, stay)).join("") ||
        '<tr><td colspan="6" class="empty">Không có phiếu lưu trú phù hợp.</td></tr>'
      }</tbody></table></div>
    </section>
    <section class="operation-section" style="margin-top:24px">
      <header class="operation-section-head"><div><h2>Lịch sử lưu trú đã hoàn tất</h2><p>Các kỳ lưu trú đã hoàn tất thủ tục trả phòng và chốt hóa đơn.</p></div><span class="readonly-pill">${completed.length} phiếu đã trả</span></header>
      <div class="operation-table-wrap stays-table-wrap"><table class="operation-table stays-table"><thead><tr>
        <th>Phiếu thuê</th><th>Khách / CCCD</th><th>Phòng</th><th>Thời gian lưu trú</th><th>Tổng tiền</th><th>Thao tác</th>
      </tr></thead><tbody>${
        completed.map((stay) => renderCompletedStayRow(ctx, stay)).join("") ||
        '<tr><td colspan="6" class="empty">Chưa có lịch sử lưu trú hoàn tất phù hợp.</td></tr>'
      }</tbody></table></div>
    </section>`;
}

function rerender(focus = false, pos = null) {
  if (!activeContext || activeContext.page !== "stays") return;
  const target = document.querySelector("#page-content");
  if (!target) return;
  target.innerHTML = renderStays(activeContext);
  if (focus) {
    const input = target.querySelector("[data-stay-filter]");
    if (input) {
      input.focus();
      const caret = pos != null ? pos : input.value.length;
      input.setSelectionRange?.(caret, caret);
    }
  }
}

function installHandlers() {
  if (handlersInstalled) return;
  handlersInstalled = true;
  const onFilter = (event) => {
    const control = event.target.closest("[data-stay-filter]");
    if (!control) return;
    if (event.type === "input" && control.tagName === "SELECT") return;
    if (event.type === "change" && control.type === "search") return;
    stayState[control.dataset.stayFilter] = control.value;
    const isQuery = control.dataset.stayFilter === "query";
    const pos = isQuery ? control.selectionStart : null;
    rerender(isQuery, pos);
  };
  document.addEventListener("input", onFilter);
  document.addEventListener("change", onFilter);
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
      return ctx.page === "stays" ? renderStays(ctx) : "";
    },
    async act(action, id) {
      const hidden = () => ctx.field("id", "", "hidden", id);
      if (action === "stay.checkin") {
        const booking = (ctx.d.bookings || []).find((item) =>
          sameId(item.id, id),
        );
        const customer = (ctx.d.customers || []).find((item) =>
          sameId(item.id, booking?.customerId),
        );
        const bookedRoom = (ctx.d.rooms || []).find((r) => sameId(r.id, booking?.roomId));
        const bookedType = typeFor(ctx, bookedRoom);
        const roomChoices = (ctx.d.rooms || [])
          .filter((r) => {
            if (sameId(r.id, booking?.roomId)) return true;
            if (r.status !== "AVAILABLE") return false;
            const t = typeFor(ctx, r);
            return (
              Number(t?.capacity || 0) >= Number(booking?.guests || 1) &&
              isRoomFreeForRange(ctx, r.id, booking?.startAt, booking?.endAt, booking?.id)
            );
          })
          .map((r) => {
            const t = typeFor(ctx, r);
            return [
              r.id,
              `${r.name || r.id} · ${t?.name || "Phòng"}${sameId(r.id, booking?.roomId) ? " (Phòng đã đặt)" : " (Đổi sang phòng này)"}`,
            ];
          });
        ctx.actionForm(
          "Nhận phòng",
          [
            hidden(),
            ctx.field(
              "identityNo",
              "CCCD / Hộ chiếu khách lưu trú",
              "text",
              customer?.identityNo || "",
            ),
            ctx.field(
              "roomId",
              "Phòng nhận thực tế",
              "select",
              booking?.roomId || "",
              roomChoices,
            ),
          ],
          action,
          "",
        );
        const fieldsBox = document.querySelector("#dialog-fields");
        if (fieldsBox && booking) {
          const summary = document.createElement("div");
          summary.className = "checkin-summary-card";
          const rem = Math.max(0, Number(booking.roomCharge || 0) - Number(booking.deposit || 0));
          summary.innerHTML = `
            <div><small>Khách lưu trú</small><strong>${ctx.E(customer?.name || "Khách hàng")} · ${ctx.E(customer?.phone || "—")}</strong></div>
            <div><small>Phòng đặt & sức chứa</small><strong>${ctx.E(bookedRoom?.name || booking.roomId)} (${ctx.E(bookedType?.name || "—")}) · ${Number(booking.guests || 1)} khách</strong></div>
            <div><small>Mã phiếu đặt</small><strong>${ctx.E(booking.id)}</strong></div>
            <div><small>Nhận → Trả dự kiến</small><strong>${ctx.date(booking.startAt)} → ${ctx.date(booking.endAt)}</strong></div>
            <div><small>Tiền phòng / Đã cọc</small><strong>${ctx.money(booking.roomCharge)} / ${ctx.money(booking.deposit)}</strong></div>
            <div><small>Còn lại tạm tính</small><strong>${ctx.money(rem)}</strong></div>
            <p class="checkin-summary-foot">Đối chiếu giấy tờ tùy thân bản gốc trước khi xác nhận (CCCD tự động lưu vào hồ sơ khách).</p>`;
          fieldsBox.prepend(summary);
        }
        return;
      }
      if (action === "stay.walkin") {
        const room = (ctx.d.rooms || []).find((r) => sameId(r.id, id));
        const type = typeFor(ctx, room);
        const checkOutTime = String(ctx.d.settings?.[0]?.checkOutTime || "12:00").slice(0, 5);
        const today = hotelDate(new Date());
        const tomorrow = nextDate(today);
        const customerOptions = [
          ["", "— Nhập khách vãng lai mới bên dưới —"],
          ...(ctx.d.customers || [])
            .filter((c) => c.isActive)
            .map((c) => [
              c.id,
              `${c.name} · ${c.phone || "—"} · CCCD ${c.identityNo || "chưa có"}`,
            ]),
        ];
        return ctx.form(
          `Nhận phòng ngay · ${room?.name || id}`,
          [
            { ...ctx.field("customerId", "Chọn khách quen (nếu có)", "select", "", customerOptions), optional: true },
            { ...ctx.field("customerName", "Họ tên khách mới", "text", ""), optional: true },
            { ...ctx.field("customerPhone", "Số điện thoại khách mới", "tel", ""), optional: true },
            ctx.field("identityNo", "CCCD / Hộ chiếu khách lưu trú", "text", ""),
            ctx.field("endAt", `Ngày trả phòng (${checkOutTime})`, "date", tomorrow),
            ctx.field("guests", "Số khách", "number", 1),
            { ...ctx.field("deposit", "Tiền cọc thu ngay (tiền mặt, không bắt buộc)", "number", 0), optional: true },
          ],
          async (body) => {
            await ctx.command("stay.walkin", {
              roomId: id,
              customerId: body.customerId || "",
              customerName: body.customerName || "",
              customerPhone: body.customerPhone || "",
              identityNo: body.identityNo,
              endAt: body.endAt,
              guests: body.guests,
              deposit: Number(body.deposit || 0),
            });
          },
          "Nhận phòng ngay",
          `Phòng ${room?.name || id} (${type?.name || "—"}, tối đa ${type?.capacity || 2} khách). Hệ thống tạo đồng thời phiếu đặt và phiếu lưu trú trong 1 bước.`,
        );
      }
      if (action === "stay.move") {
        const stay = (ctx.d.stays || []).find((item) => sameId(item.id, id));
        const booking = stay && bookingFor(ctx, stay);
        const currentId = stay && currentRoomId(ctx, stay);
        const options = (ctx.d.rooms || [])
          .filter((room) => {
            if (room.status !== "AVAILABLE" || sameId(room.id, currentId))
              return false;
            const type = typeFor(ctx, room);
            return (
              (!booking?.guests || Number(type?.capacity || 0) >= booking.guests) &&
              isRoomFreeForRange(ctx, room.id, new Date().toISOString(), booking?.endAt, booking?.id)
            );
          })
          .map((room) => {
            const type = typeFor(ctx, room);
            return [
              room.id,
              `${room.name || room.id} · ${type?.name || "Chưa có loại"}`,
            ];
          });
        if (!options.length) {
          ctx.toast("Không có phòng sạch, đủ sức chứa để đổi lúc này.");
          return;
        }
        const currentRoom = roomFor(ctx, stay);
        const currentType = typeFor(ctx, currentRoom);
        ctx.actionForm(
          "Đổi phòng",
          [
            hidden(),
            ctx.field("roomId", "Phòng mới muốn chuyển sang", "select", options[0][0], options),
            ctx.field("expectedExtra", "Phụ thu dự kiến", "hidden", ""),
          ],
          action,
          "",
          async (body) => {
            let expectedExtra = body.expectedExtra;
            if (expectedExtra === "" || expectedExtra == null) {
              const preview = await ctx.api("/api/action/stay.move-preview", {
                id: body.id,
                roomId: body.roomId,
              });
              expectedExtra = preview.extra;
            }
            await ctx.command(action, { ...body, expectedExtra: Number(expectedExtra || 0) });
          },
        );
        const fieldsBox = document.querySelector("#dialog-fields");
        if (fieldsBox) {
          const roomSelect = fieldsBox.querySelector('[name="roomId"]');
          const extraInput = fieldsBox.querySelector('[name="expectedExtra"]');
          const roomLabel = fieldsBox.querySelector('label:has([name="roomId"])');
          if (roomLabel) roomLabel.style.gridColumn = "1 / -1";
          const summary = document.createElement("div");
          summary.className = "checkin-summary-card";
          summary.innerHTML = `
            <div><small>Phòng hiện tại</small><strong>${ctx.E(currentRoom?.name || currentId || "—")} (${ctx.E(currentType?.name || "—")})</strong></div>
            <div><small>Phòng chuyển đến</small><strong data-move-next>—</strong></div>
            <div><small>Phụ thu chênh lệch</small><strong data-move-extra>Đang tính…</strong></div>
            <p class="checkin-summary-foot">Phòng cũ tự động chuyển sang Cần dọn. Chỉ thu thêm phần chênh lệch dương nếu nâng hạng phòng.</p>`;
          fieldsBox.prepend(summary);
          const nextNode = summary.querySelector("[data-move-next]");
          const extraNode = summary.querySelector("[data-move-extra]");
          let seq = 0;
          const refreshPreview = async () => {
            const rid = roomSelect?.value;
            if (!rid) return;
            const currentSeq = ++seq;
            if (extraNode) extraNode.textContent = "Đang tính…";
            try {
              const preview = await ctx.api("/api/action/stay.move-preview", {
                id,
                roomId: rid,
              });
              if (currentSeq !== seq) return;
              if (extraInput) extraInput.value = String(preview.extra ?? 0);
              if (nextNode) nextNode.textContent = ctx.name("rooms", preview.nextRoomId || rid);
              if (extraNode) extraNode.textContent = ctx.money(preview.extra || 0);
            } catch (err) {
              if (currentSeq !== seq) return;
              if (extraNode) extraNode.textContent = err?.message || "Không tính được";
            }
          };
          roomSelect?.addEventListener("change", refreshPreview);
          refreshPreview();
        }
        return;
      }
      if (action === "stay.extend") {
        const stay = (ctx.d.stays || []).find((item) => sameId(item.id, id));
        const booking = stay && bookingFor(ctx, stay);
        if (!booking) {
          ctx.toast("Không tìm thấy phiếu đặt phòng liên quan.");
          return;
        }
        const currentEndDate = hotelDate(booking.endAt);
        const currentRoom = roomFor(ctx, stay);
        const alternatives = [
          ["", "Giữ phòng hiện tại"],
          ...(ctx.d.rooms || [])
            .filter((room) => {
              if (
                room.status !== "AVAILABLE" ||
                String(room.id) === String(currentRoom?.id)
              )
                return false;
              const type = (ctx.d.types || []).find(
                (item) => String(item.id) === String(room.typeId),
              );
              return Number(type?.capacity || 0) >= Number(booking.guests || 1);
            })
            .map((room) => [
              room.id,
              `${room.name || room.id} · ${ctx.name("types", room.typeId)}`,
            ]),
        ];
        ctx.actionForm(
          "Gia hạn lưu trú",
          [
            hidden(),
            ctx.field(
              "endDate",
              "Ngày trả mới",
              "date",
              nextDate(currentEndDate),
            ),
            {
              ...ctx.field(
                "roomId",
                "Phòng thay thế (tùy chọn)",
                "select",
                "",
                alternatives,
              ),
              optional: true,
            },
          ],
          action,
          `Ngày trả hiện tại: ${ctx.date(booking.endAt)}. Hệ thống kiểm tra lịch trùng. Nếu chọn phòng khác, hệ thống chuyển khách và cập nhật kỳ lưu trú cùng lúc. Xem chi phí tạm tính bên dưới trước khi xác nhận.`,
          async (body) => {
            const preview = await ctx.api("/api/action/stay.extend-preview", {
              id: body.id,
              endDate: body.endDate,
              roomId: body.roomId || "",
            });
            await ctx.command(action, {
              ...body,
              expectedExtensionCharge: Number(preview.extensionCharge || 0),
              expectedMoveExtra: Number(preview.moveExtra || 0),
            });
          },
        );
        const fieldsBox = document.querySelector("#dialog-fields");
        const dateInput = fieldsBox?.querySelector('[name="endDate"]');
        const roomSelect = fieldsBox?.querySelector('[name="roomId"]');
        if (fieldsBox) {
          const summary = document.createElement("div");
          summary.className = "checkin-summary-card extension-summary-card";
          summary.innerHTML = `
            <div><small>Phòng áp dụng</small><strong data-extension-room>Đang tính…</strong></div>
            <div><small>Tiền phòng tăng do gia hạn</small><strong data-extension-charge>Đang tính…</strong></div>
            <div><small>Chênh lệch do đổi phòng</small><strong data-move-extra>—</strong></div>
            <div class="extension-summary-total"><small>Tổng chi phí tăng thêm</small><strong data-extension-total>Đang tính…</strong></div>
            <p class="checkin-summary-foot">Đây là phần tiền phòng dự kiến tăng thêm; dịch vụ phát sinh và phụ thu khác được tính riêng.</p>`;
          fieldsBox.append(summary);
          const roomNode = summary.querySelector("[data-extension-room]");
          const chargeNode = summary.querySelector("[data-extension-charge]");
          const moveNode = summary.querySelector("[data-move-extra]");
          const totalNode = summary.querySelector("[data-extension-total]");
          let sequence = 0;
          const refreshPreview = async () => {
            const currentSequence = ++sequence;
            if (chargeNode) chargeNode.textContent = "Đang tính…";
            if (moveNode) moveNode.textContent = "Đang tính…";
            if (totalNode) totalNode.textContent = "Đang tính…";
            try {
              const preview = await ctx.api("/api/action/stay.extend-preview", {
                id,
                endDate: dateInput?.value,
                roomId: roomSelect?.value || "",
              });
              if (currentSequence !== sequence) return;
              const extensionCharge = Number(preview.extensionCharge || 0);
              const moveExtra = Number(preview.moveExtra || 0);
              if (roomNode)
                roomNode.textContent = ctx.name(
                  "rooms",
                  preview.targetRoomId ||
                    preview.roomId ||
                    preview.nextRoomId ||
                    preview.currentRoomId ||
                    currentRoom?.id ||
                    "",
                );
              if (chargeNode) chargeNode.textContent = ctx.money(extensionCharge);
              if (moveNode) moveNode.textContent = ctx.money(moveExtra);
              if (totalNode)
                totalNode.textContent = ctx.money(extensionCharge + moveExtra);
            } catch (error) {
              if (currentSequence !== sequence) return;
              if (roomNode) roomNode.textContent = "Chưa xác định";
              if (chargeNode)
                chargeNode.textContent = error?.message || "Chưa tính được";
              if (moveNode) moveNode.textContent = "—";
              if (totalNode) totalNode.textContent = "Chưa tính được";
            }
          };
          dateInput?.addEventListener("change", refreshPreview);
          roomSelect?.addEventListener("change", refreshPreview);
          refreshPreview();
        }
        return;
      }
    },
  };
}
