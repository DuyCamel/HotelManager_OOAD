/** Ma trận quyền duy nhất, dùng cho cả service và menu. Khách không thừa kế quyền nhân viên. */
const staff = [
  "bookings",
  "customers",
  "usage",
  "cards",
  "board",
  "stays",
  "invoices",
];
const grants = {
  ADMIN: ["*"],
  MANAGER: [...staff, "catalog", "accounts", "reports", "clean"],
  RECEPTIONIST: staff,
  HOUSEKEEPER: ["board", "clean"],
  CUSTOMER: ["self"],
};
const has = (user, permission) =>
  Boolean(
    user &&
    (grants[user.role] || []).some((p) => p === "*" || p === permission),
  );
const { ensure } = require("./errors");
const allow = (user, permission) =>
  ensure(
    has(user, permission),
    "Bạn không có quyền thực hiện thao tác này.",
    403,
  );
const labels = {
  ADMIN: "Admin",
  MANAGER: "Quản lý",
  RECEPTIONIST: "Lễ tân",
  HOUSEKEEPER: "Buồng phòng",
  CUSTOMER: "Khách hàng",
};
module.exports = { has, allow, grants, labels };
