/**
 * TASK-BAN-GIAO (TODO) | Phụ trách: TV1 | Mã việc: A2, A3, A6, C4
 * Đây là việc còn lại/nghiệm thu, không phải mô tả tính năng đã hoàn tất.
 * Điều phối hợp đồng dữ liệu theo màn hình, lọc và phân trang; không tiếp tục tải mọi bảng qua /api/data khi mở một trang.
 * Giữ lọc chủ sở hữu của CUSTOMER và quyền từng vai trò; tích hợp truy vấn báo cáo TV3/C4 và hồ sơ/thẻ A2.
 * Chi tiết, phụ thuộc và tiêu chí xong: docs/PHAN_CONG_3_NGUOI.md.
 */
/** Truy vấn theo vai trò; không trả hash mật khẩu hoặc hồ sơ của khách khác. */
const { allow, has } = require("../../core/auth/rbac");
const { safeAccount } = require("../../core/validation/fields");
const h = require("../_shared/stayRules");
const config = require("../../config/env");

const applyRuntimePolicy = (settings) =>
  settings.map((setting) => ({
    ...setting,
    checkInTime: config.checkInTime,
    checkOutTime: config.checkOutTime,
    noShowTime: config.noShowTime,
    bookingHoldMinutes: config.bookingHoldMinutes,
  }));
const roleRank = {
  MANAGER: 1,
  ADMIN: 2,
  RECEPTIONIST: 3,
  HOUSEKEEPER: 4,
  CUSTOMER: 5,
};
const sortAccounts = (accounts = []) =>
  accounts.slice().sort((a, b) => {
    const diff = (roleRank[a.role] || 99) - (roleRank[b.role] || 99);
    if (diff !== 0) return diff;
    const timeA = Date.parse(a.createdAt || "") || 0;
    const timeB = Date.parse(b.createdAt || "") || 0;
    if (timeA !== timeB) return timeB - timeA;
    return String(b.id || "").localeCompare(String(a.id || ""));
  });
