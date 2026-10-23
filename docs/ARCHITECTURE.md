# Kiến trúc và quy ước

HTTP → routes/controller → service → repository → SQL Server hoặc JSON demo. Frontend không truy cập database hay giữ mật khẩu kết nối. Controller ánh xạ danh sách command cố định; service kiểm tra vai trò, dữ liệu, trạng thái và thực hiện transaction. Database adapter chỉ chịu trách nhiệm lưu/đọc và ánh xạ kiểu.

- `backend/database/`: sửa schema, ràng buộc SQL, kết nối hoặc adapter ở đây.
- `backend/service/`: sửa nghiệp vụ tại đây; không import Express, không dựa vào việc nút có bị ẩn trên UI hay không.
- `frontend/views/`: HTML server-render với EJS escaping. `frontend/public/js/workspace.js` tạo form/bảng/sơ đồ và gọi `/api/action/<command>`; thông tin đưa vào HTML được escape.
- `backend/shared/permissions.js`: danh sách quyền dùng chung ở server. Không lấy role hoặc accountId người thực hiện từ request body; lấy từ session đã kiểm tra lại với account hiện tại.

Ghi nghiệp vụ SQL chạy transaction SERIALIZABLE và application lock `HotelManager.WebWrite`, input tham số hóa, không ghép dữ liệu người dùng vào tên bảng/cột. JSON demo dùng hàng đợi ghi, clone trạng thái và rename file nguyên tử. Không chạy nhiều Node process cùng ghi một file demo.

Phiếu: `PENDING → CONFIRMED → CHECKED_IN → COMPLETED`; `PENDING → CANCELLED` khi người dùng hủy hoặc hết hạn giữ chỗ chưa cọc. Hóa đơn: tạo DRAFT, thêm dòng, thêm chứng từ, xác nhận PAID, cộng điểm, đóng phiếu thuê và chuyển phòng DIRTY trong cùng transaction. SQL trigger kiểm tra tổng dòng/thanh toán/sổ điểm và ngăn sửa chứng từ đã chốt.

Thời gian lưu UTC; hiển thị mặc định Asia/Ho_Chi_Minh. Người dùng chỉ chọn ngày: hệ thống chuẩn hóa giờ trả phòng là 12:00 theo `APP_TIME_ZONE`; nhận phòng được phép ngoài khung 12:00–14:00 dành cho buồng phòng. Giao diện không cho cấu hình lại hai quy tắc này. Chính sách giá hiện dùng số ngày UTC của khoảng lưu trú, tối thiểu 1 ngày, cộng giá lễ theo từng ngày UTC. `APP_TIME_ZONE` đang là cấu hình định hướng; giao diện hiện cố định Asia/Ho_Chi_Minh, chưa hỗ trợ đổi múi giờ từ UI.

HTTP ghi yêu cầu CSRF token lấy từ meta tag, cookie HttpOnly/SameSite Lax. Mật khẩu băm PBKDF2 SHA256 120.000 vòng, salt ngẫu nhiên cho tài khoản tạo mới. Sau đăng nhập session được regenerate. Khóa/đổi quyền/đổi mật khẩu tăng AuthVersion; request kế tiếp kết thúc phiên cũ. Production bị chặn cho tới khi bổ sung session store phù hợp và OTP thật.

Ảnh báo hỏng giới hạn 3 MB, một file, kiểm tra chữ ký PNG/JPEG, tên UUID do server sinh, không phục vụ `data/` như thư mục public. Chỉ người có quyền sơ đồ truy cập ảnh đã gắn báo hỏng. Không ghi password/hash vào API workspace, CSV hay log.

## Thao tác nghiệm thu thủ công

1. Chạy demo, đăng nhập từng email mẫu; kiểm tra menu của Quản lý/Nhân viên/Buồng phòng và thử URL API trái quyền (phải từ chối).
2. Admin tạo/sửa danh mục; thêm khách và cấp thẻ. Nhân viên tạo phiếu tại quầy với giờ nhận hiện tại và cọc nhỏ hơn tiền phòng.
3. Nhận phòng bằng giấy tờ, ghi dịch vụ, đổi giá danh mục sau đó để kiểm tra dòng phát sinh vẫn giữ giá cũ. Thử hủy một dòng dịch vụ chưa lên hóa đơn.
4. Trả phòng, đối chiếu bảng kê, xem/in hóa đơn, kiểm tra điểm và phòng Cần dọn. Thử trả lần hai (phải từ chối).
5. Buồng phòng vào sơ đồ, xác nhận dọn và báo hỏng với ảnh; thử ảnh sai định dạng hoặc quá kích thước.
6. Khách đăng ký bằng email mới, tìm phòng, giữ online và xem phiếu của mình; thử truy cập hóa đơn khách khác (không được).
7. Admin khóa/đổi vai trò nhân viên đang đăng nhập ở trình duyệt khác; request sau của phiên cũ phải bị từ chối. Chuyển Admin bằng OTP demo và kiểm tra cả hai phiên phải đăng nhập lại.
8. Sau khi cấu hình SQL Server thật, lặp lại các luồng; kiểm tra tiền, điểm, lịch trùng và sao lưu trên đúng máy SQL.

Không lưu test tự động trong repo theo yêu cầu. Mọi kiểm tra phát triển tạm thời nằm ngoài mã nguồn.
