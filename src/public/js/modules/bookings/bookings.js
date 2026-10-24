/** UI bookings. TODO TV2: nhiệm vụ cụ thể trong docs/MODULES.md và PHAN_CONG_3_NGUOI.md. */
export default function createModule(ctx) {
  const {
    money,
    E,
    role,
    name,
    date,
    badge,
    btn,
    field,
    opts,
    command,
    form,
    actionForm,
    table,
    d,
    page,
  } = ctx;
  function bookingTable(rows) {
    return table([...rows].reverse(), [
      [
        "Mã / Khách",
        (r) =>
          `<strong>${E(r.id)}</strong><small>${E(name("customers", r.customerId))}</small>`,
      ],
      ["Phòng", (r) => E(name("rooms", r.roomId))],
      [
        "Lịch lưu trú",
        (r) =>
          `${date(r.startAt)}<small>→ ${date(r.endAt)} · ${r.guests} khách</small>`,
      ],
      [
        "Tiền phòng / Cọc",
        (r) => `${money(r.roomCharge)}<small>Cọc ${money(r.deposit)}</small>`,
      ],
      ["Trạng thái", (r) => badge(r.status)],
      [
        "Thao tác",
        (r) =>
          (r.status === "PENDING"
            ? btn("Hủy", "booking.cancel", r.id) +
              (role !== "CUSTOMER"
                ? btn("Xác nhận cọc", "booking.deposit", r.id)
                : "")
            : "") +
          (r.status === "CONFIRMED" && role !== "CUSTOMER"
            ? btn("Nhận phòng", "stay.checkin", r.id)
            : ""),
      ],
    ]);
  }
  return {
    render() {
      let html = "";
      switch (page) {
        case "bookings":
        case "mybookings":
          html = bookingTable(d.bookings);
          break;
        case "search":
          html = `<div class="panel"><form id="search-form" class="search-form"><label>Ngày nhận phòng<input name="startAt" type="date" required></label><label>Ngày trả phòng (12:00)<input name="endAt" type="date" required></label><label>Số khách<input name="guests" type="number" min="1" max="20" value="2" required></label><button class="primary">Tìm phòng ↗</button></form></div><div id="available-results" class="search-cards"></div>`;
          break;
      }
      return html;
    },
    async act(action, id) {
      const hidden = () => field("id", "", "hidden", id);
      if (action === "booking.new") {
        const local = (t) =>
          new Date(t - new Date().getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
        form(
          "Đặt phòng tại quầy",
          [
            field(
              "customerId",
              "Khách hàng",
              "select",
              "",
              opts("customers", (x) => x.isActive),
            ),
            field(
              "roomId",
              "Phòng (server kiểm tra lịch trùng)",
              "select",
              "",
              opts(
                "rooms",
                (r) => !["MAINTENANCE", "DISABLED"].includes(r.status),
              ),
            ),
            field(
              "startAt",
              "Ngày nhận phòng",
              "date",
              local(Date.now()).slice(0, 10),
            ),
            field(
              "endAt",
              "Ngày trả phòng (12:00)",
              "date",
              local(Date.now() + 86400000).slice(0, 10),
            ),
            field("guests", "Số khách", "number", 1),
            field("deposit", "Cọc tiền mặt", "number", 100000),
          ],
          async (b) => {
            await command("booking.create", b);
          },
          "Tạo phiếu",
          "Tiền phòng tính theo ngày. Phòng phải sẵn sàng trước khi nhận.",
        );
        return;
      }
      if (action === "booking.deposit")
        return actionForm(
          "Xác nhận đã nhận cọc",
          [
            hidden(),
            field("amount", "Số tiền thực nhận", "number", 100000),
            field("method", "Phương thức", "select", "CASH", [
              ["CASH", "Tiền mặt"],
              ["TRANSFER", "Chuyển khoản"],
              ["CARD", "Thẻ"],
            ]),
          ],
          action,
          "Xác nhận thủ công sau khi kiểm tra tiền đã nhận. Chưa kết nối ngân hàng.",
        );
    },
    bookingTable,
  };
}
