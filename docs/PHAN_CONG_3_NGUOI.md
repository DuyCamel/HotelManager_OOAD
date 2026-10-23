# Phân công phần còn lại — 3 thành viên

Rà soát từ nhánh `main` tại commit `d2c9ba48df8533fa353b5a2c4898772170fd265c`, ngày 23/10/2026. Chưa có tên thành viên nên dùng TV1, TV2, TV3 để nhóm thay tên sau. Mỗi người hoàn thiện cả backend và frontend của phần mình; không giao toàn bộ giao diện cho một người.

**Đây là phân công phần việc còn lại, không phải yêu cầu viết lại toàn bộ repo.** Các khối `TASK-BAN-GIAO` ở đầu file chỉ là chú thích giao việc. Chưa triển khai các tính năng liệt kê bên dưới và chưa sửa lỗi nghiệp vụ trong đợt ghi task này.

## 1. Phần đã có, tiếp tục sử dụng

- Web Express/EJS, tách frontend/backend, adapter SQL/demo, `.env_ex`, hướng dẫn kết nối, F5.
- Đăng nhập email, khách tự đăng ký, Admin tạo nhân viên; phân quyền, khóa/mở tài khoản, đổi mật khẩu và thu hồi phiên.
- Đặt phòng/cọc thủ công/hết hạn, nhận/đổi phòng, ghi dịch vụ, trả phòng và hóa đơn, điểm thẻ cơ bản.
- CRUD danh mục cơ bản; sơ đồ phòng, xác nhận dọn/báo hỏng có ảnh; báo cáo CSV cơ bản; backup demo/SQL và restore demo.

Các phần này **đã có mã**, nhưng cần hoàn thiện giao diện/biên nghiệp vụ và nghiệm thu trên SQL Server. Không ghi lại tất cả thành “chưa làm backend”.

## 2. Ba phần việc

| Người | Phần phụ trách | Backend chính | Frontend phải hoàn thiện |
|---|---|---|---|
| **TV1** | **Hệ thống, tài khoản và hồ sơ khách** | auth/account/profile/customer/system/read, bảo mật và ghép route/controller | Đăng nhập/đăng ký; 2 tab tài khoản; hồ sơ khách/thẻ; hồ sơ cá nhân; audit; sao lưu/khôi phục; khung UI dùng chung |
| **TV2** | **Đặt phòng, lưu trú và thanh toán** | booking/billing/helpers, quy tắc ngày/giờ/giá và gia hạn | Tìm/đặt online và tại quầy; chi tiết phiếu; nhận/đổi/gia hạn; dịch vụ phát sinh; bảng kê trước thu; hóa đơn/in |
| **TV3** | **Phòng, buồng phòng, báo cáo và database** | catalog/housekeeping, truy vấn báo cáo; schema/repository/SQL/seed | Ảnh/tiện ích phòng; loại/giá/dịch vụ/giá lễ; sơ đồ có countdown và tự cập nhật; lọc/báo cáo doanh thu |

Chia theo khối lượng còn lại: TV1 có nhiều màn hình hệ thống; TV2 có nghiệp vụ giao dịch phức tạp; TV3 có danh mục/buồng phòng và phần tích hợp SQL. Không đánh giá độ nặng chỉ bằng số file. Mỗi phần có 6 đầu việc; C5 là tối ưu sau luồng chính, A4 phụ thuộc nhà cung cấp SMS.

**P0**: làm trước vì có thể chặn luồng hoặc làm lệch dữ liệu. **P1**: hoàn thiện bản đồ án. **P2**: làm sau các luồng chính. “Nghiệm thu” nghĩa là kiểm tra/sửa phần có sẵn, không viết lại vô điều kiện.

## 3. TV1 — Hệ thống, tài khoản và hồ sơ khách

