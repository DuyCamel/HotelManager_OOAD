let currentContext;
let selectedCardId = "";
let ledgerState = { status: "idle", points: [], cards: [] };

function tierOf(points) {
  const pts = Math.max(0, Math.floor(Number(points || 0)));
  if (pts >= 1000) return { name: "Kim cương", percent: 15 };
  if (pts >= 500) return { name: "Vàng", percent: 10 };
  if (pts >= 100) return { name: "Bạc", percent: 5 };
  return { name: "Thành viên", percent: 0 };
}

function rerenderMemberships() {
  if (!currentContext || !["cards", "mycard"].includes(currentContext.page))
    return;
  const root = document.querySelector(
    '#page-content[data-module="memberships"]',
  );
  if (root) root.innerHTML = membershipPage(currentContext);
}

function requestLedger(ctx) {
  if (Array.isArray(ctx.d.points) || ledgerState.status !== "idle") return;
  ledgerState.status = "loading";
  ctx
    .api("/api/memberships/data")
    .then((payload) => {
      ledgerState = {
        status: "ready",
        cards: Array.isArray(payload.cards) ? payload.cards : [],
        points: Array.isArray(payload.points) ? payload.points : [],
      };
      rerenderMemberships();
    })
    .catch(() => {
      ledgerState = { status: "error", points: [], cards: [] };
      rerenderMemberships();
    });
}

function cardsFor(ctx) {
  return Array.isArray(ctx.d.cards) && ctx.d.cards.length
    ? ctx.d.cards
    : ledgerState.cards;
}

function pointsFor(ctx) {
  return Array.isArray(ctx.d.points) ? ctx.d.points : ledgerState.points;
}

document.addEventListener("click", (event) => {
  const view = event.target.closest("[data-membership-view]");
  if (view) {
    selectedCardId = view.dataset.membershipView;
    rerenderMemberships();
    document.querySelector(".membership-detail")?.focus();
    return;
  }
  const disable = event.target.closest("[data-membership-disable]");
  if (disable && currentContext?.page === "cards") {
    const card = cardsFor(currentContext).find(
      (item) => String(item.id) === disable.dataset.membershipDisable,
    );
    if (!card) return;
    const customer = (currentContext.d.customers || []).find(
      (item) => item.id === card.customerId,
    );
    currentContext.actionForm(
      "Vô hiệu hóa thẻ thành viên",
      [currentContext.field("id", "", "hidden", card.id)],
      "card.disable",
      `Vô hiệu hóa thẻ ${card.id} của ${customer?.name || card.customerId}? Điểm và sổ lịch sử vẫn được giữ nguyên; khách này không thể được cấp thẻ thứ hai.`,
    );
    return;
  }
  const requestDisable = event.target.closest("[data-membership-request]");
  if (requestDisable && currentContext?.page === "cards") {
    const card = cardsFor(currentContext).find(
      (item) => String(item.id) === requestDisable.dataset.membershipRequest,
    );
    if (!card) return;
    const customer = (currentContext.d.customers || []).find(
      (item) => item.id === card.customerId,
    );
    currentContext.actionForm(
      "Yêu cầu vô hiệu hóa thẻ thành viên",
      [
        currentContext.field("id", "", "hidden", card.id),
        currentContext.field(
          "reason",
          "Lý do yêu cầu",
          "text",
          "Khách làm mất thẻ vật lý",
        ),
      ],
      "card.requestDisable",
      `Lễ tân gửi yêu cầu vô hiệu hóa thẻ ${card.id} (${customer?.name || card.customerId}) tới Admin. Admin sẽ xem xét và phê duyệt trước khi thẻ bị khóa.`,
    );
    return;
  }
  const approveDisable = event.target.closest("[data-membership-approve]");
  if (approveDisable && currentContext?.page === "cards") {
    const card = cardsFor(currentContext).find(
      (item) => String(item.id) === approveDisable.dataset.membershipApprove,
    );
    if (!card) return;
    const customer = (currentContext.d.customers || []).find(
      (item) => item.id === card.customerId,
    );
    const req = card.disableRequest;
    currentContext.actionForm(
      "Duyệt vô hiệu hóa thẻ thành viên",
      [currentContext.field("id", "", "hidden", card.id)],
      "card.approveDisable",
      `Phê duyệt yêu cầu vô hiệu hóa thẻ ${card.id} (${customer?.name || card.customerId}) do ${req?.requestedBy || "Lễ tân"} gửi với lý do: "${req?.reason || "Không có lý do"}". Thẻ sau khi duyệt sẽ ngưng hoạt động vĩnh viễn.`,
    );
    return;
  }
  const rejectDisable = event.target.closest("[data-membership-reject]");
  if (rejectDisable && currentContext?.page === "cards") {
    const card = cardsFor(currentContext).find(
      (item) => String(item.id) === rejectDisable.dataset.membershipReject,
    );
    if (!card) return;
    const customer = (currentContext.d.customers || []).find(
      (item) => item.id === card.customerId,
    );
    currentContext.actionForm(
      "Từ chối yêu cầu vô hiệu hóa",
      [currentContext.field("id", "", "hidden", card.id)],
      "card.rejectDisable",
      `Từ chối yêu cầu vô hiệu hóa thẻ ${card.id} (${customer?.name || card.customerId})? Thẻ sẽ tiếp tục duy trì trạng thái hoạt động bình thường.`,
    );
    return;
  }
  const reactivate = event.target.closest("[data-membership-reactivate]");
  if (reactivate && currentContext?.page === "cards") {
    const card = cardsFor(currentContext).find(
      (item) => String(item.id) === reactivate.dataset.membershipReactivate,
    );
    if (!card) return;
    const customer = (currentContext.d.customers || []).find(
      (item) => item.id === card.customerId,
    );
    currentContext.actionForm(
      "Mở lại thẻ thành viên",
      [currentContext.field("id", "", "hidden", card.id)],
      "card.reactivate",
      `Mở lại thẻ ${card.id} của khách hàng ${customer?.name || card.customerId}? Thẻ sẽ được khôi phục trạng thái hoạt động (ACTIVE) và khách hàng có thể tiếp tục sử dụng điểm tích lũy.`,
    );
    return;
  }
});

