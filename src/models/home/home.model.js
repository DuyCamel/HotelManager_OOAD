/**
 * TASK-BAN-GIAO (TODO) | Phụ trách: TV1 | Mã việc: A2, A3, A6, C4
 * Đây là việc còn lại/nghiệm thu, không phải mô tả tính năng đã hoàn tất.
 * Điều phối hợp đồng dữ liệu theo màn hình, lọc và phân trang; không tiếp tục tải mọi bảng qua /api/data khi mở một trang.
 * Giữ lọc chủ sở hữu của CUSTOMER và quyền từng vai trò; tích hợp truy vấn báo cáo TV3/C4 và hồ sơ/thẻ A2.
 * Chi tiết, phụ thuộc và tiêu chí xong: docs/PHAN_CONG_3_NGUOI.md.
 */
/** Truy vấn theo vai trò; không trả hash mật khẩu hoặc hồ sơ của khách khác. */
const { ensure } = require("../../core/errors/AppError");
const { has } = require("../../core/auth/rbac");
const { safeAccount } = require("../../core/validation/fields");

module.exports = (repo) => ({
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
