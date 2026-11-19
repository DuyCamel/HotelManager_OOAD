/** Tổng hợp dashboard chỉ đọc từ dữ liệu nghiệp vụ hiện có. */
const { allow } = require("../../core/auth/rbac");

const HOTEL_TIME_ZONE = process.env.APP_TIME_ZONE || "Asia/Ho_Chi_Minh";
const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: HOTEL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const dateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = Object.fromEntries(
    dateFormatter.formatToParts(date).map(({ type, value: part }) => [type, part]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
};
const timeOf = (value) => {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
};
const activeBooking = (booking) =>
  ["PENDING", "CONFIRMED", "CHECKED_IN"].includes(booking.status);

function buildAlerts(rooms, tasks, services, now) {
  const roomById = new Map(rooms.map((room) => [room.id, room]));
  const alerts = new Map();
  const add = (item) => {
    const key = `${item.type}:${item.roomId || item.objectId}`;
    const current = alerts.get(key);
    if (!current || (item.severity === "urgent" && current.severity !== "urgent"))
      alerts.set(key, item);
  };

  for (const task of tasks.filter((item) => item.status !== "DONE")) {
    const room = roomById.get(task.roomId);
    const deadline = timeOf(task.deadlineAt);
    const overdue = Boolean(deadline && deadline < now.getTime());
    const repair = task.status === "MAINTENANCE";
    add({
      type: repair ? "repair" : "cleaning",
      severity: repair || overdue ? "urgent" : "attention",
      roomId: task.roomId,
      roomName: room?.name || task.roomId,
      deadlineAt: task.deadlineAt || null,
      detail: repair
        ? room?.note || "Phòng đang được đánh dấu bảo trì."
        : overdue
          ? "Đã quá hạn hoàn tất công việc."
          : "Đang chờ hoàn tất công việc buồng phòng.",
    });
  }

  for (const room of rooms) {
    if (room.status === "MAINTENANCE")
      add({
        type: "repair",
        severity: "urgent",
        roomId: room.id,
        roomName: room.name || room.id,
        deadlineAt: null,
        detail: room.note || "Phòng đang được đánh dấu bảo trì.",
      });
    if (room.status === "DIRTY")
      add({
        type: "cleaning",
        severity: "attention",
        roomId: room.id,
        roomName: room.name || room.id,
        deadlineAt: null,
        detail: "Phòng đang chờ dọn.",
      });
  }
  for (const service of services.filter((item) => !item.isActive))
    add({
      type: "service",
      severity: "attention",
      objectId: service.id,
      roomName: service.name || service.id,
      deadlineAt: null,
      detail: "Dịch vụ đang ngừng cung cấp; cần kiểm tra trước khi tư vấn khách.",
    });

  const items = [...alerts.values()].sort(
    (a, b) =>
      Number(b.severity === "urgent") - Number(a.severity === "urgent") ||
      timeOf(a.deadlineAt) - timeOf(b.deadlineAt) ||
      String(a.roomName).localeCompare(String(b.roomName), "vi"),
  );
  return {
    available: true,
    cleaning: items.filter((item) => item.type === "cleaning").length,
    repair: items.filter((item) => item.type === "repair").length,
    service: items.filter((item) => item.type === "service").length,
    urgent: items.filter((item) => item.severity === "urgent").length,
    items: items.slice(0, 8),
  };
}

function derivedOperations({ bookings, stays, invoices, usage }) {
  return [
    ...bookings.map((item) => ({
      at: item.createdAt,
      title: "Tạo đặt phòng",
      detail: item.id,
      kind: "booking",
    })),
    ...stays.flatMap((item) => [
      {
        at: item.checkInAt,
        title: "Nhận phòng",
        detail: item.id,
        kind: "stay",
      },
      ...(item.checkOutAt
        ? [
            {
              at: item.checkOutAt,
              title: "Trả phòng",
              detail: item.id,
              kind: "stay",
            },
          ]
        : []),
    ]),
    ...invoices.map((item) => ({
      at: item.issuedAt,
      title: item.status === "PAID" ? "Thanh toán hóa đơn" : "Lập hóa đơn",
      detail: item.id,
      kind: "invoice",
    })),
    ...usage.map((item) => ({
      at: item.usedAt,
      title: item.isVoided ? "Hủy dịch vụ" : "Ghi nhận dịch vụ",
      detail: item.stayId,
      kind: "service",
    })),
  ]
    .filter((item) => timeOf(item.at))
    .sort((a, b) => timeOf(b.at) - timeOf(a.at))
    .slice(0, 8);
}

module.exports = (repo) => ({
  async list(user) {
    allow(user, "reports");
    const keys = [
      "rooms",
      "services",
      "bookings",
      "stays",
      "invoices",
      "usage",
      "tasks",
    ];
    const data = Object.fromEntries(
      await Promise.all(keys.map(async (key) => [key, await repo.list(key)])),
    );
    const now = new Date();
    const today = dateKey(now);
    const roomCount = (status) =>
      data.rooms.filter((room) => room.status === status).length;
    const arrivals = data.bookings.filter(
      (booking) =>
        dateKey(booking.startAt) === today &&
        ["CONFIRMED", "CHECKED_IN"].includes(booking.status),
    ).length;
    const departures = data.bookings.filter(
      (booking) =>
        dateKey(booking.endAt) === today &&
        ["CHECKED_IN", "COMPLETED"].includes(booking.status),
    ).length;

    return {
      generatedAt: now.toISOString(),
      timeZone: HOTEL_TIME_ZONE,
      rooms: {
        available: true,
        total: data.rooms.length,
        availableRooms: roomCount("AVAILABLE"),
        occupied: roomCount("OCCUPIED"),
        dirty: roomCount("DIRTY"),
        maintenance: roomCount("MAINTENANCE"),
        disabled: roomCount("DISABLED"),
      },
      services: {
        available: true,
        total: data.services.length,
        active: data.services.filter((service) => service.isActive).length,
      },
      today: {
        bookingsAvailable: true,
        invoicesAvailable: true,
        arrivals,
        departures,
        unpaidBookings: data.bookings.filter(
          (booking) => booking.status === "PENDING",
        ).length,
        activeBookings: data.bookings.filter(activeBooking).length,
        unpaidInvoices: data.invoices.filter(
          (invoice) => invoice.status !== "PAID",
        ).length,
      },
      alerts: buildAlerts(data.rooms, data.tasks, data.services, now),
      recent: { available: true, items: derivedOperations(data) },
    };
  },
});
