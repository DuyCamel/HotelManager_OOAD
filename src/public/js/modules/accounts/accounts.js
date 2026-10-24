/** UI accounts. TODO TV1: nhiệm vụ cụ thể trong docs/MODULES.md và PHAN_CONG_3_NGUOI.md. */
export default function createModule(ctx) {
  const { E, admin, badge, btn, field, actionForm, table, d, page } = ctx;

  return {
    render() {
      let html = "";
      switch (page) {
        case "accounts":
          html = table(d.accounts, [
            [
              "Tài khoản",
              (r) =>
                `<strong>${E(r.name)}</strong><small>${E(r.email)}</small>`,
            ],
            ["Vai trò", (r) => badge(r.role)],
            ["Điện thoại", (r) => E(r.phone)],
            ["Trạng thái", (r) => badge(r.isActive ? "ACTIVE" : "DISABLED")],
            [
              "Thao tác",
              (r) =>
                (admin || r.role !== "ADMIN"
                  ? btn("Sửa", "account.edit", r.id)
                  : "") +
                (r.role !== "ADMIN"
                  ? btn(r.isActive ? "Khóa" : "Mở", "account.toggle", r.id)
                  : "") +
                (admin && !["ADMIN", "CUSTOMER"].includes(r.role)
                  ? btn("Phân quyền", "account.role", r.id)
                  : "") +
                (admin && r.role === "MANAGER" && r.isActive
                  ? btn("Chuyển Admin", "admin.transfer", r.id)
                  : ""),
            ],
          ]);
          break;
      }
      return html;
    },
    async act(action, id) {
      const hidden = () => field("id", "", "hidden", id);
      if (action === "account.new")
        return actionForm(
          "Tạo tài khoản nhân viên",
          [
            field("name", "Họ tên"),
            field("email", "Email", "email"),
            field("phone", "Điện thoại", "tel"),
            field("password", "Mật khẩu ban đầu", "password"),
            field("role", "Vai trò", "select", "RECEPTIONIST", [
              ["MANAGER", "Quản lý"],
              ["RECEPTIONIST", "Nhân viên"],
              ["HOUSEKEEPER", "Buồng phòng"],
            ]),
          ],
          "account.create",
        );
      if (action === "account.edit") {
        const a = d.accounts.find((x) => x.id === id);
        return actionForm(
          "Cập nhật tài khoản",
          [
            hidden(),
            field("name", "Họ tên", "text", a.name),
            field("email", "Email", "email", a.email),
            field("phone", "Điện thoại", "tel", a.phone),
          ],
          "account.update",
        );
      }
      if (action === "account.role")
        return actionForm(
          "Phân quyền nhân viên",
          [
            hidden(),
            field(
              "role",
              "Vai trò",
              "select",
              d.accounts.find((x) => x.id === id).role,
              [
                ["MANAGER", "Quản lý"],
                ["RECEPTIONIST", "Nhân viên"],
                ["HOUSEKEEPER", "Buồng phòng"],
              ],
            ),
          ],
          action,
        );
    },
  };
}