| Mã | Mức / trạng thái | Công việc còn lại | Điều kiện hoàn thành |
|---|---|---|---|
| A1 | P1 · UI thiếu, backend có nền | Tách màn tài khoản thành 2 tab Nhân viên/Khách hàng; hoàn thiện lỗi/loading của đăng nhập/đăng ký và các thao tác khóa/sửa/phân quyền. | Tab Khách không có phân quyền/chuyển Admin. Admin toàn quyền; Quản lý không sửa Admin, không phân quyền/chuyển Admin. Request trái quyền bị chặn ở server. |
| A2 | P1 · Bổ sung UI/truy vấn, đồng bộ dữ liệu | Hồ sơ khách có tra cứu và lịch sử lưu trú/thẻ; hồ sơ cá nhân hiển thị điểm/hạng hoặc liên kết rõ tới thẻ. Đồng bộ name/phone giữa account và customer, thống nhất địa chỉ tối đa 512 ký tự. | Hồ sơ khách tại quầy không cần tài khoản. Khách chỉ xem dữ liệu của mình. Thẻ cấp một lần, có vô hiệu hóa; không xóa hoặc chỉnh điểm tay. Phối hợp TV2 đối chiếu điểm sau checkout. |
| A3 | P1 · Chưa có lọc/xuất audit đầy đủ | Thay nhật ký 100 dòng cắt từ 500 dòng gần nhất bằng truy vấn có lọc thời gian/người/hành động/đối tượng và phân trang; xuất CSV và bản in/lưu PDF của kết quả lọc. | Chỉ Admin truy cập. Lọc/trang/xuất cùng một tập dữ liệu, không chỉ lọc phần đã tải; CSV escape đúng; có log khách và nhân viên. |
| A4 | P1 nếu nghiệm thu SMS · Cần tích hợp ngoài | Tách provider OTP demo/SMS. Gắn chuyển Admin với OTP thật qua SMS khi có nhà cung cấp/cấu hình. | OTP hết hạn/giới hạn thử, buộc với phiên và mục tiêu, không lộ OTP thật. Admin cũ thành Quản lý, cả hai phiên cũ bị thu hồi. Nếu chưa có dịch vụ SMS, giữ nhãn DEMO và báo chưa hoàn thành tích hợp; không giả vờ gửi SMS. |
| A5 | P1 · Hoàn thiện UI/nghiệm thu | Tách rõ Sao lưu và Khôi phục trong màn hệ thống; hiển thị tiến trình/kết quả/lỗi và giải thích JSON demo khác SQL `.bak`; ghi nhận thất bại khi có thể. | Chỉ Admin. Restore demo đăng xuất mọi phiên. SQL backup chạy với quyền/thư mục đúng trên máy SQL; SQL restore hiện ngoại tuyến bằng SSMS và UI hướng dẫn rõ. Ảnh cần sao lưu riêng. |
| A6 | P0 để nhóm làm song song · Tổ chức giao diện/API chung | Tách `workspace.js` theo 3 phần sở hữu, giữ table/form/toast/HTTP dùng chung; điều phối controller/routes/readService. Chuẩn hóa 401/403/lỗi mạng, loading, tránh gửi lặp; chốt truy vấn theo màn hình với TV3. | Mỗi người sửa được module mình, không phải sửa toàn bộ workspace.js. Các page/command cũ vẫn dùng được; menu/quyền không sai. Có trạng thái rỗng/lỗi/mobile; không mở production chỉ để bỏ lỗi cấu hình. |

Backend TV1: `service/{auth,account,profile,customer,system,read}Service.js`, `service/index.js`, `controllers/apiController.js`, `routes/webRoutes.js`, `middleware/security.js`, `app.js`, `config/env.js`, `shared/{permissions,passwords,errors}.js`.

Frontend TV1: `views/auth.ejs`, phần accounts/customers/cards/mycard/profile/system trong `workspace.js`, `views/workspace.ejs`, `views/error.ejs`, `views/partials/head.ejs`, tiện ích `common.js` và CSS dùng chung.

## 4. TV2 — Đặt phòng, lưu trú và thanh toán

