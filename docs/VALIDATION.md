# Kết quả kiểm tra bản đầu

- Biên dịch riêng backend rồi frontend bằng JDK 17: thành công.
- `scripts/test.sh`: 34 kiểm tra tích hợp đạt. Có kiểm tra quyền, xác nhận cọc/checkout không lặp, đặt trùng, khóa đổi loại phòng đã đặt, ID trùng, username chuẩn hóa, điểm thẻ, OTP và thu hồi phiên, phiếu hết hạn, lưu/mở lại và khôi phục dữ liệu.
- Mở 45 mục điều hướng qua 5 vai trò trên Xvfb: thành công. Đã kiểm tra ảnh chụp tổng quan và các màn hình quản trị.
- Lần kiểm tra tự động không gọi SMS, ngân hàng, máy in thật hoặc MySQL. Chưa xác nhận chạy trên Windows thực tế; `run.bat` được chuẩn bị cho JDK 17 với cú pháp classpath Windows.
- Hai lượt rà soát phát hiện trùng mã ghi đè, chuẩn hóa username, thay loại phòng đã có phiếu, thiếu tìm điện thoại và giờ đặt chưa theo cấu hình; đã sửa và kiểm tra lại. Bổ sung biểu đồ/chỉ số báo cáo, chọn logo và form phụ thu để xem xét.

Chạy lại: `bash scripts/test.sh`. Nếu có desktop Linux/macOS: `bash scripts/test-ui.sh`. Các kiểm thử dùng dữ liệu tạm, không chạm dữ liệu demo của người dùng.
