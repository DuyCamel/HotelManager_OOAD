# Quyền theo vai trò

Quản lý (`MANAGER`) phụ trách tài khoản, phân quyền và quản trị dữ liệu hệ thống. Admin (`ADMIN`) phụ trách vận hành khách sạn. Backend kiểm tra quyền; menu và trang vào sau đăng nhập tuân theo cùng phạm vi.

| Chức năng | Admin | Quản lý | Lễ tân | Buồng phòng | Khách |
|---|---|---|---|---|---|
| Tổng quan / báo cáo | Có | Không | Không | Không | Không |
| Sơ đồ phòng | Có | Không | Có | Có | Không |
| Đặt phòng / xác nhận cọc / nhận trả phòng | Có | Không | Có | Không | Đặt online của mình |
| Hồ sơ khách / dịch vụ sử dụng / thẻ / hóa đơn | Có | Không | Có | Không | Hồ sơ, thẻ, phiếu, hóa đơn của mình |
| Tạo/sửa phòng, loại, giá, dịch vụ, giá lễ | Có | Không | Không | Không | Không |
| Tài khoản: xem/sửa/khóa/mở | Xem; sửa/khóa/mở trừ Quản lý | Có, không khóa Quản lý | Không | Không | Hồ sơ mình |
| Tạo tài khoản nhân viên | Có, không tạo Quản lý | Có, không tạo Quản lý | Không | Không | Tự đăng ký tài khoản khách |
| Đổi vai trò tài khoản hiện có / chuyển quyền Quản lý | Không / Không | Có / Có | Không | Không | Không |
| Dọn / báo hỏng kèm ảnh | Có | Không | Không | Có, tại sơ đồ | Không |
| Cấu hình vận hành / thanh toán | Có | Không | Không | Không | Không |
| Audit / sao lưu / khôi phục | Không | Có | Không | Không | Không |

- Quản lý vào trang Tài khoản sau đăng nhập; menu nghiệp vụ gồm Tài khoản & phân quyền, Sao lưu & khôi phục, Nhật ký hoạt động. `/api/data` chỉ trả dữ liệu quản trị cho vai trò này và không tải hay xử lý đặt phòng.
- Admin bao gồm nghiệp vụ Lễ tân, báo cáo, phòng/danh mục, tài khoản thường và cấu hình khách sạn/thanh toán. Admin có thể chọn vai trò nhân viên khi tạo tài khoản; việc đổi vai trò tài khoản hiện có dành cho Quản lý.
- Không thể tạo hoặc cấp vai trò Quản lý bằng biểu mẫu tài khoản thông thường. Admin không được sửa hay khóa Quản lý.
- Chuyển quyền Quản lý yêu cầu người nhận là Admin đang hoạt động và xác nhận OTP. Trong transaction, Quản lý cũ trở thành Admin, người nhận trở thành Quản lý; phiên của cả hai mất hiệu lực. Bản hiện tại dùng OTP demo local.
- Dịch vụ của Lễ tân là ghi nhận khách dùng dịch vụ; Lễ tân không sửa danh mục/giá dịch vụ.
- Buồng phòng chỉ có menu nghiệp vụ Sơ đồ phòng. Hồ sơ cá nhân, đổi mật khẩu và đăng xuất là tiện ích tài khoản chung.
- Dữ liệu tài chính đã thanh toán, sổ điểm và nhật ký vẫn tuân theo các ràng buộc bất biến.
- SQL Login là tài khoản hạ tầng của ứng dụng, khác tài khoản email trên web. Phân quyền web không thay thế quyền SQL khi truy cập trực tiếp bằng SSMS.
