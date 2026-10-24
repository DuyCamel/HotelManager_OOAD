/** UI audit. TODO TV1: nhiệm vụ cụ thể trong docs/MODULES.md và PHAN_CONG_3_NGUOI.md. */
export default function createModule(ctx) {
  const { E, date, field, d, page } = ctx;

  return {
    render() {
      let html = "";
      switch (page) {
        case "audit":
          html = `<h3>Nhật ký gần nhất (tối đa 500)</h3><div class="panel table-scroll"><table><thead><tr><th>Thời gian</th><th>Người thao tác</th><th>Hành động</th><th>Đối tượng</th></tr></thead><tbody>${d.audit
            .slice(0, 100)
            .map(
              (a) =>
                `<tr><td>${date(a.eventAt)}</td><td>${E(d.accounts.find((x) => x.id === a.actorId)?.email || a.actorId || "Hệ thống")}</td><td>${E(a.action)}</td><td>${E(a.objectId)}<small>${E(a.detail)}</small></td></tr>`,
            )
            .join("")}</tbody></table></div>`;
          break;
      }
      return html;
    },
    async act(action, id) {
      const hidden = () => field("id", "", "hidden", id);
    },
  };
}
