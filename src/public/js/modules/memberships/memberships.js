/** UI memberships. TODO TV1: nhiệm vụ cụ thể trong docs/MODULES.md và PHAN_CONG_3_NGUOI.md. */
export default function createModule(ctx) {
  const { E, name, badge, btn, field, opts, actionForm, table, d, page } = ctx;

  return {
    render() {
      let html = "";
      switch (page) {
        case "cards":
        case "mycard":
          html = table(d.cards, [
            ["Mã thẻ", (r) => `<strong>${E(r.id)}</strong>`],
            ["Khách hàng", (r) => E(name("customers", r.customerId))],
            [
              "Điểm tích lũy",
              (r) =>
                `<strong class="points">${Number(r.points).toLocaleString("vi-VN")}</strong>`,
            ],
            [
              "Hạng tham khảo",
              (r) =>
                r.points >= 1000
                  ? "Kim cương"
                  : r.points >= 500
                    ? "Vàng"
                    : r.points >= 100
                      ? "Bạc"
                      : "Thành viên",
            ],
            ["Trạng thái", (r) => badge(r.isActive ? "ACTIVE" : "DISABLED")],
            [
              "Thao tác",
              (r) =>
                page === "cards" && r.isActive
                  ? btn("Vô hiệu hóa", "card.disable", r.id)
                  : "",
            ],
          ]);
          break;
      }
      return html;
    },
    async act(action, id) {
      const hidden = () => field("id", "", "hidden", id);
      if (action === "card.new")
        return actionForm(
          "Cấp thẻ thành viên",
          [
            field(
              "customerId",
              "Khách hàng",
              "select",
              "",
              opts(
                "customers",
                (x) =>
                  x.isActive && !d.cards.some((c) => c.customerId === x.id),
              ),
            ),
          ],
          "card.issue",
        );
    },
  };
}
