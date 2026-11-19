/** Server-derived operational and financial reporting in the business time zone. */
const { allow } = require("../../core/auth/rbac");
const { ensure } = require("../../core/errors/AppError");
const v = require("../../core/validation/fields");
const config = require("../../config/env");
const { localDatePart } = require("../_shared/stayRules");

const DAY = 86400000;
const bookingStates = [
  "PENDING",
  "CONFIRMED",
  "CHECKED_IN",
  "COMPLETED",
  "CANCELLED",
];
const roomStates = [
  "AVAILABLE",
  "OCCUPIED",
  "DIRTY",
  "MAINTENANCE",
  "DISABLED",
];

const amount = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};
const dateValue = (date) => Date.parse(`${date}T00:00:00Z`);
const addDays = (date, days) =>
  new Date(dateValue(date) + days * DAY).toISOString().slice(0, 10);
const daysBetween = (from, to) =>
  Math.round((dateValue(to) - dateValue(from)) / DAY);
const businessDate = (value) => {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? localDatePart(parsed) : null;
};
const inRange = (value, from, to) => {
  const day = businessDate(value);
  return day !== null && day >= from && day <= to;
};
const countBy = (values, states, valueOf) =>
  states.map((status) => ({
    status,
    count: values.filter((row) => valueOf(row) === status).length,
  }));

function selectedRange(query = {}) {
  const today = localDatePart(new Date());
  const defaults = { from: `${today.slice(0, 8)}01`, to: today };
  const from = v.calendarDate(query.from || defaults.from, "Từ ngày");
  const to = v.calendarDate(query.to || defaults.to, "Đến ngày");
  ensure(from <= to, "Từ ngày phải trước hoặc bằng đến ngày.");
  ensure(daysBetween(from, to) <= 1095, "Khoảng báo cáo tối đa 3 năm.");
  return { from, to };
}

function invoiceRevenue(invoice) {
  return (
    amount(invoice.roomCharge) +
    amount(invoice.serviceCharge) +
    amount(invoice.surcharge) -
    amount(invoice.discount)
  );
}

function csvCell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

