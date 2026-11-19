# Kiến trúc MVC theo đối tượng

Chi tiết thư mục và quyền sở hữu ở [MODULES.md](MODULES.md). Luồng: route → controller → model → view. Models chứa nghiệp vụ (được chuyển từ service trước đây) và SQL adapter dùng chung; không bỏ transaction hoặc kiểm tra quyền khi chuyển tên lớp.

- `src/server.js` khởi tạo store/model/app và job nhả giữ chỗ. `src/app.js` gắn Express, session, CSRF, locals và route.
- `config/db.js` chỉ quản lý kết nối/pool; mọi SQL runtime chạy trong `models/`. `database/HotelManagerOOAD.sql` là script chuẩn duy nhất để tạo/nâng cấp/ràng buộc/seed schema trong database ứng dụng đang chọn; tên database tùy cấu hình `DB_NAME`.
- Model từng đối tượng giữ nghiệp vụ; `_shared` giữ store, mapping tổng hợp, adapter SQL/demo, quy tắc ngày/giá và audit helper thật sự dùng chung.
- View từng module dùng layout và partial. Frontend module riêng theo đối tượng; core chỉ giữ state/HTTP/table/dialog. Menu điều hướng đến route/controller/view của module.
- Runtime SQL giữ transaction SERIALIZABLE và application lock; input tham số hóa. Trigger finalization xử lý `DRAFT → PAID`, liên kết usage và cộng ledger một lần trong cùng transaction; chứng từ PAID/ledger/audit giữ bất biến. Schema version 4 lưu snapshot chứng từ. Demo JSON dùng hàng đợi ghi/clone/rename.
- RBAC và session ở `core/auth/`; Quản lý (`MANAGER`) phụ trách tài khoản, phân quyền và quản trị dữ liệu hệ thống, Admin (`ADMIN`) phụ trách vận hành; role/actor lấy từ account/session hiện hành. HTTP ghi giữ CSRF, cookie HttpOnly/SameSite. Không trả password hash.
- Thời gian lưu UTC, nghiệp vụ ngày theo APP_TIME_ZONE. Current room lấy từ dòng `StayRoomHistory` đang mở, không lưu thêm `Stay.RoomId`. Giá lễ phân biệt `ONE_OFF` theo ngày đầy đủ và `ANNUAL` theo `MM-DD`.
- Ảnh báo hỏng giới hạn 3 MB, PNG/JPEG kiểm tra chữ ký, tên do server sinh, không public thư mục data. Model không biết Express; controller chịu IO upload và gọi model báo hỏng.

Nghiệm thu thủ công: đăng nhập từng vai trò; kiểm tra URL trái quyền; tạo/nhận/dịch vụ/đổi/trả phòng; hóa đơn/điểm và rollback; dọn/báo hỏng; khách chỉ xem phiếu/hóa đơn mình; khóa/đổi quyền/chuyển quyền Quản lý/restore thu hồi phiên. SQL cần chạy thực tế bằng SSMS rồi kiểm tra bằng `npm run db:check`; kiểm tra dictionary không thay bước này.