| Mã | Mức / trạng thái | Công việc còn lại | Điều kiện hoàn thành |
|---|---|---|---|
| B1 | **P0 · Lỗi thực tế cần sửa** | `fixedStayTimes()` đặt giờ nhận thành 00:00 địa phương; `create()` lại yêu cầu startAt >= giờ hiện tại − 5 phút, nên sau đầu ngày hầu như không đặt được hôm nay. Sửa cách phân biệt ngày giữ phòng và thời điểm nhận thực tế; đồng bộ tìm phòng/giá/lịch. | Đặt hôm nay hợp lệ theo quy tắc đã chốt, không cho ngày quá khứ; check-in đúng trạng thái/phòng sạch, ngoài khung 12:00–14:00. Form vẫn chỉ chọn ngày, trả cố định 12:00. Không sửa bằng cách đơn thuần bỏ mọi kiểm tra thời gian. |
| B2 | P1 · Chưa có service/command/UI gia hạn | Bổ sung gia hạn lưu trú: kiểm tra ngày trả mới và lịch trùng; nếu cùng phòng không đáp ứng, đề xuất phòng thay thế; người dùng xác nhận mới đổi/gia hạn. | Không trùng lịch/capacity. Khách từ chối hoặc không còn phòng thì giữ nguyên giao dịch. Giá, phiếu đặt, phiếu thuê, lịch sử phòng cập nhật cùng transaction; TV3 đồng bộ SQL. |
| B3 | P1 · UI cần bổ sung | Tra cứu phiếu theo mã đặt/mã thuê/phòng/CCCD; chi tiết phiếu và in phiếu thuê khi nhận; chọn phòng theo khoảng trống thực tế, không chỉ dropdown tất cả phòng. | Nhân viên tìm được khách quên mã qua giấy tờ; phiếu thuê phản ánh phòng/khách/thời gian. Đổi phòng cho xem phụ thu dự kiến trước xác nhận, server kiểm tra lại và báo khi phòng vừa bị giữ. |
| B4 | P1 · Có backend, UI bảng kê còn sơ lược | Thay đoạn ghi chú tổng tiền trong modal checkout bằng bảng kê có từng dòng phòng/dịch vụ/phụ thu/cọc/còn thu. Hoàn thiện chứng từ, phương thức/mã giao dịch và bản in nhiều dòng. | Bảng kê nằm trước xác nhận thu. Giá dịch vụ giữ snapshot, dịch vụ đã hủy không thu. Số tiền đối chiếu lại ở server; thu thành công mới đóng phiếu và phát hành hóa đơn. Không sửa hóa đơn PAID. |
| B5 | P1 · Hoàn thiện frontend khách | Trang tìm/chi tiết phòng dùng ảnh/tiện ích TV3 cung cấp; giữ chỗ hiển thị hạn còn lại, số tiền phòng/cọc và cách liên hệ xác nhận; lịch sử phiếu có chi tiết/trạng thái/thông báo hết hạn rõ. | Đặt online cần đăng nhập, chỉ xem phiếu của mình. Không gọi cọc là thanh toán toàn bộ; không hiển thị “đã nhận tiền” khi mới chọn phương thức. Không yêu cầu tích hợp cổng ngân hàng trong phạm vi mặc định. |
| B6 | **P0 · Nghiệm thu giao dịch có sẵn** | Kiểm tra đặt trùng từ hai phiên, hết hạn và xác nhận cọc đồng thời, đổi/gia hạn, sửa giá dịch vụ sau ghi nhận, checkout hai lần, thất bại giữa transaction và tích điểm. | Không giữ trùng/thu hai lần/cộng điểm hai lần; rollback không để hóa đơn dở/phòng sai. Demo và SQL cùng kết quả nghiệp vụ. Bàn giao kết quả đối chiếu cho TV1/A2 và TV3/C1/C6. |

Backend TV2: `service/bookingService.js`, `service/billingService.js`, `service/helpers.js`, `shared/validation.js`; TV1 ghép command/route được TV2 bàn giao. Không tự thay file SQL khi TV3 đang tích hợp.

Frontend TV2: `views/public.ejs`, `views/invoice.ejs`, phần search/mybookings/bookings/stays/usage/invoices của workspace, phần tìm phòng trong `common.js`, CSS riêng các màn này.

## 5. TV3 — Phòng, buồng phòng, báo cáo và database