module.exports = (repo) => {
  async function report(user, query) {
    allow(user, "reports");
    const range = selectedRange(query);
    const [invoices, bookings, stays, history, usage, rooms, types] =
      await Promise.all([
      repo.list("invoices"),
      repo.list("bookings"),
      repo.list("stays"),
      repo.list("history"),
      repo.list("usage"),
      repo.list("rooms"),
      repo.list("types"),
      ]);

    const rangedInvoices = invoices.filter((row) =>
      inRange(row.issuedAt, range.from, range.to),
    );
    const paid = rangedInvoices.filter((row) => row.status === "PAID");
    const totals = paid.reduce(
      (result, row) => {
        result.room += amount(row.roomCharge);
        result.service += amount(row.serviceCharge);
        result.surcharge += amount(row.surcharge);
        result.discount += amount(row.discount);
        result.depositsApplied += amount(row.deposit);
        result.revenue += invoiceRevenue(row);
        return result;
      },
      {
        revenue: 0,
        room: 0,
        service: 0,
        surcharge: 0,
        discount: 0,
        depositsApplied: 0,
      },
    );

    const dailyMap = new Map();
    for (const row of paid) {
      const day = businessDate(row.issuedAt);
      const bucket = dailyMap.get(day) || {
        date: day,
        invoices: 0,
        room: 0,
        service: 0,
        surcharge: 0,
        discount: 0,
        revenue: 0,
      };
      bucket.invoices++;
      bucket.room += amount(row.roomCharge);
      bucket.service += amount(row.serviceCharge);
      bucket.surcharge += amount(row.surcharge);
      bucket.discount += amount(row.discount);
      bucket.revenue += invoiceRevenue(row);
      dailyMap.set(day, bucket);
    }
    const daily = [...dailyMap.values()].sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    const bookingRows = bookings.filter((row) => {
      const start = businessDate(row.startAt);
      const end = businessDate(row.endAt);
      return start && end && start <= range.to && end > range.from;
    });
    const sellableRooms = rooms.filter(
      (room) => !["DISABLED", "MAINTENANCE"].includes(room.status),
    );
    const roomIds = new Set(sellableRooms.map((room) => String(room.id)));
    const occupied = new Set();
    const occupiedStates = new Set(["CONFIRMED", "CHECKED_IN", "COMPLETED"]);
    const bookingsById = new Map(
      bookings.map((booking) => [String(booking.id), booking]),
    );
    const stayedBookingIds = new Set(
      stays.map((stay) => String(stay.bookingId)),
    );
    const addOccupiedRange = (roomId, startAt, endAt) => {
      if (!roomIds.has(String(roomId))) return;
      const start = businessDate(startAt);
      const end = businessDate(endAt);
      if (!start || !end) return;
      let day = start > range.from ? start : range.from;
      const exclusiveEnd = end < addDays(range.to, 1) ? end : addDays(range.to, 1);
      while (day < exclusiveEnd) {
        occupied.add(`${roomId}|${day}`);
        day = addDays(day, 1);
      }
    };
    for (const assignment of history) {
      const stay = stays.find(
        (item) => String(item.id) === String(assignment.stayId),
      );
      const booking = stay && bookingsById.get(String(stay.bookingId));
      if (!booking || !occupiedStates.has(booking.status)) continue;
      addOccupiedRange(
        assignment.roomId,
        assignment.fromAt,
        assignment.toAt || booking.endAt,
      );
    }
    for (const booking of bookingRows) {
      if (
        !occupiedStates.has(booking.status) ||
        stayedBookingIds.has(String(booking.id)) ||
        !roomIds.has(String(booking.roomId))
      )
        continue;
      addOccupiedRange(booking.roomId, booking.startAt, booking.endAt);
    }
    const reportDays = daysBetween(range.from, range.to) + 1;
    const availableRoomNights = sellableRooms.length * reportDays;

    const roomTypeRows = types.map((type) => {
      const ids = new Set(
        sellableRooms
          .filter((room) => String(room.typeId) === String(type.id))
          .map((room) => String(room.id)),
      );
      const roomNights = [...occupied].filter((key) =>
        ids.has(key.split("|")[0]),
      ).length;
      const capacity = ids.size * reportDays;
      return {
        id: type.id,
        name: type.name,
        rooms: ids.size,
        occupiedRoomNights: roomNights,
        occupancyRate: capacity ? (roomNights * 100) / capacity : 0,
      };
    });

    const usageRows = usage.filter((row) =>
      inRange(row.usedAt, range.from, range.to),
    );
    const serviceDimensions = ["RECORDED", "INVOICED", "VOIDED"].map(
      (status) => {
        const rows = usageRows.filter((row) => {
          const rowStatus = row.isVoided
            ? "VOIDED"
            : row.invoiceId
              ? "INVOICED"
              : "RECORDED";
          return rowStatus === status;
        });
        return {
          status,
          count: rows.length,
          amount: rows.reduce(
            (sum, row) =>
              sum +
              (row.isVoided
                ? 0
                : amount(row.quantity) * amount(row.unitPrice)),
            0,
          ),
        };
      },
    );

    const methodMap = new Map();
    for (const row of paid) {
      const method = row.method || "UNSPECIFIED";
      const bucket = methodMap.get(method) || {
        method,
        count: 0,
        revenue: 0,
      };
      bucket.count++;
      bucket.revenue += invoiceRevenue(row);
      methodMap.set(method, bucket);
    }

    return {
      generatedAt: new Date().toISOString(),
      timeZone: config.timeZone,
      range,
      totals: { ...totals, paidInvoices: paid.length },
      daily,
      invoiceStatuses: countBy(
        rangedInvoices,
        ["DRAFT", "PAID"],
        (row) => row.status,
      ),
      bookingStatuses: countBy(
        bookingRows,
        bookingStates,
        (row) => row.status,
      ),
      serviceStatuses: serviceDimensions,
      roomStatuses: countBy(rooms, roomStates, (row) => row.status),
      paymentMethods: [...methodMap.values()].sort((a, b) =>
        a.method.localeCompare(b.method),
      ),
      occupancy: {
        occupiedRoomNights: occupied.size,
        availableRoomNights,
        rate: availableRoomNights
          ? (occupied.size * 100) / availableRoomNights
          : 0,
        roomTypes: roomTypeRows,
        basis:
          "Công suất dùng các lượt đặt CONFIRMED/CHECKED_IN/COMPLETED và ảnh chụp phòng đang kinh doanh hiện tại.",
      },
    };
  }

  return {
    report,
    async csv(user, query) {
      const data = await report(user, query);
      const rows = [
        [
          "Ngày địa phương",
          "Hóa đơn đã thanh toán",
          "Tiền phòng",
          "Dịch vụ",
          "Phụ thu",
          "Giảm giá",
          "Doanh thu",
        ],
        ...data.daily.map((row) => [
          row.date,
          row.invoices,
          row.room,
          row.service,
          row.surcharge,
          row.discount,
          row.revenue,
        ]),
      ];
      return {
        filename: `bao-cao-${data.range.from}-${data.range.to}.csv`,
        content:
          "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n"),
      };
    },
  };
};
