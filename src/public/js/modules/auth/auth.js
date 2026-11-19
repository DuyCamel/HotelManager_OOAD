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
        const postActionOptions = [
          ["ADMIN", "Chuyển thành tài khoản Admin"],
          ["LOCK", r.canLock ? "Khóa tài khoản" : `Khóa tài khoản (Không khả dụng - hiện có ${r.adminCount} Admin)`],
        ];
        const note = [
          `Mã OTP kiểm thử: ${r.demoCode}. Hết hạn sau 5 phút; tối đa 5 lần thử.`,
          `Số Admin hiện tại: ${r.adminCount}.`,
          r.canLock
            ? "Đủ điều kiện chọn Khóa hoặc Chuyển thành Admin (còn ít nhất 1 Admin sau khi chuyển)."
            : "Quy định bắt buộc: Phải có từ 2 Admin trở lên mới được phép khóa tài khoản để bảo đảm hệ thống luôn còn ít nhất 1 Admin.",
        ].join(" ");
        return actionForm(
          "Chuyển quyền Quản lý",
          [
            field("requestId", "", "hidden", r.requestId),
            field("targetId", "", "hidden", id),
            field("code", "Mã OTP"),
            field(
              "postAction",
              "Sau khi chuyển quyền, tài khoản Quản lý hiện tại sẽ",
              "select",
              "ADMIN",
              postActionOptions,
            ),
          ],
          "admin.transfer",
          note,
        );
      }
    },
  };
}
