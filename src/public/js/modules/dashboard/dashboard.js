/** UI dashboard. TODO TV3: nhiệm vụ cụ thể trong docs/MODULES.md và PHAN_CONG_3_NGUOI.md. */
export default function createModule(ctx) {
  const { btn, field, stats, d, page } = ctx;

  return {
    render() {
      let html = "";
      switch (page) {
        case "overview":
          html =
            stats() +
            `<div class="overview-grid"><div class="panel welcome-card"><span class="eyebrow">OPERATIONS AT A GLANCE</span><h2>Chào ngày mới,<br>chúc một ca làm việc tốt.</h2><p>Hôm nay có ${d.bookings.filter((b) => b.startAt.slice(0, 10) === new Date().toISOString().slice(0, 10) && b.status === "CONFIRMED").length} phiếu dự kiến nhận phòng.</p>${btn("Xem sơ đồ phòng →", "go.board", "", "primary")}</div><div class="panel"><h3>Phiếu cần xác nhận cọc</h3><strong class="big-number">${d.bookings.filter((b) => b.status === "PENDING").length}</strong><p class="muted">Tự hết hạn sau 30 phút nếu chưa cọc.</p>${btn("Mở đặt phòng", "go.bookings")}</div></div>`;
          break;
      }
      return html;
    },
    async act(action, id) {
      const hidden = () => field("id", "", "hidden", id);
    },
  };
}
