# Module và nơi làm việc

Luồng chính: **route → controller → model → view**. SQL chạy trong ứng dụng chỉ nằm trong `src/models/`. `src/config/db.js` chỉ mở/đóng pool và cung cấp driver. Ba script tạo database đặt riêng tại `database/`.

```text
database/
  01_schema.sql
  02_programmability.sql
  03_seed.sql
docs/
  MODULES.md
  DATABASE_DICTIONARY.md
  Module_Signup.xlsx
  PHAN_CONG_3_NGUOI.md
src/
  server.js
  app.js
  config/env.js, db.js
  core/auth/, validation/, errors/, http/, locals.js, todo.js
  routes/<module>/<module>.routes.js
  controllers/<module>/<module>.controller.js
  models/<module>/*.model.js, schema.js
  models/_shared/             Store, SQL adapter, demo adapter và quy tắc dùng chung
  views/<module>/index.ejs, _heading.ejs, form/bản in khi có
  views/layouts/, partials/, errors/
  public/js/core/             HTTP, state/table/dialog workspace
  public/js/modules/<module>/ Màn hình và thao tác theo module
  public/css/core/, auth/, home/, workspace/
scripts/
  setup-env.js
  check-db.js
  generate-dictionary.js
```

## Danh sách module

| Module | Gợi ý nhóm | Route trang | Controller | Model | View |
|---|---|---|---|---|---|
| Đăng nhập / đăng ký (`auth`) | TV1 | `/login, /register` | `src/controllers/auth/auth.controller.js` | `src/models/auth/auth.model.js` | `src/views/auth/` |
| Trang khách sạn / tìm phòng (`home`) | TV2 | `/` | `src/controllers/home/home.controller.js` | `src/models/home/home.model.js` | `src/views/home/` |
| Tài khoản (`accounts`) | TV1 | `/app/accounts` | `src/controllers/accounts/accounts.controller.js` | `src/models/accounts/account.model.js` | `src/views/accounts/` |
| Khách hàng (`customers`) | TV1 | `/app/customers` | `src/controllers/customers/customers.controller.js` | `src/models/customers/customer.model.js` | `src/views/customers/` |
| Thẻ thành viên (`memberships`) | TV1 | `/app/memberships` | `src/controllers/memberships/memberships.controller.js` | `src/models/memberships/membership.model.js` | `src/views/memberships/` |
| Đặt phòng (`bookings`) | TV2 | `/app/bookings` | `src/controllers/bookings/bookings.controller.js` | `src/models/bookings/booking.model.js` | `src/views/bookings/` |
| Nhận và trả phòng (`stays`) | TV2 | `/app/stays` | `src/controllers/stays/stays.controller.js` | `src/models/stays/stay.model.js` | `src/views/stays/` |
| Dịch vụ sử dụng (`service-usage`) | TV2 | `/app/service-usage` | `src/controllers/service-usage/service-usage.controller.js` | `src/models/service-usage/serviceUsage.model.js` | `src/views/service-usage/` |
| Hóa đơn (`invoices`) | TV2 | `/app/invoices` | `src/controllers/invoices/invoices.controller.js` | `src/models/invoices/invoice.model.js` | `src/views/invoices/` |
| Sơ đồ phòng (`housekeeping`) | TV3 | `/app/housekeeping` | `src/controllers/housekeeping/housekeeping.controller.js` | `src/models/housekeeping/housekeeping.model.js` | `src/views/housekeeping/` |
| Hồ sơ cá nhân (`profile`) | TV1 | `/app/profile` | `src/controllers/profile/profile.controller.js` | `src/models/profile/profile.model.js` | `src/views/profile/` |
| Cấu hình khách sạn (`settings`) | TV1 | `/app/settings` | `src/controllers/settings/settings.controller.js` | `src/models/settings/setting.model.js` | `src/views/settings/` |
| Sao lưu và khôi phục (`backups`) | TV1 | `/app/backups` | `src/controllers/backups/backups.controller.js` | `src/models/backups/backup.model.js` | `src/views/backups/` |
| Nhật ký hoạt động (`audit`) | TV1 | `/app/audit` | `src/controllers/audit/audit.controller.js` | `src/models/audit/audit.model.js` | `src/views/audit/` |
| Báo cáo (`reports`) | TV3 | `/app/reports` | `src/controllers/reports/reports.controller.js` | `src/models/reports/reports.model.js` | `src/views/reports/` |
| Tổng quan (`dashboard`) | TV3 | `/app/dashboard` | `src/controllers/dashboard/dashboard.controller.js` | `src/models/dashboard/dashboard.model.js` | `src/views/dashboard/` |
| Phòng (`rooms`) | TV3 | `/app/rooms` | `src/controllers/rooms/rooms.controller.js` | `src/models/rooms/room.model.js` | `src/views/rooms/` |
| Loại phòng (`room-types`) | TV3 | `/app/room-types` | `src/controllers/room-types/room-types.controller.js` | `src/models/room-types/roomType.model.js` | `src/views/room-types/` |
| Dịch vụ (`services`) | TV3 | `/app/services` | `src/controllers/services/services.controller.js` | `src/models/services/service.model.js` | `src/views/services/` |
| Giá lễ (`holiday-rates`) | TV3 | `/app/holiday-rates` | `src/controllers/holiday-rates/holiday-rates.controller.js` | `src/models/holiday-rates/holidayRate.model.js` | `src/views/holiday-rates/` |

