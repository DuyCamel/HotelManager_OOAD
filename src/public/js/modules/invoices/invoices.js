/** UI invoices. TODO TV2: nhiệm vụ cụ thể trong docs/MODULES.md và PHAN_CONG_3_NGUOI.md. */
export default function createModule(ctx) {
  const {
    api,
    money,
    E,
    name,
    date,
    badge,
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
        case "invoices":
          html = table([...d.invoices].reverse(), [
            [
              "Hóa đơn",
              (r) =>
                `<strong>${E(r.id)}</strong><small>${date(r.issuedAt)}</small>`,
            ],
            ["Khách hàng", (r) => E(name("customers", r.customerId))],
            [
              "Tổng tiền",
              (r) =>
                money(
                  r.roomCharge + r.serviceCharge + r.surcharge - r.discount,
                ),
            ],
            ["Đã cọc", (r) => money(r.deposit)],
            ["Trạng thái", (r) => badge(r.status)],
            [
              "Chứng từ",
              (r) =>
                `<a class="small" target="_blank" rel="noopener" href="/api/invoice/${encodeURIComponent(r.id)}">Xem / In ↗</a>`,
            ],
          ]);
          break;
      }
      return html;
    },
    async act(action, id) {
      const hidden = () => field("id", "", "hidden", id);
      if (action === "stay.checkout") {
        const p = await api("/api/action/stay.preview", { id });
        return actionForm(
          "Bảng kê trả phòng",
          [
            hidden(),
            field("expectedDue", "", "hidden", p.due),
            field("method", "Phương thức thu", "select", "CASH", [
              ["CASH", "Tiền mặt"],
              ["TRANSFER", "Chuyển khoản"],
              ["CARD", "Thẻ"],
            ]),
          ],
          action,
          `Tiền phòng ${money(p.roomCharge)} · Dịch vụ ${money(p.serviceCharge)} · Phụ thu ${money(p.surcharge)} · Đã cọc ${money(p.deposit)}. CÒN THU: ${money(p.due)}. ${p.lines.map((l) => l.name + " × " + l.quantity).join("; ")}`,
        );
      }
    },
  };
}
