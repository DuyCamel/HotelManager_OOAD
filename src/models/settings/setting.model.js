/**
 * TASK-BAN-GIAO (TODO) | Phụ trách: TV1 | Mã việc: A3, A5
 * Đây là việc còn lại/nghiệm thu, không phải mô tả tính năng đã hoàn tất.
 * Tách truy vấn nhật ký có lọc/phân trang/xuất CSV và bản in PDF (có thể tạo auditService.js khi triển khai).
 * Hoàn thiện trạng thái sao lưu thành công/thất bại, hướng dẫn và giao diện khôi phục; SQL restore giữ ngoại tuyến trừ khi chốt cách khác.
 * Không mở lại tùy chỉnh giờ 12:00–14:00/12:00 đã cố định trong bản hiện tại.
 * Chi tiết, phụ thuộc và tiêu chí xong: docs/PHAN_CONG_3_NGUOI.md.
 */
/** Thiết lập và bản sao chỉ Admin. SQL backup chạy tại máy SQL Server, không nhận đường dẫn tùy ý từ HTTP. */
const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { allow } = require("../../core/auth/rbac");
const { ensure } = require("../../core/errors/AppError");
const v = require("../../core/validation/fields");
const { audit } = require("../_shared/stayRules");
const config = require("../../config/env");

module.exports = (repo) => ({
  async settings(user, b) {
    allow(user, "admin");
    const row = {
      hotelName: v.text(b.hotelName, "Tên khách sạn", 150),
      address: v.text(b.address, "Địa chỉ", 250),
      hotline: v.phone(b.hotline),
      checkInTime: "14:00:00",
      checkOutTime: "12:00:00",
      lateFeeFrom: v.text(b.lateFeeFrom, "Giờ phụ thu", 8),
      lateFeePercent: v.number(b.lateFeePercent, "Phụ thu %", 0, 100),
      bankCode: v.text(b.bankCode, "Ngân hàng", 30),
      bankAccount: v.text(b.bankAccount, "Số tài khoản", 40),
      bankOwner: v.text(b.bankOwner, "Chủ tài khoản", 150),
    };
    for (const k of ["checkInTime", "checkOutTime", "lateFeeFrom"])
      ensure(
        /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(row[k]),
        "Giờ không hợp lệ.",
      );
    await repo.transaction(async (tx) => {
      await tx.update("settings", 1, row);
      await audit(tx, user, "Cập nhật cấu hình", "SETTING", "1");
    });
    return { ok: true };
  },
});