## Quy tắc sửa code

- **Route** chỉ gắn URL, middleware và controller; mỗi module một thư mục. Không xử lý upload, tính tiền hoặc viết SQL trong route.
- **Controller** nhận request, lấy actor từ phiên, gọi model và chọn response/view. Không gọi database driver trực tiếp.
- **Model** chứa nghiệp vụ theo đối tượng. `_shared/sql.model.js` dùng mapping `schema.js` trong từng module để tạo truy vấn tham số hóa và transaction. Câu SQL backup thuộc `models/backups/`; kiểm tra schema thuộc model SQL. Không có SQL ở controller/route/config.
- `models/_shared/stayRules.js` chứa giá, thời gian, kiểm tra trùng và hạn dọn được nhiều model sử dụng; không chép một công thức sang từng controller.
- **View** theo module; layout/sidebar/topbar/dialog là partial dùng chung. Phần table/form động nằm trong `public/js/modules/` tương ứng, không còn một file chứa tất cả màn hình.
- Bốn form danh mục có file riêng ở `modules/rooms/fields.js`, `room-types/fields.js`, `services/fields.js`, `holiday-rates/fields.js`. Table/thao tác chung của nhóm danh mục được tái sử dụng ở module rooms; không nhân bản cùng một table bốn lần.
- Chọn module trong `docs/Module_Signup.xlsx`: cột người đăng ký để trống cho từng người tự điền. “Gợi ý nhóm” kế thừa phân công TV1/TV2/TV3, không phải tên người đã nhận. Không tạo thêm tài khoản/nhân sự giả trong bảng.

## Đường dẫn tương thích

Giữ `/api/login`, `/api/register`, `/api/data`, `/api/action/booking.create` và các URL command cũ. Mỗi URL command được khai báo ở route của module sở hữu; đã bỏ controller dispatch toàn bộ command. `/app` và `/portal` chuyển đến màn hình đầu tiên theo vai trò. Menu gọi `/app/<module>`; route/view của từng module được dùng khi điều hướng.

`/app/catalog` → `/app/rooms`, `/app/board` → `/app/housekeeping`, `/app/cards` → `/app/memberships`, `/app/usage` → `/app/service-usage`, `/app/system` → `/app/settings` còn hỗ trợ chuyển hướng. Hóa đơn của khách vẫn lọc chủ sở hữu; in dùng `/api/invoice/:id` và view `invoices/print.ejs`.

## Những việc vẫn chưa hoàn tất

Đợt này tổ chức lại cấu trúc và tách code đang có. Các task chức năng B1 (đặt cùng ngày), B2 (gia hạn), A3 (audit có lọc/xuất đầy đủ), A4 (SMS thật), C1 (đồng bộ quy tắc SQL và chạy SQL thật), C2/C3/C4 (ảnh/tiện ích/countdown/báo cáo) vẫn cần thực hiện theo [phân công](PHAN_CONG_3_NGUOI.md). Không đánh dấu các task đó đã xong chỉ vì đã có folder.

A6 đã hoàn thành **phần tách route/controller/model/view và JavaScript theo module**; các việc loading/401/phân trang và cải thiện UI còn lại vẫn giữ TODO. `reports.model.js`/`audit.model.js` hiện chỉ cung cấp dữ liệu đọc có kiểm tra quyền, chưa giả lập truy vấn tổng hợp/lọc còn thiếu.

## Database và tài liệu tự sinh

Chạy SSMS theo thứ tự `database/01_schema.sql` → `02_programmability.sql` → `03_seed.sql`. Đổi schema phải cập nhật mapping model và chạy `npm run docs:dictionary`; `npm run docs:check` phát hiện từ điển đã lệch. File dictionary đọc DDL trong repo, không tự đọc database đang chạy và không tự thay đổi schema.

Nghiệm thu thủ công theo vai trò, cả demo và SQL. Không có thư mục/file/script test tự động theo yêu cầu hiện tại.
