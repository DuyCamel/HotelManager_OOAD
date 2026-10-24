/** UI settings. TODO TV1: nhiệm vụ cụ thể trong docs/MODULES.md và PHAN_CONG_3_NGUOI.md. */
export default function createModule(ctx) {
  const { E, btn, field, actionForm, d, page } = ctx;

  return {
    render() {
      let html = "";
      switch (page) {
        case "system":
        case "settings":
          html = `<div class="tabs">${btn("Cấu hình khách sạn", "system.edit")}</div><div class="panel settings-summary"><h3>${E(d.settings[0].hotelName)}</h3><p>${E(d.settings[0].address)} · ${E(d.settings[0].hotline)}</p><p>Nhận phòng: ngoài khung 12:00–14:00 · Trả phòng cố định: 12:00</p><p class="muted">Giá đặt phòng tính theo ngày. Khoảng 12:00–14:00 dành cho buồng phòng.</p></div>`;
          break;
      }
      return html;
    },
    async act(action, id) {
      const hidden = () => field("id", "", "hidden", id);
      if (action === "system.edit") {
        const s = d.settings[0];
        return actionForm(
          "Cấu hình khách sạn",
          [
            "hotelName",
            "address",
            "hotline",
            "lateFeeFrom",
            "lateFeePercent",
            "bankCode",
            "bankAccount",
            "bankOwner",
          ].map((k, i) =>
            field(
              k,
              [
                "Tên khách sạn",
                "Địa chỉ",
                "Hotline",
                "Mốc phụ thu trễ (chưa áp dụng)",
                "Phụ thu trễ % (chưa áp dụng)",
                "Mã ngân hàng",
                "Số tài khoản",
                "Chủ tài khoản",
              ][i],
              k === "lateFeePercent"
                ? "number"
                : ["lateFeeFrom"].includes(k)
                  ? "time"
                  : "text",
              s[k],
            ),
          ),
          "system.settings",
        );
      }
    },
  };
}
