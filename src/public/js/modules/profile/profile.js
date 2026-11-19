function tierOf(points) {
  const pts = Math.max(0, Math.floor(Number(points) || 0));
  if (pts >= 1000) return { name: "Kim cương", percent: 15 };
  if (pts >= 500) return { name: "Vàng", percent: 10 };
  if (pts >= 100) return { name: "Bạc", percent: 5 };
  return { name: "Thành viên", percent: 0 };
}

function profilePage(ctx) {
  const { E, role, labels, btn, d } = ctx;
  const me = d.me || {};
  const customer = (d.customers || []).find(
    (item) => item.accountId === me.id,
  );
  const cards = customer
    ? (d.cards || []).filter((item) => item.customerId === customer.id)
    : [];
  const card = cards[0];
  const tier = tierOf(card?.points);
  const bookings = customer
    ? (d.bookings || []).filter((item) => item.customerId === customer.id)
    : [];
  const paidInvoices = role === "CUSTOMER"
    ? (d.invoices || []).filter((item) => item.status === "PAID")
    : [];
  const customerLinks =
    role === "CUSTOMER"
      ? `<nav class="profile-links" aria-label="Lối tắt tài khoản khách">
          <a href="/app/search"><span>⌕</span><strong>Tìm phòng</strong><small>Chọn kỳ nghỉ tiếp theo</small></a>
          <a href="/app/mybookings"><span>▤</span><strong>Đặt phòng</strong><small>${bookings.length} phiếu của bạn</small></a>
          <a href="/portal/invoices"><span>▧</span><strong>Hóa đơn</strong><small>${paidInvoices.length} hóa đơn đã thanh toán</small></a>
          <a href="/app/mycard"><span>◇</span><strong>Thẻ thành viên</strong><small>${card ? `${E(Number(card.points || 0).toLocaleString("vi-VN"))} điểm · Hạng ${E(tier.name)} (-${tier.percent}%)` : "Chưa được cấp thẻ"}</small></a>
        </nav>`
      : "";
  const customerFacts = customer
    ? `<dl class="profile-facts">
        <div><dt>CCCD / Hộ chiếu</dt><dd>${E(customer.identityNo || "Chưa bổ sung")}</dd></div>
        <div><dt>Địa chỉ</dt><dd>${E(customer.address || "Chưa bổ sung")}</dd></div>
        <div><dt>Mã khách hàng</dt><dd>${E(customer.id)}</dd></div>
        <div><dt>Thẻ thành viên</dt><dd>${card ? `${E(card.id)} · Hạng ${E(tier.name)} (-${tier.percent}%) · ${card.isActive ? "Đang hoạt động" : "Đã vô hiệu hóa"}` : "Chưa có"}</dd></div>
      </dl>`
    : '<p class="profile-no-customer">Tài khoản nhân viên không gắn hồ sơ khách hàng.</p>';
  const customerStats =
    role === "CUSTOMER"
      ? `<div class="profile-stats" aria-label="Tóm tắt tài khoản">
          <div><strong>${bookings.length}</strong><span>Phiếu đặt</span></div>
          <div><strong>${paidInvoices.length}</strong><span>Hóa đơn đã thu</span></div>
          <div><strong class="points">${E(Number(card?.points || 0).toLocaleString("vi-VN"))}</strong><span>Điểm (${E(tier.name)} -${tier.percent}%)</span></div>
        </div>`
      : "";
  return `<section class="profile-shell">
    <article class="panel profile-identity-card">
      <div class="profile-glow" aria-hidden="true"></div>
      <div class="profile-monogram" aria-hidden="true">${E(String(me.name || "?").slice(0, 1))}</div>
      <span class="profile-role">${E(labels[role] || role)}</span>
      <h2>${E(me.name || "Tài khoản")}</h2>
      <p>${E(me.email || "")}</p>
      <div class="profile-actions">${btn("Cập nhật hồ sơ", "profile.edit", "", "primary")}${btn("Đổi mật khẩu", "profile.password")}</div>
    </article>
    <div class="profile-summary">
      ${customerStats}
      <article class="panel profile-contact-card">
        <div class="profile-section-title"><div><span>THÔNG TIN CÁ NHÂN</span><h3>Liên hệ và nhận diện</h3></div><button type="button" class="small" data-action="profile.edit">Chỉnh sửa</button></div>
        <dl class="profile-facts profile-contact-facts">
          <div><dt>Họ tên</dt><dd>${E(me.name || "—")}</dd></div>
          <div><dt>Điện thoại</dt><dd>${E(me.phone || "Chưa bổ sung")}</dd></div>
          <div><dt>Email đăng nhập</dt><dd>${E(me.email || "—")}</dd></div>
          <div><dt>Trạng thái</dt><dd>${me.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}</dd></div>
        </dl>
        ${customerFacts}
      </article>
      ${customerLinks}
    </div>
  </section>`;
}

