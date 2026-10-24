/** UI profile. TODO TV1: nhiệm vụ cụ thể trong docs/MODULES.md và PHAN_CONG_3_NGUOI.md. */
export default function createModule(ctx) {
  const { E, role, $, labels, btn, field, actionForm, d, page } = ctx;

  return {
    render() {
      let html = "";
      switch (page) {
        case "profile":
          html = `<div class="panel profile-panel"><div class="avatar large">${E($(".user-menu strong").textContent.slice(0, 1))}</div><h2>${E($(".user-menu strong").textContent)}</h2><p>${E(labels[role])}</p>${btn("Cập nhật hồ sơ", "profile.edit")}${btn("Đổi mật khẩu", "profile.password")}</div>`;
          break;
      }
      return html;
    },
    async act(action, id) {
      const hidden = () => field("id", "", "hidden", id);
      if (action === "profile.edit") {
        const c =
          d.customers?.find(
            (x) => x.accountId === document.body.dataset.userId,
          ) || {};
        return actionForm(
          "Cập nhật hồ sơ",
          [
            field(
              "name",
              "Họ tên",
              "text",
              c.name || $(".user-menu strong").textContent,
            ),
            field("phone", "Điện thoại", "tel", c.phone || d.me.phone),
            {
              ...field(
                "identityNo",
                "CCCD / Hộ chiếu",
                "text",
                c.identityNo || "",
              ),
              optional: true,
            },
            {
              ...field("address", "Địa chỉ", "textarea", c.address || ""),
              optional: true,
            },
          ],
          "profile.update",
        );
      }
      if (action === "profile.password")
        return actionForm(
          "Đổi mật khẩu",
          [
            field("oldPassword", "Mật khẩu hiện tại", "password"),
            field("newPassword", "Mật khẩu mới", "password"),
            field("confirmPassword", "Nhập lại mật khẩu mới", "password"),
          ],
          "profile.password",
        );
    },
  };
}
