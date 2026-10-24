/** UI housekeeping. TODO TV3: nhiệm vụ cụ thể trong docs/MODULES.md và PHAN_CONG_3_NGUOI.md. */
export default function createModule(ctx) {
  const {
    E,
    clean,
    $,
    labels,
    name,
    date,
    badge,
    btn,
    field,
    toast,
    form,
    stats,
    refresh,
    d,
    page,
  } = ctx;
  function board() {
    const status = $("#room-filter")?.value || "";
    return (
      stats() +
      `<div class="panel board-panel"><div class="section-title"><h3>Trạng thái phòng</h3><select id="room-filter"><option value="">Tất cả trạng thái</option>${["AVAILABLE", "OCCUPIED", "DIRTY", "MAINTENANCE", "DISABLED"].map((x) => `<option ${status === x ? "selected" : ""} value="${x}">${labels[x]}</option>`).join("")}</select></div><div class="room-legend">${["AVAILABLE", "OCCUPIED", "DIRTY", "MAINTENANCE", "DISABLED"].map((x) => badge(x)).join("")}</div><div class="room-grid">${d.rooms
        .filter((r) => !status || r.status === status)
        .map(
          (r) =>
            `<button class="room-tile ${r.status}" data-action="room.detail" data-id="${E(r.id)}"><span class="room-number">${E(r.name)}</span><span>${E(name("types", r.typeId))}</span><small>${labels[r.status]}</small><b>↗</b></button>`,
        )
        .join("")}</div></div>`
    );
  }
  return {
    render() {
      let html = "";
      switch (page) {
        case "board":
          html = board();
          break;
      }
      return html;
    },
    async act(action, id) {
      const hidden = () => field("id", "", "hidden", id);
      if (action === "room.detail") {
        const r = d.rooms.find((x) => x.id === id);
        const task = d.tasks?.find(
          (t) => t.roomId === id && t.status !== "DONE",
        );
        const overdue = task && Date.parse(task.deadlineAt) < Date.now();
        form(
          r.name,
          [
            field("status", "Trạng thái", "text", labels[r.status]),
            field("type", "Loại phòng", "text", name("types", r.typeId)),
            field("note", "Ghi chú", "textarea", r.note),
          ],
          async () => {},
          "Đóng",
          task
            ? `Hạn dọn: ${date(task.deadlineAt)}${overdue ? " — QUÁ HẠN" : ""}`
            : "",
        );
        document
          .querySelectorAll("#dialog-fields input, #dialog-fields textarea")
          .forEach((input) => {
            input.readOnly = true;
            input.required = false;
          });
        for (const damage of (d.damages || []).filter((x) => x.roomId === id)) {
          $("#dialog-fields").insertAdjacentHTML(
            "beforeend",
            `<p class="form-note">${E(damage.description)} <a target="_blank" rel="noopener" href="/damage-photo/${encodeURIComponent(damage.id)}">Xem ảnh hiện trạng ↗</a></p>`,
          );
        }
        if (clean && ["DIRTY", "MAINTENANCE"].includes(r.status)) {
          $("#dialog-fields").insertAdjacentHTML(
            "beforeend",
            btn("Xác nhận đã dọn sạch", "room.clean", id) +
              btn("Báo hỏng + ảnh", "room.damage", id),
          );
        }
        return;
      }
      if (action === "room.damage") {
        $("#editor").close();
        form(
          "Báo hỏng phòng",
          [hidden(), field("description", "Mô tả hư hỏng", "textarea")],
          async (b) => {
            const file = $("#damage-photo").files[0];
            if (!file) throw new Error("Chọn ảnh JPG/PNG.");
            const fd = new FormData();
            fd.append("photo", file);
            fd.append("id", id);
            fd.append("description", b.description);
            const res = await fetch("/api/damage", {
              method: "POST",
              headers: { "X-CSRF-Token": $('meta[name="csrf-token"]').content },
              body: fd,
            });
            const r = await res.json();
            if (!res.ok) throw new Error(r.error);
            await refresh();
            toast("Đã ghi nhận hư hỏng.");
          },
        );
        $("#dialog-fields").insertAdjacentHTML(
          "beforeend",
          '<label>Ảnh hiện trạng (JPG/PNG, tối đa 3 MB)<input id="damage-photo" type="file" accept="image/png,image/jpeg" required></label>',
        );
        return;
      }
    },
    board,
  };
}
