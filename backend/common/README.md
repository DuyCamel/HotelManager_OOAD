# Thành phần dùng chung

Thư mục `src/main/java/vn/hotel/` gồm:

- `domain/`: thực thể và mã trạng thái nghiệp vụ.
- `dto/`: dữ liệu trả cho frontend, phiên và bảng kê.
- `exception/`: lỗi nghiệp vụ.
- `security/Passwords.java`: băm/kiểm tra mật khẩu dùng cho tài khoản thật và dữ liệu mẫu.

Không phụ thuộc database, service hoặc Swing. Các thay đổi model/DTO cần thống nhất giữa người làm database và service trước khi tích hợp.
