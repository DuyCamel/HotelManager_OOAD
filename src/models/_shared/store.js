/**
 * TASK-BAN-GIAO (TODO) | Phụ trách: TV3 | Mã việc: C1
 * Đây là việc còn lại/nghiệm thu, không phải mô tả tính năng đã hoàn tất.
 * Nghiệm thu lựa chọn DB_MODE và tính tương đương interface SQL/demo; không tạo dữ liệu demo trong database SQL thật.
 * Chi tiết, phụ thuộc và tiêu chí xong: docs/PHAN_CONG_3_NGUOI.md.
 */
/** Chọn adapter một lần lúc khởi động; SQL lỗi không âm thầm chuyển sang demo. */
const config = require("../../config/env");
module.exports =
  config.mode === "sqlserver"
    ? require("./sql.model")
    : require("./demo.model");
