# Kiến trúc MVC theo đối tượng

Chi tiết thư mục và quyền sở hữu ở [MODULES.md](MODULES.md). Luồng: route → controller → model → view. Models chứa nghiệp vụ (được chuyển từ service trước đây) và SQL adapter dùng chung; không bỏ transaction hoặc kiểm tra quyền khi chuyển tên lớp.

- `src/server.js` khởi tạo store/model/app và job nhả giữ chỗ. `src/app.js` gắn Express, session, CSRF, locals và route.
- `config/db.js` chỉ quản lý kết nối/pool; mọi SQL chạy trong `models/`. `database/` chứa đúng ba script khởi tạo/ràng buộc/seed.
- Model từng đối tượng giữ nghiệp vụ; `_shared` giữ store, mapping tổng hợp, adapter SQL/demo, quy tắc ngày/giá và audit helper thật sự dùng chung.
- View từng module dùng layout và partial. Frontend module riêng theo đối tượng; core chỉ giữ state/HTTP/table/dialog. Menu điều hướng đến route/controller/view của module.
- Runtime SQL giữ transaction SERIALIZABLE và application lock; input tham số hóa; chứng từ PAID/ledger/audit giữ bất biến. Demo JSON dùng hàng đợi ghi/clone/rename.
- RBAC và session ở `core/auth/`; role/actor lấy từ account/session hiện hành. HTTP ghi giữ CSRF, cookie HttpOnly/SameSite. Không trả password hash.
- Thời gian lưu UTC, nghiệp vụ ngày theo APP_TIME_ZONE. Hiện chọn ngày, trả 12:00, chặn check-in 12:00–14:00 ở JS. B1/C1 vẫn cần sửa đặt hôm nay và đồng bộ SQL theo phân công; refactor không thay chính sách để che lỗi.
- Ảnh báo hỏng giới hạn 3 MB, PNG/JPEG kiểm tra chữ ký, tên do server sinh, không public thư mục data. Model không biết Express; controller chịu IO upload và gọi model báo hỏng.

Nghiệm thu thủ công: đăng nhập từng vai trò; kiểm tra URL trái quyền; tạo/nhận/dịch vụ/đổi/trả phòng; hóa đơn/điểm và rollback; dọn/báo hỏng; khách chỉ xem phiếu/hóa đơn mình; khóa/đổi quyền/chuyển Admin/restore thu hồi phiên. SQL cần chạy thực tế bằng SSMS. Không có test tự động lưu trong repo.