function ledger(ctx, card) {
  const { E, date } = ctx;
  if (!Array.isArray(ctx.d.points) && ledgerState.status === "loading")
    return '<p class="membership-ledger-state">Đang tải lịch sử điểm…</p>';
  if (!Array.isArray(ctx.d.points) && ledgerState.status === "error")
    return '<p class="membership-ledger-state">Không thể tải lịch sử điểm lúc này.</p>';
  const entries = pointsFor(ctx)
    .filter((item) => item.cardId === card.id)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  if (!entries.length)
    return '<p class="membership-ledger-state">Chưa có giao dịch tích điểm.</p>';
  return `<div class="membership-ledger-list">${entries
    .map((entry) => {
      const value = Number(entry.points || 0);
      return `<article><div class="membership-ledger-icon" aria-hidden="true">↗</div><div><strong>Hóa đơn ${E(entry.id)}</strong><small>${E(date(entry.createdAt))}</small></div><b class="${value >= 0 ? "positive" : ""}">${value > 0 ? "+" : ""}${E(value.toLocaleString("vi-VN"))} điểm</b></article>`;
    })
    .join("")}</div>`;
}

function memberCard(ctx, card, customer) {
  const { E, badge, date } = ctx;
  const tier = tierOf(card.points);
  return `<article class="membership-card ${card.isActive ? "active" : "inactive"}">
    <div class="membership-card-shine" aria-hidden="true"></div>
    <header><span>AURORA PRIVILEGE · HẠNG ${E(tier.name.toUpperCase())}</span>${badge(card.isActive ? "ACTIVE" : "DISABLED")}</header>
    <div class="membership-card-points"><span>Điểm hiện có</span><strong>${E(Number(card.points || 0).toLocaleString("vi-VN"))}</strong></div>
    <dl><div><dt>Chủ thẻ</dt><dd>${E(customer?.name || card.customerId)}</dd></div><div><dt>Ưu đãi hạng ${E(tier.name)}</dt><dd>Giảm ${tier.percent}% hóa đơn</dd></div></dl>
    <footer><span>${E(card.id)}</span><small>Cấp ${E(date(card.issuedAt))}</small></footer>
  </article>`;
}

