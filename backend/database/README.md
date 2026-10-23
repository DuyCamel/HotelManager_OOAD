# Phần database — CSDL và lưu trữ

**Người mới cài máy: đọc [HUONG_DAN_KET_NOI.md](HUONG_DAN_KET_NOI.md) trước.** Hướng dẫn đi từ kiểm tra SQL Server đến chạy công cụ kết nối Java, kèm kết quả mong đợi và lỗi thường gặp.

| Thư mục / file | Nội dung |
|---|---|
| `sql/001_create_database.sql` | Tạo CSDL HotelManager_OOAD và 22 bảng |
| `sql/002_constraints_and_logic.sql` | Ràng buộc, trigger, view, function và procedure |
| `sql/003_seed_demo_data.sql` | Dữ liệu giả đủ nhiều để kiểm thử |
| `config/database.example.properties` | Mẫu cấu hình để từng người copy |
| `config/database.properties` | Cấu hình riêng máy, đã gitignore |
| `lib/` | Đặt Microsoft JDBC JAR của máy mình tại đây |
| `src/main/java/vn/hotel/infrastructure/database/` | Đọc cấu hình, mở connection và kiểm tra kết nối |
| `src/main/java/vn/hotel/repository/` | Cổng lưu trữ, dữ liệu và repository file hiện tại |
| `src/main/java/vn/hotel/bootstrap/` | Dữ liệu mẫu cho chế độ file Java |
| [SQL_REFERENCE.md](SQL_REFERENCE.md) | Chi tiết schema, dữ liệu mẫu, quyền và câu SQL thử nghiệp vụ |

Chạy SQL theo **001 → 002 → 003**. Nút chạy ứng dụng `run.bat` vẫn dùng repository file; `check-db.bat` chỉ kiểm tra kết nối SQL thật, chưa chuyển toàn bộ service sang JDBC.

Các nút/script chạy chung nằm ở gốc repo: `configure-db.bat`, `check-db.bat`, `run.bat`. Không commit mật khẩu hoặc JDBC JAR/DLL.