module.exports = (repo) => ({
  async workspace(user) {
    const d = { me: safeAccount(user) };
    if (user.role === "MANAGER") {
      d.accounts = sortAccounts((await repo.list("accounts")).map(safeAccount));
      d.audit = (await repo.list("audit"))
        .sort((a, b) => b.id - a.id)
        .slice(0, 500);
      d.backups = await repo.list("backups");
      return d;
    }
    allow(user, user.role === "CUSTOMER" ? "self" : "board");
    if (typeof repo.transaction === "function") {
      const rawBookings = await repo.list("bookings");
      if (
        Array.isArray(rawBookings) &&
        rawBookings.some((b) => h.isExpiredPending(b) || h.isNoShowExpired(b))
      ) {
        await repo.transaction((tx) => h.expire(tx));
      }
    }
    const keys = ["rooms", "types", "services", "holidays", "settings"];
    for (const k of keys) d[k] = await repo.list(k);
    d.settings = applyRuntimePolicy(d.settings);
    const paymentSetting = d.settings[0];
    if (
      paymentSetting &&
      ["ADMIN", "RECEPTIONIST", "CUSTOMER"].includes(user.role)
    )
      d.paymentGuide = {
        bankCode: paymentSetting.bankCode || "",
        bankAccount: paymentSetting.bankAccount || "",
        bankOwner: paymentSetting.bankOwner || "",
        qrImagePath: paymentSetting.qrImagePath || "",
      };
    d.settings = d.settings.map((setting) =>
      user.role === "HOUSEKEEPER"
        ? { id: setting.id, hotelName: setting.hotelName }
        : user.role === "ADMIN"
          ? setting
          : (({ bankAccount, bankOwner, qrImagePath, ...safe }) => safe)(setting),
    );
    if (user.role === "HOUSEKEEPER") {
      d.tasks = await repo.list("tasks");
      d.damages = await repo.list("damages");
      return d;
    }
    if (user.role === "CUSTOMER") {
      d.customers = (await repo.list("customers")).filter(
        (c) => c.accountId === user.id,
      );
      const ids = new Set(d.customers.map((x) => x.id));
      const allBookings = await repo.list("bookings");
      d.bookings = allBookings.filter((x) => ids.has(x.customerId));
      d.cards = (await repo.list("cards")).filter((x) => ids.has(x.customerId));
      const bookingIds = new Set(d.bookings.map((x) => x.id));
      const invoiceOwner = new Map(
        (await repo.list("stays"))
          .filter((stay) => bookingIds.has(stay.bookingId))
          .map((stay) => [
            stay.id,
            allBookings.find((booking) => booking.id === stay.bookingId)
              ?.customerId,
          ]),
      );
      d.invoices = (await repo.list("invoices"))
        .map((invoice) => ({
          ...invoice,
          customerId: invoiceOwner.get(invoice.stayId) || null,
        }))
        .filter((invoice) => ids.has(invoice.customerId));
      const invoiceIds = new Set(d.invoices.map((invoice) => invoice.id));
      d.lines = (await repo.list("lines")).filter((x) =>
        invoiceIds.has(x.invoiceId),
      );
      return d;
    }
    for (const k of [
      "customers",
      "bookings",
      "stays",
      "history",
      "usage",
      "cards",
      "invoices",
      "lines",
      "payments",
    ])
      d[k] = await repo.list(k);
    const membershipModel = require("../memberships/membership.model");
    const disableRequests = typeof membershipModel.readDisableRequests === "function"
      ? membershipModel.readDisableRequests()
      : {};
    if (Array.isArray(d.cards)) {
      d.cards = d.cards.map((c) => ({
        ...c,
        disableRequest:
          disableRequests[c.id] && disableRequests[c.id].status === "PENDING"
            ? disableRequests[c.id]
            : null,
      }));
    }
    const currentRoom = new Map();
    const lastRoom = new Map();
    for (const assignment of d.history) {
      const previous = lastRoom.get(assignment.stayId);
      if (
        !previous ||
        Date.parse(assignment.fromAt) >= Date.parse(previous.fromAt)
      )
        lastRoom.set(assignment.stayId, assignment);
      if (!assignment.toAt) currentRoom.set(assignment.stayId, assignment.roomId);
    }
    d.stays = d.stays.map((stay) => ({
      ...stay,
      roomId:
        currentRoom.get(stay.id) ||
        lastRoom.get(stay.id)?.roomId ||
        stay.roomId ||
        null,
      currentRoomId: currentRoom.get(stay.id) || null,
    }));
    const bookingById = new Map(
      d.bookings.map((booking) => [booking.id, booking]),
    );
    const stayById = new Map(d.stays.map((stay) => [stay.id, stay]));
    d.invoices = d.invoices.map((invoice) => ({
      ...invoice,
      customerId:
        bookingById.get(stayById.get(invoice.stayId)?.bookingId)?.customerId ||
        null,
    }));
    const invoiceByStay = new Map(
      d.invoices.map((invoice) => [invoice.stayId, invoice.id]),
    );
    d.usage = d.usage.map((usage) => ({
      ...usage,
      invoiceId: usage.isVoided
        ? null
        : invoiceByStay.get(usage.stayId) || null,
    }));
    if (has(user, "accounts"))
      d.accounts = sortAccounts((await repo.list("accounts")).map(safeAccount));
    if (has(user, "board")) {
      d.tasks = await repo.list("tasks");
      d.damages = await repo.list("damages");
    }
    return d;
  },
  async public() {
    return {
      types: await repo.list("types"),
      services: (await repo.list("services")).filter((x) => x.isActive),
      hotel: applyRuntimePolicy(await repo.list("settings")).map((s) => ({
        hotelName: s.hotelName,
        address: s.address,
        hotline: s.hotline,
        checkInTime: s.checkInTime,
        checkOutTime: s.checkOutTime,
        noShowTime: s.noShowTime,
      }))[0],
    };
  },
});
