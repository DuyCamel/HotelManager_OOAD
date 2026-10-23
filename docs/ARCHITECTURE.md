# Kiến trúc Java Desktop

Frontend và backend là **hai module mã nguồn**, chạy trong cùng tiến trình JVM. Đây là tách lớp desktop, chưa phải client/server HTTP. Backend không import Swing hoặc package frontend. Frontend gọi service thông qua đối tượng `HotelBackend`; không mở file hay gọi repository nghiệp vụ trực tiếp.

Luồng xử lý: sự kiện Swing → màn hình/controller → service → repository → dữ liệu file. DTO chỉ truyền kết quả cần thiết, tài khoản phía UI không có passwordHash.

## Trách nhiệm

- `domain`: record bất biến mô tả dữ liệu; enum mô tả trạng thái. Tiền dùng `long` theo đồng Việt Nam.
- `service`: kiểm tra quyền, dữ liệu và điều kiện chuyển trạng thái trước ghi; không đặt quy tắc chỉ trong nút UI.
- `security`: PBKDF2 có salt, phiên trong bộ nhớ và thu hồi khi khóa/đổi vai trò/khôi phục.
- `repository`: đồng bộ trong một tiến trình, sao chép dữ liệu trước khi xử lý, ghi tệp tạm rồi đổi tên. Lỗi nghiệp vụ hoặc ghi file không làm commit thay đổi nửa chừng.
- `view`: mỗi màn hình một file, dùng chung DataTable/Forms. Swing là frontend; không phải trang web công khai.

`HotelData` dùng map và Java serialization cho demo, có bộ lọc lớp khi đọc. Không mở bản sao không tin cậy. Cổng `HotelRepository` là nơi thay bằng JDBC. Cần thiết kế lại transaction/query theo DB khi triển khai thật; cổng này hiện dùng callback trên snapshot, chưa tối ưu dữ liệu lớn.

## Đối chiếu sơ đồ lớp

Dùng tài liệu vừa đính kèm làm nguồn hiện hành, giữ thẻ thành viên, cấu hình, sao lưu và thiệt hại trong phạm vi giao diện. Không tự bỏ theo thảo luận cũ. Vai trò code là enum phục vụ kiểm soát quyền, không coi là bổ sung lớp Quyền vào sơ đồ phân tích. Các lớp Admin/Quản lý/Lễ tân trong mô hình phân tích được ánh xạ thành vai trò của Account trong bản demo; chưa mô phỏng kế thừa từng loại nhân viên.

Một Booking và một Stay hiện quản lý một phòng. Chi tiết phiếu thuê và thông tin phòng được gộp vào aggregate Stay để chạy mẫu; đây là quyết định triển khai rút gọn, **chưa ánh xạ một-một toàn bộ lớp trên PDF**. Nên thống nhất lại mô hình trước khi tạo ERD/JDBC chính thức. Khi cần đặt nhiều phòng, phải thêm BookingLine/StayDetail và kiểm tra đồng thời cả tập phòng, không sao chép luồng một phòng rồi bỏ kiểm tra cuối.

## Quy tắc đang chạy

Khoảng lưu trú là [nhận, trả), cho phép hai phiếu tiếp nối tại cùng mốc. Phiếu chờ xác nhận chưa cọc giữ 30 phút; hết hạn tự hủy khi tìm/đọc/tác vụ timer hoạt động. Khi app đóng không có máy chủ chạy ngầm; lần mở sau kiểm tra lại. Phòng bảo trì/ngừng hoạt động không được đặt. Phòng cần dọn có thể đặt cho tương lai nhưng không check-in đến khi sạch.

Đặt online tạo PENDING, xác nhận cọc thủ công chuyển CONFIRMED. Nhận phòng chỉ khi đã xác nhận, đúng khoảng thời gian và phòng sạch. Phiếu demo có ngày nhận trong hiện tại để thử ngay. Đặt tại quầy cần tiền cọc dương. Hủy phiếu đã cọc bị chặn vì chưa chốt chính sách hoàn cọc.

Checkout lấy bảng kê từ dữ liệu backend, kiểm tra lại số phải thu, tạo hóa đơn và giao dịch, đóng lưu trú, chuyển Cần dọn cùng một lần ghi. Thẻ đang hoạt động được cộng tổng giá trị hóa đơn / 10.000 điểm, không cộng tay; các ngưỡng 100/500/1.000 là cấu hình demo trong code. In lại chỉ đọc hóa đơn.

Đổi phòng kiểm tra khả dụng và sạch, cộng chênh lệch giá còn lại nếu dương; phòng cũ chuyển Cần dọn. Giá đổi phòng và ngày lẻ là chính sách tạm cho chạy thử, cần chốt trước sản phẩm thật.

## Giới hạn vận hành

Một tiến trình, một file dữ liệu. Chưa có xác minh số điện thoại thật, OTP SMS thật, callback thanh toán thật, HTTPS, phân quyền nhiều chi nhánh, lịch tác vụ máy chủ và locking nhiều client. Không dùng bản demo làm ứng dụng vận hành thật. Mặc định nhận 14:00/trả 12:00; form đặt mới đọc giờ từ cấu hình. Mốc phụ thu trả trễ được lưu để duyệt UI nhưng chưa đưa vào phép tính checkout. Công suất trong báo cáo là phút lưu trú thực tế / (số phòng đang hoạt động × số phút trong khoảng ngày), chưa theo lịch sử đóng/mở phòng. Tỷ lệ hủy lấy phiếu có ngày nhận dự kiến thuộc khoảng chọn.

## Gói chuẩn bị JDBC SQL Server

`infrastructure/database` cung cấp DatabaseConfig, ConnectionFactory và DatabaseConnectionCheck. Chúng đọc cấu hình từng máy, khởi tạo SET options cần cho chỉ mục lọc/cột tính toán và thực hiện kiểm tra SELECT. Chưa thay `FileHotelRepository` tại HotelBackend. Schema SQL gồm 22 bảng, có bảng trung gian dịch vụ, chi tiết hóa đơn, sổ điểm và lịch sử đổi phòng để triển khai persistence sau; xem database/README.md trước khi ánh xạ DAO.