| Mã | Mức / trạng thái | Công việc còn lại | Điều kiện hoàn thành |
|---|---|---|---|
| C1 | **P0 · Chưa nghiệm thu SQL thật / đang lệch quy tắc** | Chạy đủ 001/002/003 bằng SSMS, dùng SQL Login ứng dụng. Đối chiếu adapter/mapping/trigger. JS đã tính ngày địa phương nhưng `fn_QuoteRoom` SQL còn dựa ngày của timestamp; procedure nhận phòng chưa có chặn 12:00–14:00 như JS. Đồng bộ theo hợp đồng B1. | Cùng đầu vào có cùng giá/lịch/điều kiện giữa service, function/procedure và seed. Chạy CRUD/booking/checkout/điểm thật bằng SQL, không chỉ xem parse pass. Không tắt ràng buộc hoặc tự fallback demo. |
| C2 | P1 · Backend/UI danh mục chưa đủ | Upload và dùng ảnh phòng thật; quản lý dịch vụ/tiện ích/minibar gắn loại phòng. SQL có RoomTypeService nhưng JS mapping/service/UI chưa sử dụng. Hoàn thiện danh mục và lọc giá lễ. | Ảnh an toàn/giới hạn dung lượng, có placeholder khi thiếu. Gắn/bỏ dịch vụ theo loại phòng được lưu/đọc đúng; không nhầm tiện ích đi kèm với khoản phát sinh B4. Minibar không tạo tồn kho theo phòng. |
| C3 | P1 · Sơ đồ còn thiếu realtime/countdown | Countdown theo deadline từng nhiệm vụ, đánh dấu quá hạn và tự làm mới dữ liệu; giữ bộ lọc/vị trí, không phá form đang nhập. Hoàn thiện xem lịch sử ảnh/báo hỏng/hoàn tất dọn hoặc bảo trì. | Hai trình duyệt thấy thay đổi trong chu kỳ cập nhật đã công bố. Hạn dọn 90 phút theo thời điểm thực tế, không reset khi tải trang. Vàng cần dọn, xanh trống, đỏ bảo trì; Buồng phòng không có tổng quan. |
| C4 | P1 · Báo cáo mới tính ở client | Truy vấn tổng hợp doanh thu phía server, lọc ngày/tháng/trạng thái/phòng hoặc loại theo nhu cầu báo cáo; thống nhất ngày địa phương. UI số liệu, biểu đồ/bảng và CSV/bản in phải cùng bộ lọc. | Chỉ Admin/Quản lý. Tổng từ hóa đơn PAID, cọc không tính hai lần. Đối chiếu SQL → API → UI → file xuất, không gửi cả dữ liệu cá nhân/thanh toán không cần thiết chỉ để dựng báo cáo. |
| C5 | P2 · Tối ưu sau luồng chính | Bổ sung truy vấn có điều kiện/phân trang/tổng hợp cho repository thay `list()` toàn bảng; ưu tiên audit, tài khoản, khách và báo cáo theo contract A6. | Tham số hóa, whitelist sắp xếp, giới hạn page size; count/trang đúng; SQL/demo cùng contract. Không đổi interface đang dùng mà thiếu cập nhật service. Không bắt buộc tối ưu mọi truy vấn trước khi demo nghiệp vụ chạy được. |
| C6 | P1 · Tích hợp dữ liệu và tài liệu | Seed có kịch bản biên cùng ngày/gia hạn/lễ/đang ở/cọc/quá hạn/dọn phòng; kiểm tra tính nhất quán JSON/SQL. Cập nhật hướng dẫn máy nhóm, quyền backup và quy tắc thời gian theo code mới. | Người khác làm theo tài liệu trên máy SQL mới chạy được. Ghi rõ các kịch bản, số lượng từng adapter và kết quả nghiệm thu; không tuyên bố JSON/SQL có số account giống nhau khi hiện khác. Không commit .env/data/.bak. |

Backend TV3: `service/catalogService.js`, `service/housekeepingService.js`, toàn bộ `database/`. Khi triển khai có thể tạo `service/reportService.js`; hiện **chưa có file này**, không coi là phần đã hoàn tất. TV1 ghép route/readService.

Frontend TV3: phần board/catalog/overview/reports trong workspace, upload ảnh phòng, form gắn tiện ích/giá lễ và CSS các màn này. TV2 dùng dữ liệu ảnh/tiện ích đó trên trang công khai.

