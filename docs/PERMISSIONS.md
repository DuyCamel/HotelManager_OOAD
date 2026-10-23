# Quyền theo vai trò

Ma trận này ghi lại phạm vi đang triển khai, dựa trên thống nhất trong cuộc trao đổi. Backend kiểm tra quyền ở service, UI ẩn menu/nút tương ứng; gửi HTTP trực tiếp không bỏ qua được kiểm tra service.

| Chức năng | Admin | Quản lý | Nhân viên | Buồng phòng | Khách |
|---|---|---|---|---|---|
| Tổng quan / báo cáo | Có | Có | Không | Không | Không |
| Sơ đồ phòng | Có | Có | Có | Có | Không |
| Đặt phòng / xác nhận cọc / nhận trả phòng | Có | Có | Có | Không | Đặt online của mình |
| Hồ sơ khách / dịch vụ sử dụng / thẻ / hóa đơn | Có | Có | Có | Không | Hồ sơ, thẻ, phiếu, hóa đơn của mình |
| Tạo/sửa phòng, loại, giá, dịch vụ, giá lễ | Có | Có | Không | Không | Không |
| Tài khoản: xem/sửa/khóa/mở | Có | Có, trừ Admin | Không | Không | Hồ sơ mình |
| Tạo tài khoản nhân viên | Có | Không | Không | Không | Tự đăng ký tài khoản khách |
| Phân quyền / chuyển Admin | Có | Không | Không | Không | Không |
| Dọn / báo hỏng kèm ảnh | Có | Có | Không | Có, tại sơ đồ | Không |
| Cấu hình / audit / sao lưu / khôi phục | Có | Không | Không | Không | Không |

Các diễn giải đang áp dụng để bản web có thể chạy trọn luồng:

- Quản lý bao gồm các nghiệp vụ vận hành của nhân viên và báo cáo, quản lý phòng/danh mục; không có cấu hình database, sao lưu, phân quyền hoặc chuyển Admin.
- “Dịch vụ” của nhân viên là **ghi nhận khách dùng dịch vụ**, không thay đổi danh mục/giá dịch vụ.
- Buồng phòng chỉ có menu nghiệp vụ **Sơ đồ phòng**; hồ sơ cá nhân/đổi mật khẩu và đăng xuất là tiện ích tài khoản chung, không có tổng quan.
- Admin có đầy đủ quyền nghiệp vụ, nhưng dữ liệu tài chính PAID, sổ điểm và audit vẫn bất biến. Không thể chỉnh tay điểm để làm sai sổ điểm hoặc khóa Admin đang hoạt động.
- Chuyển Admin yêu cầu mục tiêu là Quản lý đang hoạt động và OTP. Bản hiện tại dùng OTP demo local; trong transaction Admin cũ chuyển thành Quản lý, người nhận thành Admin. Các phiên liên quan mất hiệu lực.
- SQL Login là tài khoản hạ tầng của ứng dụng, khác tài khoản email trên web. Phân quyền web không thay thế quyền SQL của người đăng nhập trực tiếp bằng SSMS.
