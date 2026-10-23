/** Truy vấn theo vai trò; không trả hash mật khẩu hoặc hồ sơ của khách khác. */
const { ensure } = require("../shared/errors");
const { has } = require("../shared/permissions");
const { safeAccount } = require("../shared/validation");
module.exports = (repo) => ({
  async workspace(user) {
    const keys = ["rooms", "types", "services", "holidays", "settings"];
    const d = { me: safeAccount(user) };
    for (const k of keys) d[k] = await repo.list(k);
    d.settings = d.settings.map(({ bankAccount, bankOwner, ...r }) =>
      user.role === "ADMIN"
        ? { ...r, bankAccount, bankOwner }
        : user.role === "HOUSEKEEPER"
          ? { id: r.id, hotelName: r.hotelName }
          : r,
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
      d.bookings = (await repo.list("bookings")).filter((x) =>
        ids.has(x.customerId),
      );
      d.cards = (await repo.list("cards")).filter((x) => ids.has(x.customerId));
      d.invoices = (await repo.list("invoices")).filter((x) =>
        ids.has(x.customerId),
      );
      d.lines = (await repo.list("lines")).filter((x) =>
        d.invoices.some((i) => i.id === x.invoiceId),
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
    if (has(user, "accounts"))
      d.accounts = (await repo.list("accounts")).map(safeAccount);
    if (has(user, "clean")) {
      d.tasks = await repo.list("tasks");
      d.damages = await repo.list("damages");
    }
    if (user.role === "ADMIN") {
      d.audit = (await repo.list("audit"))
        .sort((a, b) => b.id - a.id)
        .slice(0, 500);
      d.backups = await repo.list("backups");
    }
    return d;
  },
  async public() {
    return {
      types: await repo.list("types"),
      services: (await repo.list("services")).filter((x) => x.isActive),
      hotel: (await repo.list("settings")).map((s) => ({
        hotelName: s.hotelName,
        address: s.address,
        hotline: s.hotline,
        checkInTime: s.checkInTime,
        checkOutTime: s.checkOutTime,
      }))[0],
    };
  },
});
