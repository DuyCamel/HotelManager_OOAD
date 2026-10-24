/**
 * TASK-BAN-GIAO (TODO) | Phụ trách: TV1 | Mã việc: A1, A6
 * Đây là việc còn lại/nghiệm thu, không phải mô tả tính năng đã hoàn tất.
 * Nghiệm thu ma trận quyền khi thêm route/gia hạn/báo cáo; không mở backup/config/role/Admin transfer cho Quản lý.
 * Nhân viên chỉ dùng dịch vụ phát sinh, không sửa giá; Buồng phòng không có tổng quan. Phối hợp chủ module khi thêm quyền.
 * Chi tiết, phụ thuộc và tiêu chí xong: docs/PHAN_CONG_3_NGUOI.md.
 */
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
const { ensure } = require("../errors/AppError");
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
