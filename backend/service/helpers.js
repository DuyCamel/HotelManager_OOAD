/** Quy tắc thuần dùng chung trong transaction: thời gian, giá chốt và ghi nhật ký. */
const { ensure } = require("../shared/errors");
const v = require("../shared/validation");
const config = require("../config/env");
const active = (b) => ["PENDING", "CONFIRMED", "CHECKED_IN"].includes(b.status);
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
    if (
      b.status === "PENDING" &&
      b.deposit === 0 &&
      Date.parse(b.holdUntil) < now
    ) {
      await tx.update("bookings", b.id, { status: "CANCELLED" });
      await audit(tx, null, "Tự hủy phiếu chưa cọc", "BOOKING", b.id);
    }
}
async function available(tx, roomId, startAt, endAt, exclude = "") {
  const r = await tx.find("rooms", roomId);
  if (!r || ["MAINTENANCE", "DISABLED"].includes(r.status)) return false;
  return !(await tx.list("bookings")).some(
    (b) =>
      b.id !== exclude &&
      b.roomId === roomId &&
      active(b) &&
      v.overlap(startAt, endAt, b.startAt, b.endAt),
  );
}
function localOffset(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: config.timeZone,
    timeZoneName: "longOffset",
  }).formatToParts(new Date(`${date}T00:00:00Z`));
  return parts.find((part) => part.type === "timeZoneName")?.value.replace("GMT", "") || "Z";
}
function localDatePart(value) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: config.timeZone,
  }).format(new Date(value));
}
function fixedStayTimes(startDate, endDate) {
  return {
    startAt: new Date(
      `${startDate}T00:00:00${localOffset(startDate)}`,
    ).toISOString(),
    endAt: new Date(
      `${endDate}T12:00:00${localOffset(endDate)}`,
    ).toISOString(),
  };
}
function isHousekeepingWindow(value) {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: config.timeZone,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(value),
  );
  return hour >= 12 && hour < 14;
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
  const holidays = await tx.list("holidays");
  let total = 0;
  for (let i = 0; i < nights; i++) {
    const day = new Date(+start + i * 86400000).toISOString().slice(0, 10);
    const h = holidays.find(
      (h) =>
        h.isActive &&
        h.typeId === type.id &&
        day >= h.startDate.slice(0, 10) &&
        day <= h.endDate.slice(0, 10),
    );
    total += Math.round((type.dailyPrice * (100 + (h?.percent || 0))) / 100);
  }
  return total;
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
  available,
  fixedStayTimes,
  localDatePart,
  isHousekeepingWindow,
  quote,
  createTask,
};
