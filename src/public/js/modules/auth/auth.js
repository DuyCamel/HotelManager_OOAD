/** UI auth. TODO TV1: nhiệm vụ cụ thể trong docs/MODULES.md và PHAN_CONG_3_NGUOI.md. */
export default function createModule(ctx) {
  const { api, field, actionForm, page } = ctx;

  return {
    render() {
      let html = "";
      switch (page) {
      }
      return html;
    },
    async act(action, id) {
      const hidden = () => field("id", "", "hidden", id);
      if (action === "admin.transfer") {
        const r = await api("/api/action/admin.challenge", { targetId: id });
        return actionForm(
          "Chuyển quyền Admin",
          [
            field("requestId", "", "hidden", r.requestId),
            field("code", "Mã OTP 6 chữ số"),
          ],
          "admin.transfer",
          `OTP DEMO LOCAL: ${r.demoCode}. Chưa gửi SMS thật. Hết hạn sau 5 phút; tối đa 5 lần thử. Admin hiện tại sẽ trở thành Quản lý và phải đăng nhập lại.`,
        );
      }
    },
  };
}