function myMembership(ctx) {
  const { E, d } = ctx;
  const cards = cardsFor(ctx);
  const card = cards[0];
  const customer = card
    ? (d.customers || []).find((item) => item.id === card.customerId)
    : (d.customers || [])[0];
  if (!card)
    return `<section class="membership-empty panel"><div aria-hidden="true">◇</div><h2>Chưa có thẻ thành viên</h2><p>Hồ sơ ${E(customer?.name || "của bạn")} chưa được cấp thẻ. Lễ tân có thể hỗ trợ sau khi xác minh hồ sơ.</p><a class="primary" href="/app/mybookings">Xem lịch sử đặt phòng</a></section>`;
  return `<section class="membership-self">
    <div class="membership-self-hero">${memberCard(ctx, card, customer)}
      <article class="membership-explainer"><span class="eyebrow">QUYỀN LỢI ĐANG GHI NHẬN</span><h2>Mỗi điểm đều có nguồn gốc rõ ràng.</h2><p>Điểm được cộng từ hóa đơn đã thanh toán (10.000 ₫ = 1 điểm). Chính sách hạng: Thành viên (&lt;100 điểm · 0%), Bạc (100–499 · giảm 5%), Vàng (500–999 · giảm 10%), Kim cương (&ge;1.000 · giảm 15%).</p><div class="membership-status-note"><span class="${card.isActive ? "on" : "off"}"></span><strong>${card.isActive ? "Thẻ đang hoạt động" : "Thẻ đã vô hiệu hóa"}</strong></div></article>
    </div>
    <article class="panel membership-ledger"><div class="membership-section-title"><div><span>SỔ ĐIỂM</span><h3>Lịch sử tích điểm</h3></div><strong>${E(Number(card.points || 0).toLocaleString("vi-VN"))} điểm</strong></div>${ledger(ctx, card)}</article>
  </section>`;
}

