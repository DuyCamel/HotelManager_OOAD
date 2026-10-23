# Chọn phần làm việc

| Thư mục | Người phụ trách làm gì | Bắt đầu ở đâu |
|---|---|---|
| [database/](database/README.md) | CSDL SQL Server, SQL kiểm tra dữ liệu, seed, JDBC và repository lưu trữ | [Hướng dẫn kết nối](database/HUONG_DAN_KET_NOI.md) |
| [service/](service/README.md) | Xác thực/quyền, xử lý nghiệp vụ và điều kiện chuyển trạng thái | `service/src/main/java/vn/hotel/service/` |
| [common/](common/README.md) | Model, DTO, lỗi dùng chung, tiện ích băm mật khẩu | Chỉ sửa khi đã thống nhất giữa hai phần |

Chiều phụ thuộc: **common → database → service → frontend**. `backend/pom.xml` chỉ tổng hợp ba module, không đặt logic tại đó. Tên package Java giữ nguyên, không đổi định dạng dữ liệu demo đã lưu.
