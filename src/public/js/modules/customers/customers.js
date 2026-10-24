/** UI customers. TODO TV1: nhiệm vụ cụ thể trong docs/MODULES.md và PHAN_CONG_3_NGUOI.md. */
export default function createModule(ctx) {
  const { E, catalog, badge, btn, field, actionForm, table, d, page } = ctx;

  return {
    render() {
      let html = "";
      switch (page) {
        case "customers":
          html = table(d.customers, [
            [
              "Họ tên",
              (r) => `<strong>${E(r.name)}</strong><small>${E(r.id)}</small>`,
            ],
            ["Liên hệ", (r) => `${E(r.phone)}<small>${E(r.address)}</small>`],
            ["Giấy tờ", (r) => E(r.identityNo || "Chưa bổ sung")],
            ["Trạng thái", (r) => badge(r.isActive ? "ACTIVE" : "DISABLED")],
            [
              "Thao tác",
              (r) =>
                (r.isActive ? btn("Sửa", "customer.edit", r.id) : "") +
                (catalog && r.isActive
                  ? btn("Lưu trữ", "customer.archive", r.id)
                  : ""),
            ],
          ]);
          break;
      }
      return html;
    },
    async act(action, id) {
      const hidden = () => field("id", "", "hidden", id);
      if (action === "customer.new" || action === "customer.edit") {
        const c = d.customers.find((x) => x.id === id) || {};
        return actionForm(
          "Hồ sơ khách hàng",
          [
            field("id", "", "hidden", c.id || ""),
            field("name", "Họ tên", "text", c.name),
            field("phone", "Điện thoại", "tel", c.phone),
            field("identityNo", "CCCD / Hộ chiếu", "text", c.identityNo),
            field("address", "Địa chỉ", "textarea", c.address),
          ],
          "customer.save",
        );
      }
    },
  };
}
