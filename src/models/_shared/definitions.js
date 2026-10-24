/** Tổng hợp mapping theo module; không nhận bảng/cột từ request. */
const defs = Object.assign(
  {},
  require("../accounts/schema"),
  require("../customers/schema"),
  require("../room-types/schema"),
  require("../rooms/schema"),
  require("../services/schema"),
  require("../holiday-rates/schema"),
  require("../memberships/schema"),
  require("../bookings/schema"),
  require("../stays/schema"),
  require("../service-usage/schema"),
  require("../invoices/schema"),
  require("../payments/schema"),
  require("../housekeeping/schema"),
  require("../settings/schema"),
  require("../backups/schema"),
  require("../audit/schema"),
);
module.exports = { defs, computed: new Set(["amountDue", "lineAmount"]) };
