/**
 * TASK-BAN-GIAO (TODO) | Phụ trách: TV3 | Mã việc: C2
 * Đây là việc còn lại/nghiệm thu, không phải mô tả tính năng đã hoàn tất.
 * Hoàn thiện ảnh phòng và liên kết dịch vụ/tiện ích/minibar theo loại phòng; RoomTypeService có ở SQL nhưng chưa có luồng ghi/đọc JS.
 * Phân biệt dịch vụ đi kèm với dịch vụ phát sinh tính tiền; không tạo tồn kho minibar theo từng phòng.
 * Giữ kiểm tra sức chứa/lịch đặt, khóa phòng, giá lễ chồng lấn; phạm vi thêm phòng cần đối chiếu báo cáo trước thay đổi.
 * Chi tiết, phụ thuộc và tiêu chí xong: docs/PHAN_CONG_3_NGUOI.md.
 */
/** Giá lễ hỗ trợ lịch một lần và lịch lặp hằng năm theo tháng-ngày. */
const v = require("../../core/validation/fields");
const { ensure } = require("../../core/errors/AppError");
const { allow } = require("../../core/auth/rbac");
const h = require("../_shared/stayRules");

const SCHEDULE_TYPES = new Set(["ONE_OFF", "ANNUAL"]);
const dateOnly = (value) => (value ? String(value).slice(0, 10) : null);

function monthDay(value, label) {
  const text = String(value || "").trim();
  const parsed = /^\d{2}-\d{2}$/.test(text)
    ? new Date(`2000-${text}T00:00:00Z`)
    : null;
  ensure(
    parsed && parsed.toISOString().slice(5, 10) === text,
    `${label} phải đúng định dạng MM-DD.`,
  );
  return text;
}

function normalize(row) {
  return {
    ...row,
    scheduleType: row.scheduleType || "ONE_OFF",
    startDate: dateOnly(row.startDate),
    endDate: dateOnly(row.endDate),
    startMonthDay: row.startMonthDay || null,
    endMonthDay: row.endMonthDay || null,
  };
}

function annualContains(rate, value) {
  const day = String(value).slice(5, 10);
  return rate.startMonthDay <= rate.endMonthDay
    ? day >= rate.startMonthDay && day <= rate.endMonthDay
    : day >= rate.startMonthDay || day <= rate.endMonthDay;
}

function schedulesOverlap(leftValue, rightValue) {
  const left = normalize(leftValue);
  const right = normalize(rightValue);
  if (left.scheduleType === "ANNUAL" && right.scheduleType === "ANNUAL") {
    const candidates = [
      left.startMonthDay,
      left.endMonthDay,
      right.startMonthDay,
      right.endMonthDay,
    ];
    return candidates.some(
      (day) => annualContains(left, `2000-${day}`) && annualContains(right, `2000-${day}`),
    );
  }
  if (left.scheduleType === "ONE_OFF" && right.scheduleType === "ONE_OFF")
    return left.startDate <= right.endDate && right.startDate <= left.endDate;

  const annual = left.scheduleType === "ANNUAL" ? left : right;
  const once = left.scheduleType === "ONE_OFF" ? left : right;
  const cursor = new Date(`${once.startDate}T00:00:00Z`);
  const end = new Date(`${once.endDate}T00:00:00Z`);
  while (cursor <= end) {
    if (annualContains(annual, cursor.toISOString().slice(0, 10))) return true;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return false;
}

function sameSchedule(leftValue, rightValue) {
  const left = normalize(leftValue);
  const right = normalize(rightValue);
  return (
    left.scheduleType === right.scheduleType &&
    (left.scheduleType === "ANNUAL"
      ? left.startMonthDay === right.startMonthDay &&
        left.endMonthDay === right.endMonthDay
      : left.startDate === right.startDate && left.endDate === right.endDate)
  );
}

function assertNoConflict(candidate, rows, excludeId = "") {
  for (const existing of rows) {
    if (String(existing.id) === String(excludeId) || existing.typeId !== candidate.typeId)
      continue;
    ensure(
      !sameSchedule(candidate, existing),
      "Đợt giá lễ bị trùng loại phòng và lịch áp dụng.",
      409,
    );
    ensure(
      !candidate.isActive || !existing.isActive || !schedulesOverlap(candidate, existing),
      "Đợt giá lễ đang hoạt động bị chồng lấn.",
      409,
    );
  }
}

module.exports = (repo) => ({
  async save(user, body) {
    const kind = "holidays";
    allow(user, "catalog");
    return repo.transaction(async (tx) => {
      const creating = !body.id;
      const old = body.id ? await tx.find(kind, body.id) : null;
      ensure(creating || old, "Bản ghi không tồn tại.", 404);
      const scheduleType = String(body.scheduleType || "ONE_OFF").toUpperCase();
      ensure(SCHEDULE_TYPES.has(scheduleType), "Kiểu lịch giá lễ không hợp lệ.");
      const typeId = v.text(body.typeId, "Loại phòng", 20);
      ensure(await tx.find("types", typeId), "Loại phòng không tồn tại.");
      const row = {
        id: old?.id || v.id("GL"),
        name: v.text(body.name, "Tên đợt lễ", 120),
        typeId,
        scheduleType,
        startDate: null,
        endDate: null,
        startMonthDay: null,
        endMonthDay: null,
        percent: v.number(body.percent, "Mức tăng %", 0, 1000),
        isActive: old?.isActive ?? true,
      };
      if (scheduleType === "ANNUAL") {
        row.startMonthDay = monthDay(body.startMonthDay, "Ngày bắt đầu hằng năm");
        row.endMonthDay = monthDay(body.endMonthDay, "Ngày kết thúc hằng năm");
      } else {
        row.startDate = v.calendarDate(body.startDate, "Ngày bắt đầu");
        row.endDate = v.calendarDate(body.endDate, "Ngày kết thúc");
        ensure(row.startDate <= row.endDate, "Khoảng ngày không hợp lệ.");
        ensure(
          (Date.parse(row.endDate) - Date.parse(row.startDate)) / 86400000 <= 3660,
          "Một đợt giá lễ tối đa 10 năm.",
        );
      }
      assertNoConflict(row, await tx.list(kind), old?.id);

      if (creating) await tx.insert(kind, row);
      else await tx.update(kind, row.id, row);
      await h.audit(
        tx,
        user,
        creating ? "Thêm giá lễ" : "Cập nhật giá lễ",
        "HOLIDAY_RATE",
        row.id,
        `${row.name}; lịch=${row.scheduleType}; tăng=${row.percent}%`,
      );
      return row;
    });
  },
  async toggle(user, body) {
    const kind = "holidays";
    allow(user, "catalog");
    return repo.transaction(async (tx) => {
      const old = await tx.find(kind, body.id);
      ensure(old, "Không tìm thấy.", 404);
      const isActive = !old.isActive;
      if (isActive)
        assertNoConflict(
          { ...normalize(old), isActive },
          await tx.list(kind),
          old.id,
        );
      await tx.update(kind, old.id, { isActive });
      await h.audit(
        tx,
        user,
        "Đổi trạng thái giá lễ",
        "HOLIDAY_RATE",
        old.id,
        isActive ? "Kích hoạt" : "Ngừng áp dụng",
      );
      return { ok: true };
    });
  },
});
