# Phần service — xử lý nghiệp vụ

Làm việc ở đây khi cần chỉnh quy trình hoặc quy tắc phía Java. Không mở kết nối JDBC/viết câu SQL trong màn hình Swing.

| File / package trong src/main/java/vn/hotel | Trách nhiệm |
|---|---|
| `service/CatalogService.java` | Phòng, loại phòng, dịch vụ, giá lễ |
| `service/BookingService.java` | Tìm phòng, đặt phòng, cọc, nhận/đổi phòng |
| `service/BillingService.java` | Bảng kê, thanh toán, hóa đơn và điểm |
| `service/HousekeepingService.java` | Dọn phòng và báo hư hại |
| `service/CustomerService.java` | Hồ sơ khách và thẻ thành viên |
| `service/AdminService.java` | Cấu hình, nhật ký và sao lưu |
| `service/ReportService.java` | Báo cáo và chỉ số |
| `service/Rules.java` | Quy tắc dùng chung của nghiệp vụ |
| `security/AuthService.java` | Đăng nhập, phiên, phân quyền và OTP demo |
| `api/HotelBackend.java` | Ghép các service với repository, điểm nối cho frontend |


Hiện service vẫn dùng `FileHotelRepository`. Khi thay JDBC, phối hợp với phần database để giữ tính nguyên tử, kiểm tra quyền và ánh xạ domain/DTO; không chỉ đổi connection string rồi coi như đã hoàn tất.