## 6. Giao việc theo file backend

Ở đầu từng file backend có `TASK-BAN-GIAO | Phụ trách | Mã việc`, mô tả cụ thể cần làm. Dùng tìm toàn repo `TASK-BAN-GIAO` hoặc `B1`, `A3`, `C1` để tới vị trí. Các file helper/config không nhất thiết phải viết lại; có task nghiệm thu/phối hợp để tránh bỏ sót.

| File | Người giữ file | Mã việc |
| `backend/service/authService.js` | TV1 | A1, A4 |
| `backend/service/accountService.js` | TV1 | A1 |
| `backend/service/profileService.js` | TV1 | A2 |
| `backend/service/customerService.js` | TV1 | A2 |
| `backend/service/systemService.js` | TV1 | A3, A5 |
| `backend/service/readService.js` | TV1 | A2, A3, A6, C4 |
| `backend/service/bookingService.js` | TV2 | B1, B2, B3, B5, B6 |
| `backend/service/billingService.js` | TV2 | B4, B6 |
| `backend/service/helpers.js` | TV2 | B1, B2, B4, C1 |
| `backend/service/housekeepingService.js` | TV3 | C3 |
| `backend/service/catalogService.js` | TV3 | C2 |
| `backend/service/index.js` | TV1 | A6 |
| `backend/controllers/apiController.js` | TV1 | A6, B2, C4 |
| `backend/routes/webRoutes.js` | TV1 | A6, B3, C2, C4 |
| `backend/middleware/security.js` | TV1 | A1, A4, A6 |
| `backend/app.js` | TV1 | A6 |
| `backend/config/env.js` | TV1 | A4, A5, A6, C1 |
| `backend/shared/permissions.js` | TV1 | A1, A6 |
| `backend/shared/validation.js` | TV2 | B1, B4, A2 |
| `backend/shared/passwords.js` | TV1 | A1 |
| `backend/shared/errors.js` | TV1 | A6 |
| `backend/database/connection.js` | TV3 | C1, C6 |
| `backend/database/index.js` | TV3 | C1 |
| `backend/database/schema.js` | TV3 | C1, C2, C4 |
| `backend/database/repositories/sqlRepository.js` | TV3 | C1, C4, C5 |
| `backend/database/repositories/demoRepository.js` | TV3 | C1, C5, C6 |
| `backend/database/seed/demoData.js` | TV3 | C6, B1 |
| `backend/database/sql/001_create_database.sql` | TV3 | C1, C2 |
| `backend/database/sql/002_constraints_and_logic.sql` | TV3 | C1, B1, B2, B6 |
| `backend/database/sql/003_seed_demo_data.sql` | TV3 | C6 |

## 7. Làm song song, tránh sửa đè

1. **TV1/A6 trước:** tách khung UI dùng chung khỏi màn hình. Đường dẫn dự kiến `frontend/public/js/modules/system.js`, `operations.js`, `facility.js` chỉ là đề xuất; **chưa tồn tại** trong lần bàn giao này. Không tạo file rỗng rồi đánh dấu xong.
2. **TV2/B1 và TV3/C1 cùng chốt ví dụ ngày/giá:** payload đang là `YYYY-MM-DD`, không khôi phục datetime-local hoặc các quy tắc giờ cũ khi chưa được yêu cầu. Ghi ví dụ same-day, 11:59/12:00/13:59/14:00, UTC so với ngày Việt Nam và ngày lễ; quy định rõ trường hợp qua nửa đêm.
3. **Contract API:** TV2 bàn giao tên command/payload/result cho gia hạn/phiếu thuê; TV3 bàn giao truy vấn báo cáo/ảnh/tiện ích; TV1 ghép controller/routes/menu và chuẩn phản hồi. Từng chủ module chịu trách nhiệm kiểm tra quyền server của chức năng mình.
4. **SQL/schema do TV3 giữ:** TV1/TV2 gửi thay đổi dữ liệu cần thiết; TV3 cập nhật đồng bộ SQL/mapping/seed, ghi cách nâng cấp khi DB đã tồn tại. Giữ cấu trúc ba file SQL chính, không DROP dữ liệu của thành viên.
5. **Nhánh gợi ý:** `tv1-he-thong`, `tv2-luu-tru`, `tv3-phong-database`. Người làm ghép cập nhật ghi rõ màn hình/command/schema bị ảnh hưởng; không đẩy `.env`, `node_modules`, JSON demo, ảnh cá nhân hoặc `.bak`.
6. Nghiệm thu phần mình bằng vai trò đúng/sai, dữ liệu rỗng/lỗi/mất kết nối, màn hình desktop/mobile và SQL Server thật; ghi kết quả trong phần bàn giao. **Không thêm thư mục/file/script test tự động**, theo yêu cầu hiện tại.

