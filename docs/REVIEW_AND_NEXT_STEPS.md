# Các điểm cần chốt sau khi xem bản đầu

1. Chọn DB (MySQL/SQL Server), chốt ERD và tách truy vấn JDBC từ repository file. Bổ sung migration, ràng buộc và kiểm thử transaction đồng thời.
2. Thống nhất lại PDF lớp: đặt một hay nhiều phòng; có giữ chi tiết phiếu thuê 1–1 và lớp nhân viên kế thừa không. Bản code rút gọn đã ghi rõ ở ARCHITECTURE.
3. Chốt chính sách cọc: tỷ lệ, hạn giữ, hoàn cọc và hủy đã cọc; kiểm tra mã tham chiếu thanh toán duy nhất khi nối ngân hàng.
4. Chốt cách tính giờ/đêm/ngày, ngày lẻ, đổi phòng giữa ngày và phụ thu trả trễ. Hiện tính ngày bằng giá dailyPrice chốt khi đặt.
5. Thay demo OTP bằng SmsGateway thật, chỉ gửi đến số đã xác minh; bỏ demoCode khỏi DTO, xử lý gửi lỗi và không log mã.
6. Bổ sung in phiếu thuê, XLSX/PDF độc lập, chuẩn hóa công suất theo lịch sử phòng và bộ truy vết nhiều đối tượng.
7. Tách service khỏi EDT bằng SwingWorker khi dùng DB/mạng; dữ liệu lớn cần phân trang từ backend thay vì tải toàn bộ về DataTable.
8. Lưu ảnh vào kho được quản lý thay vì đường dẫn cục bộ; thêm preview, kiểm tra MIME/kích thước và backup ảnh.

Gợi ý chia việc: UI, danh mục/giá, đặt phòng/lưu trú, hóa đơn/báo cáo, khách/thành viên, bảo mật/lưu trữ. Chưa gán tên hoặc số thành viên vì đây là đồ án OOAD, không dùng phân công 6 người của dự án CNPM khác.
