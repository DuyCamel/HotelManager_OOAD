/** Chỉ mount route từng module, không nhận request nghiệp vụ hoặc viết SQL. */
module.exports = (models) => {
  const r = require("express").Router();
  r.use(require("./home/home.routes")(models));
  r.use(require("./auth/auth.routes")(models));
  r.use(require("./workspace/workspace.routes")(models));
  r.use(require("./accounts/accounts.routes")(models));
  r.use(require("./customers/customers.routes")(models));
  r.use(require("./memberships/memberships.routes")(models));
  r.use(require("./bookings/bookings.routes")(models));
  r.use(require("./stays/stays.routes")(models));
  r.use(require("./service-usage/service-usage.routes")(models));
  r.use(require("./invoices/invoices.routes")(models));
  r.use(require("./housekeeping/housekeeping.routes")(models));
  r.use(require("./profile/profile.routes")(models));
  r.use(require("./settings/settings.routes")(models));
  r.use(require("./backups/backups.routes")(models));
  r.use(require("./audit/audit.routes")(models));
  r.use(require("./reports/reports.routes")(models));
  r.use(require("./dashboard/dashboard.routes")(models));
  r.use(require("./rooms/rooms.routes")(models));
  r.use(require("./room-types/room-types.routes")(models));
  r.use(require("./services/services.routes")(models));
  r.use(require("./holiday-rates/holiday-rates.routes")(models));
  return r;
};