File dùng chung do TV1 ghép: `apiController.js`, `webRoutes.js`, `readService.js`, `service/index.js`, `views/workspace.ejs`. File `validation.js` do TV2 giữ, nhận giới hạn trường của TV1/TV3. Repository/SQL do TV3 giữ. Các chức năng giao nhau phải bàn giao interface, không sửa cùng file một lúc.

## 8. Việc cần chốt, không tự coi là bắt buộc đã duyệt

| Vấn đề | Người chuẩn bị đề xuất | Cách xử lý trước khi chốt |
|---|---|---|
| Giá giờ/qua đêm, phụ thu trễ/người/giường và làm tròn | TV2, TV3 hỗ trợ SQL/giá | Hiện mới tính giá ngày + giá lễ + chênh lệch đổi phòng. Bản mới chọn ngày, trả 12:00. Không tự bật công thức giờ/đêm hoặc phí chưa thống nhất. |
| Hủy phiếu đã cọc, hoàn tiền/voucher/đổi điểm | TV2 | Giữ chỉ hủy phiếu chưa cọc; không sửa ledger hoặc hóa đơn PAID để giả lập hoàn tiền. |
| Có giữ nút Thêm phòng hay chỉ sửa/vô hiệu hóa theo SQ1 | TV3 | Repo đang có thêm phòng; báo cáo cũ từng giới hạn quản lý thông tin. Nhóm đối chiếu phạm vi báo cáo trước khi bỏ/thêm hành vi. |
| SMS provider/tài khoản dịch vụ/chi phí | TV1 | Có credential mới làm gửi thật; chưa có thì giữ demo có nhãn rõ và ghi trạng thái tích hợp chưa xong. |
| Restore SQL qua web | TV1, TV3 | Hiện hỗ trợ backup SQL, restore ngoại tuyến bằng SSMS. Giữ cách này nếu chưa chốt thao tác tự động an toàn. |
| Deploy production/session store/cổng ngân hàng | TV1 (hệ thống), TV2 (thanh toán) | Là việc mở rộng nếu có yêu cầu triển khai thật; không buộc nhóm mua dịch vụ hoặc gỡ chặn production cho bản đồ án local. |

## 9. Thứ tự hoàn thành đề nghị

- **Đợt 1:** TV1/A6 tách phần làm chung; TV2/B1 sửa đặt hôm nay; TV3/C1 chạy SQL và thống nhất ngày/giờ/giá.
- **Đợt 2:** mỗi người hoàn thiện các P1 thuộc module, đồng thời bàn giao payload/route/schema. A4 triển khai khi có cấu hình SMS; chưa có thì báo rõ giới hạn.
- **Đợt 3:** TV1 nghiệm thu tài khoản/khách/thẻ/audit/backup; TV2 nghiệm thu luồng nhận → dịch vụ → đổi/gia hạn → bảng kê → hóa đơn; TV3 đối chiếu SQL, sơ đồ/báo cáo và cập nhật tài liệu. C5 tối ưu sau khi luồng chính ổn.

Tiêu chí chung: giao diện có nút/form thật gắn API; backend kiểm tra quyền và dữ liệu; thay đổi tài chính không để trạng thái dở khi thất bại; dữ liệu SQL được đối chiếu; mô tả rõ phần chưa tích hợp. Một màn hình có giao diện hoặc có hàm sẵn chưa đủ để đánh dấu hoàn thành.
