/**
 * TASK-BAN-GIAO (TODO) | Phụ trách: TV1 | Mã việc: A6
 * Đây là việc còn lại/nghiệm thu, không phải mô tả tính năng đã hoàn tất.
 * Thống nhất lỗi 400/401/403/404/409 và thông báo nghiệp vụ để frontend xử lý nhất quán.
 * Không trả lỗi kỹ thuật chứa câu SQL hoặc secret ra trình duyệt.
 * Chi tiết, phụ thuộc và tiêu chí xong: docs/PHAN_CONG_3_NGUOI.md.
 */
/** Lỗi nghiệp vụ có mã HTTP; không trả stack trace ra trình duyệt. */
class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
const ensure = (condition, message, status = 400) => {
  if (!condition) throw new AppError(message, status);
};
module.exports = { AppError, ensure };
