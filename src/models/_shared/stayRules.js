/**
 * TASK-BAN-GIAO (TODO) | Phụ trách: TV2 | Mã việc: B1, B2, B4, C1
 * Đây là việc còn lại/nghiệm thu, không phải mô tả tính năng đã hoàn tất.
 * Thống nhất ngày địa phương APP_TIME_ZONE, giờ chuẩn hóa, khung buồng phòng và giá theo ngày; sửa lỗi đặt hôm nay cùng bookingService.
 * Bàn giao ví dụ đầu vào/đầu ra giá và biên ngày cho TV3 đồng bộ fn_QuoteRoom/procedure SQL; không để hai nơi tính khác nhau.
 * Gia hạn/đổi phòng giữ lịch sử, chống trùng và hạn dọn 90 phút đã có.
 * Chi tiết, phụ thuộc và tiêu chí xong: docs/PHAN_CONG_3_NGUOI.md.
 */
/** Quy tắc thuần dùng chung trong transaction: thời gian, giá chốt và ghi nhật ký. */
const { ensure } = require("../../core/errors/AppError");
const v = require("../../core/validation/fields");
const config = require("../../config/env");

function noShowDeadline(b) {
  const start = Date.parse(b?.startAt);
  const end = Date.parse(b?.endAt);
  if (!Number.isFinite(start)) return Infinity;
  const localDate = localDatePart(b.startAt);
  const noShowTime = policyTime(config.noShowTime, "22:00:00");
  const cutoff = new Date(
    `${localDate}T${noShowTime}${localOffset(localDate, noShowTime)}`,
  ).getTime();
  return Number.isFinite(end) ? Math.min(cutoff, end) : cutoff;
}

function isExpiredPending(b, now = Date.now()) {
  return (
    b?.status === "PENDING" &&
    Number(b.deposit || 0) === 0 &&
    // A hold remains valid through its deadline; it expires immediately after.
    Date.parse(b.holdUntil) < now
  );
}

function isNoShowExpired(b, now = Date.now()) {
  return ["PENDING", "CONFIRMED"].includes(b?.status) && noShowDeadline(b) < now;
}

const active = (b, now = Date.now()) =>
  ["PENDING", "CONFIRMED", "CHECKED_IN"].includes(b?.status) &&
  !isExpiredPending(b, now) &&
  !isNoShowExpired(b, now);

