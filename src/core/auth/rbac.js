/**
 * TASK-BAN-GIAO (TODO) | Phụ trách: TV1 | Mã việc: A1, A6
 * Đây là việc còn lại/nghiệm thu, không phải mô tả tính năng đã hoàn tất.
 * Nghiệm thu ma trận quyền khi thêm route/gia hạn/báo cáo; Quản lý phụ trách phân quyền và dữ liệu hệ thống, Admin phụ trách cấu hình và vận hành khách sạn.
 * Nhân viên chỉ dùng dịch vụ phát sinh, không sửa giá; Buồng phòng không có tổng quan. Phối hợp chủ module khi thêm quyền.
 * Chi tiết, phụ thuộc và tiêu chí xong: docs/PHAN_CONG_3_NGUOI.md.
 */
/** Ma trận quyền duy nhất cho service; menu được định hình riêng theo từng vai trò. */
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
  MANAGER: ["accounts", "accounts.assign", "admin"],
  ADMIN: [
    ...staff,
    "catalog",
    "services.read",
    "config",
    "accounts",
    "reports",
    "clean",
  ],
  RECEPTIONIST: [...staff, "services.read"],
  HOUSEKEEPER: ["board", "clean"],
  CUSTOMER: ["self"],
};
const has = (user, permission) =>
  Boolean(user && Object.hasOwn(grants, user.role) && grants[user.role].includes(permission));
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
