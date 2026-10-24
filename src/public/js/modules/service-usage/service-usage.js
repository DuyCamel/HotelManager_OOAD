/** UI service-usage. TODO TV2: nhiệm vụ cụ thể trong docs/MODULES.md và PHAN_CONG_3_NGUOI.md. */
export default function createModule(ctx) {
  const {
    money,
    E,
    name,
    date,
    badge,
    btn,
    field,
    actionForm,
    table,
    d,
    page,
  } = ctx;

  return {
    render() {
      let html = "";
      switch (page) {
        case "usage":
          html =
            `<div class="usage-intro"><div><span class="eyebrow">GUEST EXPERIENCE</span><h2>Dịch vụ sử dụng</h2><p>Theo dõi dịch vụ phát sinh trong thời gian lưu trú và cập nhật bảng kê rõ ràng.</p></div>${btn("＋ Ghi dịch vụ", "usage.new", "", "primary")}</div>` +
            table([...d.usage].reverse(), [
              [
                "Phiếu / Dịch vụ",
                (r) =>
                  `<strong>${E(name("services", r.serviceId))}</strong><small>${E(r.stayId)}</small>`,
              ],
              ["Số lượng", (r) => r.quantity],
              [
                "Đơn giá / Tổng",
                (r) =>
                  money(r.unitPrice) +
                  `<small>${money(r.unitPrice * r.quantity)}</small>`,
              ],
              ["Ghi nhận", (r) => date(r.usedAt)],
              [
                "Trạng thái",
                (r) =>
                  r.isVoided
                    ? badge("CANCELLED")
                    : r.invoiceId
                      ? badge("PAID")
                      : badge("PENDING"),
              ],
              [
                "Thao tác",
                (r) =>
                  !r.isVoided && !r.invoiceId
                    ? btn("Hủy ghi nhận", "usage.void", r.id)
                    : "",
              ],
            ]);
          break;
      }
      return html;
    },
    async act(action, id) {
      const hidden = () => field("id", "", "hidden", id);
      if (action === "usage.new" || action === "usage.stay")
        return actionForm(
          "Ghi dịch vụ sử dụng",
          [
            field(
              "stayId",
              "Phiếu thuê",
              "select",
              action === "usage.stay" ? id : "",
              d.stays
                .filter((s) => !s.checkOutAt)
                .map((s) => [s.id, s.id + " · " + name("rooms", s.roomId)]),
            ),
            field(
              "serviceId",
              "Dịch vụ",
              "select",
              "",
              d.services
                .filter((s) => s.isActive)
                .map((s) => [s.id, s.name + " · " + money(s.price)]),
            ),
            field("quantity", "Số lượng", "number", 1),
          ],
          "usage.add",
        );
    },
  };
}
