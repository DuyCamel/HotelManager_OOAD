/**
 * TASK-BAN-GIAO (TODO) | Phụ trách: TV1 | Mã việc: A6
 * Đây là việc còn lại/nghiệm thu, không phải mô tả tính năng đã hoàn tất.
 * Chỉ ghép thêm service có triển khai thật (ví dụ auditService/reportService) sau khi thống nhất interface với TV2/TV3.
 * Không tạo service rỗng để giả lập hoàn thành; giữ controller không viết SQL.
 * Chi tiết, phụ thuộc và tiêu chí xong: docs/PHAN_CONG_3_NGUOI.md.
 */
/** Điểm ghép service. Controller chỉ gọi nghiệp vụ, không viết SQL. */
module.exports = (repo) =>
  Object.fromEntries(
    [
      "auth",
      "read",
      "system",
      "profile",
      "account",
      "catalog",
      "customer",
      "booking",
      "billing",
      "housekeeping",
    ].map((name) => [name, require("./" + name + "Service")(repo)]),
  );
