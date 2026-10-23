# Kết quả kiểm tra bản đầu

- Biên dịch riêng backend rồi frontend bằng JDK 17: thành công.
- `scripts/test.sh`: 34 kiểm tra tích hợp đạt. Có kiểm tra quyền, xác nhận cọc/checkout không lặp, đặt trùng, khóa đổi loại phòng đã đặt, ID trùng, username chuẩn hóa, điểm thẻ, OTP và thu hồi phiên, phiếu hết hạn, lưu/mở lại và khôi phục dữ liệu.
- Mở 45 mục điều hướng qua 5 vai trò trên Xvfb: thành công. Đã kiểm tra ảnh chụp tổng quan và các màn hình quản trị.
- Lần kiểm tra tự động không gọi SMS, ngân hàng, máy in thật hoặc MySQL. Chưa xác nhận chạy trên Windows thực tế; `run.bat` được chuẩn bị cho JDK 17 với cú pháp classpath Windows.
- Hai lượt rà soát phát hiện trùng mã ghi đè, chuẩn hóa username, thay loại phòng đã có phiếu, thiếu tìm điện thoại và giờ đặt chưa theo cấu hình; đã sửa và kiểm tra lại. Bổ sung biểu đồ/chỉ số báo cáo, chọn logo và form phụ thu để xem xét.

Chạy lại: `bash scripts/test.sh`. Nếu có desktop Linux/macOS: `bash scripts/test-ui.sh`. Các kiểm thử dùng dữ liệu tạm, không chạm dữ liệu demo của người dùng.

## SQL Server và cấu hình JDBC

- Ba script SQL được phân tích đầy đủ với SQLFluff dialect tsql (tắt giới hạn bỏ qua file lớn), không có lỗi parse.
- Đối chiếu tĩnh mọi danh sách cột INSERT với 22 bảng tạo ở 001; kiểm tra độc lập 240 lịch đặt và số lượng bảng con.
- Đã dùng chính Java Passwords.matches để xác nhận 104 hash SQL tương thích Demo@123.
- Kiểm thử Java: 34 kiểm tra nghiệp vụ cũ và 7 kiểm tra cấu hình JDBC đạt; biên dịch cả backend/frontend thành công.
- Rà soát đã sửa NULL số tiền checkout, SET options cho filtered index/cột computed, bảo vệ INSERT sổ điểm, giảm sức chứa, marker cài đặt và fixture ngày/kênh online.
- Chưa có SQL Server thực để chạy 001→002→003 hoặc kết nối JDBC; đây là kiểm tra tĩnh/cú pháp và tương thích mã Java, chưa phải xác nhận runtime SQL Server. Utility check-db dùng để nhóm kiểm tra trên từng máy.
