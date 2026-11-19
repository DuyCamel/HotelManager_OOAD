/** Hotel identity and transparent manual-payment settings. */
function renderSettings(ctx) {
  const { E, d, btn } = ctx;
  const settings = d.settings?.[0];
  if (!settings)
    return '<div class="admin-callout error"><strong>Thiếu cấu hình khách sạn</strong><p>Database cần đúng một dòng HotelSetting.</p></div>';
  const bankConfigured = Boolean(
    settings.bankCode && settings.bankAccount && settings.bankOwner,
  );
  return `<div class="admin-shell settings-admin">
    <section class="settings-hero panel admin-card">
      <div><span class="eyebrow">THƯƠNG HIỆU & LIÊN HỆ</span><h2>${E(settings.hotelName)}</h2><p>${E(settings.address)}</p><a href="tel:${E(settings.hotline)}">${E(settings.hotline)}</a></div>
      ${btn("Chỉnh sửa cấu hình", "system.edit", "", "primary")}
    </section>
    <section class="settings-grid">
      <article class="panel admin-card settings-policy">
        <div class="admin-card-heading"><div><span class="eyebrow">VẬN HÀNH</span><h2>Khung giờ cố định</h2></div></div>
        <dl class="admin-definition-list">
          <div><dt>Nhận phòng chuẩn</dt><dd>${E(settings.checkInTime || "14:00:00")}</dd></div>
          <div><dt>Trả phòng chuẩn</dt><dd>${E(settings.checkOutTime || "12:00:00")}</dd></div>
          <div><dt>Hạn nhận phòng trong ngày</dt><dd>${E(settings.noShowTime || "22:00:00")}</dd></div>
          <div><dt>Mốc phụ thu lưu</dt><dd>${E(settings.lateFeeFrom)} · ${E(settings.lateFeePercent)}%</dd></div>
        </dl>
        <p class="admin-data-note">Nhận phòng, trả phòng và hạn nhận phòng trong ngày được đọc từ APP_CHECK_IN_TIME, APP_CHECK_OUT_TIME và APP_NO_SHOW_TIME trong .env khi máy chủ khởi động. Đổi giá trị rồi khởi động lại để thử giờ khác. Khung giữa giờ trả và nhận phòng dành cho buồng phòng. Mốc và tỷ lệ phụ thu đang được lưu để tham chiếu; hệ thống hiện chưa tự động áp khoản phụ thu này.</p>
      </article>
      <article class="panel admin-card payment-settings ${bankConfigured ? "configured" : "empty"}">
        <div class="admin-card-heading"><div><span class="eyebrow">THANH TOÁN CHUYỂN KHOẢN</span><h2>${bankConfigured ? "Hướng dẫn đang hiển thị" : "Chưa cấu hình"}</h2></div><span class="admin-status-dot">${bankConfigured ? "Đủ thông tin" : "Thiếu thông tin"}</span></div>
        ${
          bankConfigured
            ? `<div class="payment-instructions"><div><dl class="admin-definition-list"><div><dt>Ngân hàng</dt><dd>${E(settings.bankCode)}</dd></div><div><dt>Số tài khoản</dt><dd>${E(settings.bankAccount)}</dd></div><div><dt>Chủ tài khoản</dt><dd>${E(settings.bankOwner)}</dd></div></dl></div>${settings.qrImagePath ? `<figure><img src="${E(settings.qrImagePath)}" alt="QR chuyển khoản ${E(settings.bankCode)}"><figcaption>Ảnh QR nội bộ</figcaption></figure>` : '<div class="qr-placeholder">Chưa có ảnh QR</div>'}</div>`
            : '<p class="empty">Nhập đủ ngân hàng, số tài khoản và chủ tài khoản để xuất bản hướng dẫn chuyển khoản.</p>'
        }
      </article>
    </section>
    <section class="admin-callout warning manual-payment-note"><strong>Thanh toán được xác nhận thủ công</strong><p>Thông tin ngân hàng và QR chỉ là hướng dẫn chuyển khoản. Ứng dụng không kết nối ngân hàng, không tự kiểm tra nội dung chuyển khoản và không tự đánh dấu đã thanh toán. Nhân viên phải đối soát giao dịch rồi ghi nhận cọc hoặc thanh toán trong đúng nghiệp vụ.</p></section>
  </div>`;
}

export default function createModule(ctx) {
  return {
    render() {
      return ["system", "settings"].includes(ctx.page)
        ? renderSettings(ctx)
        : "";
    },
    async act(action) {
      if (action !== "system.edit") return;
      const settings = ctx.d.settings?.[0];
      if (!settings) return;
      const optional = (key, title, type = "text", value = "") => {
        const result = ctx.field(key, title, type, value || "");
        result.optional = true;
        return result;
      };
      return ctx.actionForm(
        "Cấu hình khách sạn",
        [
          ctx.field("hotelName", "Tên khách sạn", "text", settings.hotelName),
          ctx.field("address", "Địa chỉ", "text", settings.address),
          ctx.field("hotline", "Hotline", "tel", settings.hotline),
          ctx.field(
            "lateFeeFrom",
            "Mốc phụ thu trễ (tham chiếu)",
            "time",
            settings.lateFeeFrom,
          ),
          ctx.field(
            "lateFeePercent",
            "Phụ thu trễ % (tham chiếu)",
            "number",
            settings.lateFeePercent,
          ),
          optional("bankCode", "Mã/tên ngân hàng", "text", settings.bankCode),
          optional(
            "bankAccount",
            "Số tài khoản",
            "text",
            settings.bankAccount,
          ),
          optional("bankOwner", "Chủ tài khoản", "text", settings.bankOwner),
          optional(
            "qrImagePath",
            "Ảnh QR nội bộ (/assets/...png)",
            "text",
            settings.qrImagePath,
          ),
        ],
        "system.settings",
        "Thông tin chuyển khoản phải điền đủ cả ba trường hoặc để trống cả ba. QR không xác nhận thanh toán tự động.",
      );
    },
  };
}
