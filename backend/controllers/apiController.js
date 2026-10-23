/**
 * TASK-BAN-GIAO (TODO) | Phụ trách: TV1 | Mã việc: A6, B2, C4
 * Đây là việc còn lại/nghiệm thu, không phải mô tả tính năng đã hoàn tất.
 * File ghép chung: TV1 tích hợp command gia hạn của TV2, truy vấn audit A3 và báo cáo C4 của TV3.
 * Thống nhất tên command/body/result với người phụ trách trước merge; actor/role luôn lấy từ session, không lấy request body.
 * Chi tiết, phụ thuộc và tiêu chí xong: docs/PHAN_CONG_3_NGUOI.md.
 */
/** Ánh xạ command cố định sang service; không cung cấp CRUD database trực tiếp. */
const { ensure } = require("../shared/errors");
const { safeAccount } = require("../shared/validation");
module.exports = (s) => ({
  async data(req, res) {
    res.json(await s.read.workspace(req.user));
  },
  async command(req, res) {
    const b = req.body,
      u = req.user;
    const map = {
      "booking.create": () => s.booking.create(u, b),
      "booking.deposit": () => s.booking.deposit(u, b),
      "booking.cancel": () => s.booking.cancel(u, b),
      "stay.checkin": () => s.booking.checkIn(u, b),
      "stay.move": () => s.booking.changeRoom(u, b),
      "stay.preview": () => s.billing.preview(u, b.id),
      "stay.checkout": () => s.billing.checkout(u, b),
      "usage.add": () => s.billing.addUsage(u, b),
      "usage.void": () => s.billing.voidUsage(u, b),
      "customer.save": () => s.customer.save(u, b),
      "customer.archive": () => s.customer.archive(u, b),
      "card.issue": () => s.customer.issueCard(u, b),
      "card.disable": () => s.customer.disableCard(u, b),
      "catalog.save": () => s.catalog.save(u, b.kind, b),
      "catalog.toggle": () => s.catalog.toggle(u, b.kind, b),
      "account.create": () => s.account.create(u, b),
      "account.update": () => s.account.update(u, b),
      "account.toggle": () => s.account.toggle(u, b),
      "account.role": () => s.account.role(u, b),
      "room.clean": () => s.housekeeping.clean(u, b),
      "system.settings": () => s.system.settings(u, b),
      "system.backup": () => s.system.backup(u),
      "system.restore": () => s.system.restore(u, b),
      "profile.update": () => s.profile.update(u, b),
      "profile.password": () => s.profile.password(u, b),
      "admin.challenge": () => s.auth.challenge(u, req.sessionID, b),
      "admin.transfer": () => s.auth.transfer(u, req.sessionID, b),
    };
    ensure(map[req.params.command], "Thao tác không tồn tại.", 404);
    const result = await map[req.params.command]();
    if (result?.logoutAll) global.hotelEpoch++;
    if (
      result?.logout ||
      result?.logoutAll ||
      req.params.command === "admin.transfer"
    )
      await new Promise((resolve, reject) =>
        req.session.destroy((e) => (e ? reject(e) : resolve())),
      );
    res.json(result || { ok: true });
  },
  async login(req, res) {
    const u = await s.auth.login(req.body);
    await new Promise((resolve, reject) =>
      req.session.regenerate((e) => (e ? reject(e) : resolve())),
    );
    req.session.user = { id: u.id, authVersion: u.authVersion };
    req.session.epoch = global.hotelEpoch;
    res.json({ redirect: u.role === "CUSTOMER" ? "/portal" : "/app" });
  },
  async register(req, res) {
    res.json(await s.auth.register(req.body));
  },
  async logout(req, res) {
    await new Promise((resolve, reject) =>
      req.session.destroy((e) => (e ? reject(e) : resolve())),
    );
    res.json({ redirect: "/login" });
  },
});
