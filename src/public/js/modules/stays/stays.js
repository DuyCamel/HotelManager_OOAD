/** UI stays. TODO TV2: nhiệm vụ cụ thể trong docs/MODULES.md và PHAN_CONG_3_NGUOI.md. */
export default function createModule(ctx) {
  const { money, E, name, date, btn, field, opts, actionForm, table, d, page } =
    ctx;

  return {
    render() {
      let html = "";
      switch (page) {
        case "stays":
          html = table(
            d.stays.filter((x) => !x.checkOutAt),
            [
              [
                "Phiếu / Khách",
                (r) =>
                  `<strong>${E(r.id)}</strong><small>${E(name("customers", d.bookings.find((b) => b.id === r.bookingId)?.customerId))}</small>`,
              ],
              ["Phòng", (r) => E(name("rooms", r.roomId))],
              ["Giờ nhận", (r) => date(r.checkInAt)],
              ["Tiền phòng", (r) => money(r.roomCharge + r.surcharge)],
              [
                "Thao tác",
                (r) =>
                  btn("Đổi phòng", "stay.move", r.id) +
                  btn("Dịch vụ", "usage.stay", r.id) +
                  btn("Trả phòng", "stay.checkout", r.id, "accent"),
              ],
            ],
          );
          break;
      }
      return html;
    },
    async act(action, id) {
      const hidden = () => field("id", "", "hidden", id);
      if (action === "stay.checkin")
        return actionForm(
          "Nhận phòng",
          [hidden(), field("identityNo", "CCCD / Hộ chiếu khách lưu trú")],
          action,
          "Chỉ nhận trong khoảng lưu trú và phòng đã sẵn sàng.",
        );
      if (action === "stay.move")
        return actionForm(
          "Đổi phòng",
          [
            hidden(),
            field(
              "roomId",
              "Phòng mới",
              "select",
              "",
              opts("rooms", (x) => x.status === "AVAILABLE"),
            ),
          ],
          action,
          "Phòng cũ chuyển Cần dọn. Phụ thu bằng chênh lệch giá dương của thời gian còn lại.",
        );
    },
  };
}