function staffMembership(ctx) {
  const { E, name, badge, btn, table, d } = ctx;
  const cards = cardsFor(ctx);
  if (!cards.some((item) => item.id === selectedCardId))
    selectedCardId = cards[0]?.id || "";
  const selected = cards.find((item) => item.id === selectedCardId);
  const customer = selected
    ? (d.customers || []).find((item) => item.id === selected.customerId)
    : null;
  const isReception = ctx.role === "RECEPTIONIST";
  const isAdminOrManager = ["ADMIN", "MANAGER"].includes(ctx.role);
  const pendingList = cards.filter(
    (c) => c.disableRequest && c.disableRequest.status === "PENDING",
  );
  const bannerHtml =
    isAdminOrManager && pendingList.length > 0
      ? `<section class="membership-alert-banner">
          <div class="membership-alert-header">
            <span class="banner-bell-icon" aria-hidden="true">🔔</span>
            <div>
              <strong>Có ${pendingList.length} yêu cầu vô hiệu hóa thẻ cần Admin xử lý gấp</strong>
              <p>Lễ tân đã ghi nhận yêu cầu khóa thẻ từ khách hàng (báo mất thẻ, nghi ngờ lộ thông tin). Vui lòng duyệt kịp thời để bảo vệ điểm của hội viên.</p>
            </div>
          </div>
          <div class="membership-alert-cards">
            ${pendingList
              .map((c) => {
                const cust = (d.customers || []).find((x) => x.id === c.customerId);
                return `<article class="membership-alert-item">
                  <div class="alert-item-meta">
                    <b>${E(c.id)}</b> · <span>${E(cust?.name || c.customerId)}</span>
                    <small>Lý do: <em>"${E(c.disableRequest.reason || "")}"</em> (gửi bởi <b>${E(c.disableRequest.requestedBy)}</b> lúc ${E(ctx.date(c.disableRequest.requestedAt))})</small>
                  </div>
                  <div class="alert-item-actions">
                    <button type="button" class="small customer-danger" data-membership-approve="${E(c.id)}">Duyệt khóa thẻ ngay</button>
                    <button type="button" class="small" data-membership-reject="${E(c.id)}">Từ chối</button>
                  </div>
                </article>`;
              })
              .join("")}
          </div>
        </section>`
      : "";
  const grid = table(cards, [
    [
      "Mã thẻ",
      (card) =>
        `<button type="button" class="membership-card-link" data-membership-view="${E(card.id)}"><strong>${E(card.id)}</strong><small>Cấp ${E(ctx.date(card.issuedAt))}</small></button>`,
    ],
    ["Khách hàng", (card) => E(name("customers", card.customerId))],
    [
      "Điểm / Hạng",
      (card) => {
        const tier = tierOf(card.points);
        return `<strong class="points">${E(Number(card.points || 0).toLocaleString("vi-VN"))}</strong><small>${E(tier.name)}${tier.percent ? ` (-${tier.percent}%)` : ""}</small>`;
      },
    ],
    [
      "Trạng thái",
      (card) => {
        if (!card.isActive) return badge("DISABLED");
        if (card.disableRequest && card.disableRequest.status === "PENDING") {
          return `<span class="badge PENDING" title="Chờ Admin duyệt (Lý do: ${E(card.disableRequest.reason || "")})">Chờ duyệt vô hiệu</span>`;
        }
        return badge("ACTIVE");
      },
    ],
    [
      "Thao tác",
      (card) => {
        if (!card.isActive) {
          return isAdminOrManager
            ? `<button type="button" class="small customer-success" data-membership-reactivate="${E(card.id)}" title="Khôi phục trạng thái hoạt động">Mở lại thẻ</button>`
            : `<span class="membership-disabled-label">Đã vô hiệu</span>`;
        }
        const hasPending =
          card.disableRequest && card.disableRequest.status === "PENDING";
        if (isReception) {
          if (hasPending) {
            return `<span class="membership-pending-tag" title="Đã gửi lúc ${E(ctx.date(card.disableRequest.requestedAt))}">⏳ Chờ duyệt</span>`;
          }
          return `<button type="button" class="small customer-warning" data-membership-request="${E(card.id)}">Yêu cầu vô hiệu</button>`;
        }
        if (isAdminOrManager) {
          if (hasPending) {
            return `<div class="membership-action-group">
              <button type="button" class="small customer-danger" data-membership-approve="${E(card.id)}" title="Duyệt vô hiệu: ${E(card.disableRequest.reason || "")}">Duyệt vô hiệu</button>
              <button type="button" class="small" data-membership-reject="${E(card.id)}" title="Từ chối yêu cầu">Từ chối</button>
            </div>`;
          }
          return `<button type="button" class="small customer-danger" data-membership-disable="${E(card.id)}">Vô hiệu hóa</button>`;
        }
        return "";
      },
    ],
  ]);
  const pendingAlert =
    selected &&
    selected.disableRequest &&
    selected.disableRequest.status === "PENDING"
      ? `<div class="membership-pending-alert">
          <strong>⏳ Yêu cầu vô hiệu hóa đang chờ duyệt</strong>
          <p>Lý do: <em>"${E(selected.disableRequest.reason)}"</em></p>
          <small>Gửi bởi: <b>${E(selected.disableRequest.requestedBy)}</b> (${E(selected.disableRequest.requesterRole)}) lúc ${E(ctx.date(selected.disableRequest.requestedAt))}</small>
        </div>`
      : "";
  const detailActions = [
    customer ? btn("Sửa hồ sơ khách", "customer.edit", customer.id) : "",
    selected?.isActive &&
    selected?.disableRequest?.status === "PENDING" &&
    isAdminOrManager
      ? `<button type="button" class="small customer-danger" data-membership-approve="${E(selected.id)}">Duyệt vô hiệu</button><button type="button" class="small" data-membership-reject="${E(selected.id)}">Từ chối</button>`
      : "",
    selected?.isActive && !selected?.disableRequest && isAdminOrManager
      ? `<button type="button" class="small customer-danger" data-membership-disable="${E(selected.id)}">Vô hiệu hóa thẻ</button>`
      : "",
    !selected?.isActive && isAdminOrManager
      ? `<button type="button" class="small customer-success" data-membership-reactivate="${E(selected.id)}">Mở lại thẻ thành viên</button>`
      : "",
    selected?.isActive && !selected?.disableRequest && isReception
      ? `<button type="button" class="small customer-warning" data-membership-request="${E(selected.id)}">Yêu cầu vô hiệu</button>`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
  const detail = selected
    ? `<aside class="panel membership-detail" tabindex="-1" aria-live="polite">
        <div class="membership-detail-header"><div><span>CHI TIẾT THẺ</span><h3>${E(selected.id)}</h3></div>${badge(selected.isActive ? "ACTIVE" : "DISABLED")}</div>
        <dl class="membership-detail-facts"><div><dt>Khách hàng</dt><dd>${E(customer?.name || selected.customerId)}</dd></div><div><dt>Điện thoại</dt><dd>${E(customer?.phone || "—")}</dd></div><div><dt>Điểm & Hạng</dt><dd>${E(Number(selected.points || 0).toLocaleString("vi-VN"))} điểm · ${E(tierOf(selected.points).name)} (-${tierOf(selected.points).percent}%)</dd></div><div><dt>Ngày cấp</dt><dd>${E(ctx.date(selected.issuedAt))}</dd></div></dl>
        ${pendingAlert}
        <div class="membership-detail-actions">${detailActions}</div>
        <div class="membership-detail-ledger"><h4>Sổ điểm</h4>${ledger(ctx, selected)}</div>
      </aside>`
    : '<aside class="panel membership-detail" tabindex="-1"><p class="membership-ledger-state">Chưa có thẻ thành viên.</p></aside>';
  return `<section class="membership-staff"><div class="membership-staff-table">${bannerHtml}${grid}</div>${detail}</section>`;
}

function membershipPage(ctx) {
  requestLedger(ctx);
  return ctx.page === "mycard" ? myMembership(ctx) : staffMembership(ctx);
}

export default function createModule(ctx) {
  currentContext = ctx;
  const { field, opts, form, actionForm, command, toast, d, page } = ctx;
  return {
    render() {
      return ["cards", "mycard"].includes(page) ? membershipPage(ctx) : "";
    },
    async act(action, id) {
      if (action === "card.approveDisable") {
        const card = (d.cards || []).find((item) => String(item.id) === String(id));
        if (!card) return;
        const customer = (d.customers || []).find(
          (item) => item.id === card.customerId,
        );
        const req = card.disableRequest;
        return actionForm(
          "Duyệt vô hiệu hóa thẻ thành viên",
          [field("id", "", "hidden", card.id)],
          "card.approveDisable",
          `Phê duyệt yêu cầu vô hiệu hóa thẻ ${card.id} (${customer?.name || card.customerId}) do ${req?.requestedBy || "Lễ tân"} gửi với lý do: "${req?.reason || "Không có lý do"}". Thẻ sau khi duyệt sẽ ngưng hoạt động vĩnh viễn.`,
        );
      }
      if (action === "card.rejectDisable") {
        const card = (d.cards || []).find((item) => String(item.id) === String(id));
        if (!card) return;
        const customer = (d.customers || []).find(
          (item) => item.id === card.customerId,
        );
        return actionForm(
          "Từ chối yêu cầu vô hiệu hóa",
          [field("id", "", "hidden", card.id)],
          "card.rejectDisable",
          `Từ chối yêu cầu vô hiệu hóa thẻ ${card.id} (${customer?.name || card.customerId})? Thẻ sẽ tiếp tục duy trì trạng thái hoạt động bình thường.`,
        );
      }
      if (action === "card.reactivate") {
        const card = (d.cards || []).find((item) => String(item.id) === String(id));
        if (!card) return;
        const customer = (d.customers || []).find(
          (item) => item.id === card.customerId,
        );
        return actionForm(
          "Mở lại thẻ thành viên",
          [field("id", "", "hidden", card.id)],
          "card.reactivate",
          `Mở lại thẻ ${card.id} của khách hàng ${customer?.name || card.customerId}? Thẻ sẽ được khôi phục trạng thái hoạt động (ACTIVE) và khách hàng có thể tiếp tục sử dụng điểm tích lũy.`,
        );
      }
      if (action !== "card.new") return;
      const options = opts(
        "customers",
        (customer) =>
          customer.isActive &&
          !(d.cards || []).some((card) => card.customerId === customer.id),
      );
      if (!options.length) {
        toast("Mọi khách hàng đủ điều kiện đã có thẻ.");
        return;
      }
      form(
        "Cấp thẻ thành viên",
        [
          field(
            "customerId",
            "Khách hàng",
            "select",
            options.some(([value]) => value === id) ? id : options[0][0],
            options,
          ),
        ],
        async (body) => command("card.issue", body),
        "Cấp thẻ",
        "Mỗi khách chỉ được cấp một thẻ. Điểm bắt đầu từ 0 và chỉ tăng qua sổ điểm hóa đơn đã thanh toán.",
      );
    },
  };
}
