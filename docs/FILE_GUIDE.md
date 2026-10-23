# Danh mục file Java

Chọn phần database/service/common dưới backend trước, rồi tìm file trong bảng. Mỗi file có chú thích trách nhiệm.

| File | Trách nhiệm |
|---|---|
| `backend/common/src/main/java/vn/hotel/domain/Account.java` | Thông tin xác thực nội bộ backend, không truyền sang giao diện. |
| `backend/common/src/main/java/vn/hotel/domain/AuditEvent.java` | Nhật ký nghiệp vụ; không lưu mật khẩu hoặc OTP. |
| `backend/common/src/main/java/vn/hotel/domain/Booking.java` | Phiếu đặt một phòng; lưu giá chốt để không đổi theo bảng giá mới. |
| `backend/common/src/main/java/vn/hotel/domain/BookingStatus.java` | Vòng đời phiếu đặt; xác nhận cọc khác tất toán. |
| `backend/common/src/main/java/vn/hotel/domain/Customer.java` | Hồ sơ khách; có thể không liên kết tài khoản. |
| `backend/common/src/main/java/vn/hotel/domain/DamageReport.java` | Báo thiệt hại và đường dẫn ảnh do buồng phòng cung cấp. |
| `backend/common/src/main/java/vn/hotel/domain/HolidayRate.java` | Đợt tăng giá theo ngày, bao gồm ngày đầu và cuối. |
| `backend/common/src/main/java/vn/hotel/domain/HotelService.java` | Danh mục dịch vụ; chưa quản lý tồn kho minibar. |
| `backend/common/src/main/java/vn/hotel/domain/Invoice.java` | Hóa đơn bất biến sau khi đã thu tiền, dùng để in lại. |
| `backend/common/src/main/java/vn/hotel/domain/Membership.java` | Thẻ duy nhất cho mỗi khách; điểm chỉ cộng sau checkout. |
| `backend/common/src/main/java/vn/hotel/domain/Payment.java` | Giao dịch cọc hoặc tất toán; không tạo lại khi in hóa đơn. |
| `backend/common/src/main/java/vn/hotel/domain/Role.java` | Vai trò thực thi quyền; không phải lớp Quyền trong sơ đồ phân tích. |
| `backend/common/src/main/java/vn/hotel/domain/Room.java` | Phòng vật lý, ảnh tham chiếu và hạn dọn 90 phút. |
| `backend/common/src/main/java/vn/hotel/domain/RoomStatus.java` | Trạng thái vệ sinh và sử dụng thực tế của phòng. |
| `backend/common/src/main/java/vn/hotel/domain/RoomType.java` | Loại phòng và giá cơ bản; tiền tính bằng đồng nguyên. |
| `backend/common/src/main/java/vn/hotel/domain/Stay.java` | Phiếu thuê một phòng, thông tin giấy tờ và phụ thu đổi phòng. |
| `backend/common/src/main/java/vn/hotel/dto/AccountView.java` | Dữ liệu tài khoản dành cho UI, không có mật khẩu băm. |
| `backend/common/src/main/java/vn/hotel/dto/Bill.java` | Bảng kê tạm tính phải được hiển thị trước xác nhận thu tiền. |
| `backend/common/src/main/java/vn/hotel/dto/ReportMetrics.java` | Chỉ số trong khoảng ngày: công suất theo phút lưu trú và tỷ lệ hủy theo ngày nhận dự kiến. |
| `backend/common/src/main/java/vn/hotel/dto/Session.java` | Phiên đăng nhập chỉ chứa dữ liệu an toàn cho frontend. |
| `backend/common/src/main/java/vn/hotel/dto/TransferChallenge.java` | Yêu cầu OTP của bản demo; demoCode chỉ phục vụ mô phỏng, phải bỏ khi nối SMS thật. |
| `backend/common/src/main/java/vn/hotel/exception/BusinessException.java` | Lỗi nghiệp vụ có thông báo tiếng Việt để giao diện hiển thị. |
| `backend/common/src/main/java/vn/hotel/security/Passwords.java` | Băm mật khẩu PBKDF2, salt ngẫu nhiên cho từng tài khoản. |
| `backend/database/src/main/java/vn/hotel/bootstrap/DemoData.java` | Dữ liệu giả chạy lần đầu và năm tài khoản demo, không tái ghi đè dữ liệu cũ. |
| `backend/database/src/main/java/vn/hotel/infrastructure/database/ConnectionFactory.java` | Mở JDBC SQL Server; utility này chưa thay repository file trong HotelBackend. |
| `backend/database/src/main/java/vn/hotel/infrastructure/database/DatabaseConfig.java` | Đọc cấu hình riêng từng máy; không nhúng mật khẩu vào source hoặc log. |
| `backend/database/src/main/java/vn/hotel/infrastructure/database/DatabaseConnectionCheck.java` | Kiểm tra kết nối thật bằng SELECT; không chạy seed, không ghi/xóa dữ liệu. |
| `backend/database/src/main/java/vn/hotel/repository/FileHotelRepository.java` | Lưu file nguyên tử, khóa truy cập và copy trước thay đổi để lỗi không ghi nửa chừng. |
| `backend/database/src/main/java/vn/hotel/repository/HotelData.java` | Trạng thái lưu trữ phiên bản demo; chỉ repository/service được truy cập. |
| `backend/database/src/main/java/vn/hotel/repository/HotelRepository.java` | Cổng lưu trữ tách nghiệp vụ khỏi file; có thể thay bằng JDBC sau này. |
| `backend/service/src/main/java/vn/hotel/api/HotelBackend.java` | Điểm ghép backend; frontend chỉ gọi service, không đọc repository hoặc file dữ liệu. |
| `backend/service/src/main/java/vn/hotel/security/AuthService.java` | Quản lý phiên và quyền phía backend; chuyển Admin thật cần SMS adapter bổ sung. |
| `backend/service/src/main/java/vn/hotel/service/AdminService.java` | Cấu hình, nhật ký, sao lưu và khôi phục có bản sao an toàn trước thay thế. |
| `backend/service/src/main/java/vn/hotel/service/BillingService.java` | Bảng kê trước thu tiền, lập hóa đơn đúng một lần và tích điểm; dịch vụ phát sinh đang ngoài phạm vi. |
| `backend/service/src/main/java/vn/hotel/service/BookingService.java` | Đặt trực tuyến/tại quầy, xác nhận cọc, nhả quá hạn, nhận và đổi phòng. |
| `backend/service/src/main/java/vn/hotel/service/CatalogService.java` | Danh mục phòng, loại phòng, giá cơ bản, dịch vụ và giá lễ. |
| `backend/service/src/main/java/vn/hotel/service/CustomerService.java` | Hồ sơ khách, liên kết tài khoản và thẻ; không có API chỉnh điểm thủ công. |
| `backend/service/src/main/java/vn/hotel/service/HousekeepingService.java` | Dọn phòng và thiệt hại, kiểm tra ảnh trước chuyển bảo trì. |
| `backend/service/src/main/java/vn/hotel/service/ReportService.java` | Tổng hợp doanh thu theo ngày lập hóa đơn; không nhầm tiền cọc thành doanh thu. |
| `backend/service/src/main/java/vn/hotel/service/Rules.java` | Quy tắc dùng chung: khoảng thời gian nửa mở, giá chốt, mã và nhật ký. |
| `frontend/src/main/java/vn/hotel/app/HotelApplication.java` | Điểm chạy ứng dụng desktop; có thể chọn file dữ liệu qua -Dhotel.data. |
| `frontend/src/main/java/vn/hotel/controller/AppController.java` | Điều phối đăng nhập, phiên, màn hình và thông báo; không chứa quy tắc nghiệp vụ. |
| `frontend/src/main/java/vn/hotel/ui/DataTable.java` | Bảng dữ liệu có tìm kiếm, phân trang, CSV và hộp thoại in của hệ điều hành. |
| `frontend/src/main/java/vn/hotel/ui/Forms.java` | Biểu mẫu nhập liệu dùng lại, mã đối tượng tách nhãn hiển thị. |
| `frontend/src/main/java/vn/hotel/ui/RevenueChart.java` | Biểu đồ doanh thu Swing từ hóa đơn thật trong dữ liệu demo, không dùng ảnh giả. |
| `frontend/src/main/java/vn/hotel/ui/Theme.java` | Màu sắc, chữ và thành phần giao diện dùng chung. |
| `frontend/src/main/java/vn/hotel/view/AccountsScreen.java` | Hai tab tài khoản; chỉ tab nhân viên có phân quyền/chuyển Admin mô phỏng. |
| `frontend/src/main/java/vn/hotel/view/AuditScreen.java` | Nhật ký có tìm mã đối tượng và xuất CSV; không hiển thị bí mật xác thực. |
| `frontend/src/main/java/vn/hotel/view/BackupsScreen.java` | Màn hình sao lưu và khôi phục có xác nhận thay thế dữ liệu. |
| `frontend/src/main/java/vn/hotel/view/BookingScreen.java` | Tìm phòng theo khoảng thời gian và sức chứa, đặt trực tuyến hoặc tại quầy. |
| `frontend/src/main/java/vn/hotel/view/CustomersScreen.java` | Tìm kiếm, tạo và sửa hồ sơ; hiển thị mã tài khoản, không lộ username. |
| `frontend/src/main/java/vn/hotel/view/DashboardScreen.java` | Trang đầu gồm chỉ số thật từ dữ liệu demo và lưới tình trạng phòng. |
| `frontend/src/main/java/vn/hotel/view/HolidaysScreen.java` | Quản lý khoảng ngày giá lễ và xem thử giá sau tăng. |
| `frontend/src/main/java/vn/hotel/view/HousekeepingScreen.java` | Lưới phòng có lọc trạng thái, đồng hồ, dọn xong và chọn ảnh báo hư hại. |
| `frontend/src/main/java/vn/hotel/view/InvoicesScreen.java` | Tra cứu và in lại hóa đơn bất biến, không gọi thanh toán lần nữa. |
| `frontend/src/main/java/vn/hotel/view/LoginFrame.java` | Đăng nhập chung và đăng ký riêng cho khách; nhân viên do Admin tạo. |
| `frontend/src/main/java/vn/hotel/view/MainFrame.java` | Điều hướng theo vai trò, làm mới dọn phòng và nhả phiếu chờ cọc định kỳ khi app đang chạy. |
| `frontend/src/main/java/vn/hotel/view/MembershipsScreen.java` | Danh sách thẻ, cấp thẻ và vô hiệu hóa; hạng được suy ra từ điểm. |
| `frontend/src/main/java/vn/hotel/view/ProfileScreen.java` | Hồ sơ khách tự xem với điểm, hạng thẻ và trạng thái. |
| `frontend/src/main/java/vn/hotel/view/ReportsScreen.java` | Báo cáo doanh thu theo khoảng ngày với bảng và xuất CSV/in. |
| `frontend/src/main/java/vn/hotel/view/ReservationsScreen.java` | Phiếu đặt cho nhân viên hoặc dữ liệu riêng của khách; xác nhận cọc và nhận phòng. |
| `frontend/src/main/java/vn/hotel/view/RoomTypesScreen.java` | Giao diện cấu hình loại phòng, tiện ích và giá cơ bản. |
| `frontend/src/main/java/vn/hotel/view/RoomsScreen.java` | Danh sách, thêm/sửa thông tin và khóa/mở phòng có kiểm tra giao dịch. |
| `frontend/src/main/java/vn/hotel/view/Screen.java` | Khung tiêu đề và hành động chung cho từng màn hình nghiệp vụ. |
| `frontend/src/main/java/vn/hotel/view/ServicesScreen.java` | Thêm/sửa/ngừng danh mục dịch vụ, không nhập tồn kho. |
| `frontend/src/main/java/vn/hotel/view/SettingsScreen.java` | Biểu mẫu thông tin khách sạn, giờ nhận trả và tài khoản ngân hàng tham khảo. |
| `frontend/src/main/java/vn/hotel/view/StaysScreen.java` | Phiếu thuê, đổi phòng, bảng kê trước xác nhận thu tiền và trả phòng. |