async function audit(tx, user, action, objectType, objectId, detail = "") {
  await tx.insert("audit", {
    eventAt: new Date().toISOString(),
    actorId: user?.id || null,
    action,
    objectType,
    objectId: String(objectId),
    detail,
  });
}
async function expire(tx) {
  const now = Date.now();
  for (const b of await tx.list("bookings"))
    if (isExpiredPending(b, now)) {
      await tx.update("bookings", b.id, { status: "CANCELLED" });
      await audit(tx, null, "Tự hủy phiếu chưa cọc", "BOOKING", b.id);
    } else if (isNoShowExpired(b, now)) {
      await tx.update("bookings", b.id, { status: "CANCELLED" });
      await audit(
        tx,
        null,
        b.status === "CONFIRMED"
          ? "Tự hủy quá hạn nhận phòng (giữ cọc)"
          : "Tự hủy giữ chỗ sau giờ nhận phòng",
        "BOOKING",
        b.id,
        b.status === "CONFIRMED"
          ? `Cọc không hoàn=${Number(b.deposit || 0)}`
          : "",
      );
    }
}
async function available(tx, roomId, startAt, endAt, exclude = "") {
  const r = await tx.find("rooms", roomId);
  if (!r || ["MAINTENANCE", "DISABLED"].includes(r.status)) return false;
  const bookings = await tx.list("bookings");
  const history = await tx.list("history");
  const stays = await tx.list("stays");
  const openRoomByStay = new Map(
    history
      .filter((assignment) => !assignment.toAt)
      .map((assignment) => [assignment.stayId, assignment.roomId]),
  );
  const stayByBooking = new Map(
    stays.map((stay) => [stay.bookingId, stay]),
  );
  if (
    bookings.some(
      (b) => {
        const stay = stayByBooking.get(b.id);
        const assignedRoomId =
          b.status === "CHECKED_IN" && stay
            ? openRoomByStay.get(stay.id) || b.roomId
            : b.roomId;
        return (
          String(b.id) !== String(exclude) &&
          assignedRoomId === roomId &&
          active(b) &&
          v.overlap(startAt, endAt, b.startAt, b.endAt)
        );
      },
    )
  )
    return false;
  const currentAssignments = history.filter(
    (item) => item.roomId === roomId && !item.toAt,
  );
  if (!currentAssignments.length) return true;
  return !currentAssignments.some((assignment) => {
    const stay = stays.find((item) => item.id === assignment.stayId);
    const booking = stay && bookings.find((item) => item.id === stay.bookingId);
    return (
      stay &&
      !stay.checkOutAt &&
      booking &&
      String(booking.id) !== String(exclude) &&
      v.overlap(startAt, endAt, booking.startAt, booking.endAt)
    );
  });
}
function policyTime(value, fallback) {
  const time = String(value || fallback);
  const normalized = /^\d{2}:\d{2}$/.test(time) ? `${time}:00` : time;
  ensure(
    /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(normalized),
    "Cấu hình giờ nhận/trả phòng không hợp lệ.",
  );
  return normalized;
}
function localOffset(date, time = "00:00:00") {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: config.timeZone,
    timeZoneName: "longOffset",
  }).formatToParts(new Date(`${date}T${time}Z`));
  return (
    parts
      .find((part) => part.type === "timeZoneName")
      ?.value.replace("GMT", "") || "Z"
  );
}
function localDatePart(value) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: config.timeZone,
  }).format(new Date(value));
}
function fixedStayTimes(startDate, endDate, policy = {}) {
  const checkInTime = policyTime(config.checkInTime || policy.checkInTime, "14:00:00");
  const checkOutTime = policyTime(config.checkOutTime || policy.checkOutTime, "12:00:00");
  return {
    startAt: new Date(
      `${startDate}T${checkInTime}${localOffset(startDate, checkInTime)}`,
    ).toISOString(),
    endAt: new Date(
      `${endDate}T${checkOutTime}${localOffset(endDate, checkOutTime)}`,
    ).toISOString(),
  };
}
function isHousekeepingWindow(value) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: config.timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(value)
      .filter((part) => part.type === "hour" || part.type === "minute")
      .map((part) => [part.type, Number(part.value)]),
  );
  const minutes = parts.hour * 60 + parts.minute;
  const start = policyTime(config.checkOutTime, "12:00:00").split(":");
  const end = policyTime(config.checkInTime, "14:00:00").split(":");
  return (
    minutes >= Number(start[0]) * 60 + Number(start[1]) &&
    minutes < Number(end[0]) * 60 + Number(end[1])
  );
}
async function quote(tx, roomId, startAt, endAt) {
  ensure(
    Date.parse(endAt) > Date.parse(startAt),
    "Ngày trả phải sau ngày nhận.",
  );
  const room = await tx.find("rooms", roomId);
  ensure(room, "Không có phòng.", 404);
  const type = await tx.find("types", room.typeId);
  const start = new Date(`${localDatePart(startAt)}T00:00:00Z`);
  const end = new Date(`${localDatePart(endAt)}T00:00:00Z`);
  const nights = Math.max(1, Math.round((end - start) / 86400000));
  ensure(nights <= 3660, "Khoảng lưu trú quá dài.");
  const nightlyPrice = Number(type.nightlyPrice ?? type.dailyPrice);
  ensure(
    Number.isSafeInteger(nightlyPrice) && nightlyPrice > 0,
    "Loại phòng chưa có giá đêm hợp lệ.",
  );
  const holidays = await tx.list("holidays");
  let total = 0;
  for (let i = 0; i < nights; i++) {
    const day = new Date(+start + i * 86400000).toISOString().slice(0, 10);
    const h = holidays.find(
      (h) =>
        h.isActive &&
        h.typeId === type.id &&
        (h.scheduleType === "ANNUAL"
          ? h.startMonthDay &&
            h.endMonthDay &&
            (h.startMonthDay <= h.endMonthDay
              ? day.slice(5) >= h.startMonthDay &&
                day.slice(5) <= h.endMonthDay
              : day.slice(5) >= h.startMonthDay ||
                day.slice(5) <= h.endMonthDay)
          : h.startDate &&
            h.endDate &&
            day >= h.startDate.slice(0, 10) &&
            day <= h.endDate.slice(0, 10)),
    );
    total += Math.round((nightlyPrice * (100 + (h?.percent || 0))) / 100);
  }
  return total;
}
function tierForPoints(points) {
  const pts = Math.max(0, Math.floor(Number(points || 0)));
  if (pts >= 1000) return { code: "DIAMOND", name: "Kim cương", percent: 15, points: pts };
  if (pts >= 500) return { code: "GOLD", name: "Vàng", percent: 10, points: pts };
  if (pts >= 100) return { code: "SILVER", name: "Bạc", percent: 5, points: pts };
  return { code: "MEMBER", name: "Thành viên", percent: 0, points: pts };
}
async function createTask(tx, roomId, stayId, now) {
  await tx.insert("tasks", {
    id: v.id("DD"),
    roomId,
    stayId,
    checkoutAt: now,
    deadlineAt: new Date(Date.parse(now) + 90 * 60000).toISOString(),
    completedAt: null,
    status: "OPEN",
    assignedTo: null,
  });
}
module.exports = {
  active,
  audit,
  expire,
  noShowDeadline,
  isExpiredPending,
  isNoShowExpired,
  available,
  fixedStayTimes,
  localDatePart,
  isHousekeepingWindow,
  quote,
  tierForPoints,
  createTask,
};
