# Ánh xạ tài liệu và màn hình

Nguồn: báo cáo chương 1–2, PDF lớp và XML draw.io 26 trang vừa đính kèm. Đã đọc PlantUML nhúng trong UserObject, gồm SQ1–22, sơ đồ đổi phòng, sơ đồ tham chiếu và trang thẻ trùng số. Không dùng thứ tự SQ cũ thay cho bản nguồn mới.

| SQ / nhóm | Màn hình frontend | Backend | Mức hoàn thiện |
|---|---|---|---|
| SQ1, SQ22 Phòng | RoomsScreen | CatalogService | Thêm/sửa/khóa/mở; ảnh lưu đường dẫn, chưa preview/kho ảnh |
| SQ2 Loại phòng | RoomTypesScreen | CatalogService | Sức chứa, giường, 3 mức giá; tiện ích lưu chuỗi, chưa liên kết danh mục theo mã |
| SQ3 Dịch vụ | ServicesScreen | CatalogService | Thêm/sửa/ngừng; không xóa vĩnh viễn |
| SQ4 Giá lễ | HolidaysScreen | CatalogService, Rules | Khoảng ngày, chặn trùng, tăng phần trăm và xem trước |
| SQ5 Buồng phòng | HousekeepingScreen | HousekeepingService | Lọc, hạn dọn, dọn xong, thiệt hại/ảnh; quá hạn được tính khi xem, chưa có cờ máy chủ |
| SQ6–7 Truy cập | LoginFrame | AuthService, Passwords | Đăng ký khách, đăng nhập, kiểm tra phiên/quyền |
| SQ8 Tài khoản | AccountsScreen | AuthService | Hai tab, tạo nhân viên, sửa, khóa/khôi phục; tài khoản vô hiệu màu xám xếp cuối |
| Tham chiếu phân quyền | AccountsScreen | AuthService | Đổi vai trò, chuyển Admin cũ thành Quản lý; OTP 5 phút/5 lần là mô phỏng trên UI |
| SQ9 Nhật ký | AuditScreen | AdminService | Tìm mã, xem chi tiết, xuất/in; chưa có bộ truy vết liên kết và lọc thời gian riêng |
| SQ10 Cấu hình | SettingsScreen | AdminService | Thông tin, giờ và ngân hàng tham khảo; có chọn logo và lưu mốc/phần trăm phụ thu để duyệt; chưa tính phí/VietQR |
| SQ11–12 Dữ liệu | BackupsScreen | AdminService, FileHotelRepository | Sao lưu file, chọn tệp khôi phục, sao an toàn, thu hồi phiên; chưa có CSDL server/dung lượng |
| SQ13 Hồ sơ | CustomersScreen | CustomerService | Thêm/sửa/lưu trữ, chặn trùng giấy tờ và giao dịch dang dở; chưa xóa vĩnh viễn |
| SQ14 / trang 23 Thẻ | MembershipsScreen, ProfileScreen | CustomerService, BillingService | Cấp/vô hiệu, điểm tự động, xem điểm/hạng; ngưỡng demo |
| SQ15–16 Đặt phòng | BookingScreen | BookingService | Tra cứu theo thời gian/số người, online/tại quầy; một phiếu một phòng, không QR |
| SQ17 Phiếu đặt | ReservationsScreen | BookingService | Cọc thủ công, hết hạn chưa cọc, hủy chưa cọc; hủy đã cọc chờ chính sách hoàn |
| SQ18 Nhận phòng | ReservationsScreen | BookingService | Nhập giấy tờ, check-in, tạo Stay; chưa in phiếu thuê riêng |
| Đổi phòng | StaysScreen | BookingService | Kiểm tra lại phòng, phụ thu, cập nhật và dọn phòng cũ |
| SQ19 Checkout | StaysScreen | BillingService | Bảng kê trước thu, tất toán và checkout một bước; dịch vụ/giảm giá bằng 0 theo phạm vi mới |
| SQ20 Hóa đơn | InvoicesScreen | BillingService | Tra cứu, chi tiết và in lại; PDF thông qua máy in OS |
| SQ21 Báo cáo | ReportsScreen | ReportService | Doanh thu theo ngày, biểu đồ, công suất và tỷ lệ hủy, CSV/in; thiếu XLSX |
| Lọc/tìm/phân trang | DataTable | Phạm vi dữ liệu kiểm tra ở service | Tìm kiếm và phân trang phía desktop; xuất toàn bộ kết quả lọc, in trang đang xem |

Ngoài phạm vi đã chốt của báo cáo mới: gia hạn lưu trú, nhập/sửa dịch vụ phát sinh, tồn kho minibar, Google/Facebook, quét CCCD và khai báo tạm trú. Có thể bổ sung sau, không dựng nút giả báo thành công.
