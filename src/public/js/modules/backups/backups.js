/** UI backups. TODO TV1: nhiệm vụ cụ thể trong docs/MODULES.md và PHAN_CONG_3_NGUOI.md. */
export default function createModule(ctx) {
  const { E, date, btn, field, table, d, page } = ctx;

  return {
    render() {
      let html = "";
      switch (page) {
        case "backups":
          html =
            btn("Tạo bản sao lưu", "system.backup", "", "primary") +
            table(d.backups, [
              [
                "Mã / Thời gian",
                (r) => E(r.id) + `<small>${date(r.backupAt)}</small>`,
              ],
              ["Tệp", (r) => E(r.filePath)],
              ["Ghi chú", (r) => E(r.note)],
              ["Thao tác", (r) => btn("Khôi phục", "system.restore", r.id)],
            ]);
          break;
      }
      return html;
    },
    async act(action, id) {
      const hidden = () => field("id", "", "hidden", id);
    },
  };
}