function setProfileFormLimits() {
  const form = document.querySelector("#editor-form");
  const set = (name, values) => {
    const control = form?.elements.namedItem(name);
    if (control) Object.assign(control, values);
  };
  set("name", { maxLength: 120, autocomplete: "name" });
  set("phone", {
    maxLength: 15,
    inputMode: "tel",
    autocomplete: "tel",
    pattern: "\\+?[0-9]{9,14}",
  });
  set("identityNo", { maxLength: 30, autocomplete: "off" });
  set("address", { maxLength: 512, autocomplete: "street-address" });
  set("oldPassword", {
    minLength: 8,
    maxLength: 200,
    autocomplete: "current-password",
  });
  for (const name of ["newPassword", "confirmPassword"])
    set(name, {
      minLength: 8,
      maxLength: 200,
      autocomplete: "new-password",
    });
}

export default function createModule(ctx) {
  const { role, $, field, form, command, d, page } = ctx;
  return {
    render() {
      return page === "profile" ? profilePage(ctx) : "";
    },
    async act(action) {
      if (action === "profile.edit") {
        const customer = (d.customers || []).find(
          (item) => item.accountId === d.me.id,
        );
        const fields = [
          field("name", "Họ tên", "text", d.me.name || ""),
          field("phone", "Điện thoại", "tel", d.me.phone || ""),
        ];
        if (customer)
          fields.push(
            {
              ...field(
                "identityNo",
                "CCCD / Hộ chiếu",
                "text",
                customer.identityNo || "",
              ),
              optional: true,
            },
            {
              ...field(
                "address",
                "Địa chỉ",
                "textarea",
                customer.address || "",
              ),
              optional: true,
            },
          );
        form(
          "Cập nhật hồ sơ",
          fields,
          async (body) => {
            await command("profile.update", body);
            const topbarName = $(".user-menu strong");
            const avatar = $(".user-menu .avatar");
            if (topbarName) topbarName.textContent = body.name;
            if (avatar) avatar.textContent = body.name.slice(0, 1);
          },
          "Lưu thay đổi",
          role === "CUSTOMER"
            ? "Họ tên và điện thoại được cập nhật đồng thời trên tài khoản và hồ sơ khách."
            : "Email và vai trò không thay đổi tại đây.",
        );
        setProfileFormLimits();
      }
      if (action === "profile.password") {
        form(
          "Đổi mật khẩu",
          [
            field("oldPassword", "Mật khẩu hiện tại", "password"),
            field("newPassword", "Mật khẩu mới", "password"),
            field("confirmPassword", "Nhập lại mật khẩu mới", "password"),
          ],
          async (body) => command("profile.password", body),
          "Đổi mật khẩu",
          "Sau khi đổi thành công, mọi phiên dùng mật khẩu cũ sẽ hết hiệu lực.",
        );
        setProfileFormLimits();
      }
    },
  };
}
