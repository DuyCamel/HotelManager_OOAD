# Aurora HotelManager Web

Ứng dụng quản lý khách sạn dùng **Node.js / Express / EJS / SQL Server**, tổ chức theo MVC.

## 1. Chạy ứng dụng

Cần **Node.js 22 trở lên**. Mở terminal tại thư mục chứa `package.json`:

```bash
npm ci
npm run dev
```

Mở **http://localhost:3000/login** để đăng nhập. Nếu `.env` đặt `PORT` khác, dùng cổng đó.

`npm ci` tự tạo `.env` nếu chưa có, không ghi đè cấu hình cũ. Có thể chạy `npm run setup` để tạo lại khi thiếu file. Sau khi sửa `.env`, khởi động lại ứng dụng.

### Mốc giờ nghiệp vụ

Các mốc giờ được cấu hình trong `.env`: `APP_CHECK_IN_TIME` (mặc định `14:00:00`), `APP_CHECK_OUT_TIME` (mặc định `12:00:00`) và `APP_NO_SHOW_TIME` (mặc định `22:00:00`). Phiếu đặt trong ngày nhận phòng được giữ đến hết hạn này; qua hạn phiếu bị hủy và khách đến muộn dùng luồng **Nhận phòng ngay**. Có thể đổi giá trị để thử các giờ biên, dùng định dạng `HH:mm` hoặc `HH:mm:ss`, rồi khởi động lại máy chủ. Múi giờ nghiệp vụ lấy từ `APP_TIME_ZONE`, mặc định `Asia/Ho_Chi_Minh`.

### Chọn nguồn dữ liệu

Mở `.env` và xem `DB_MODE`:

| Cấu hình | Cách hoạt động |
|---|---|
| `DB_MODE=demo` | Chạy thử không cần SQL Server; dữ liệu lưu tại `data/demo.json`. Đây là mặc định khi cài mới. |
| `DB_MODE=sqlserver` | Dùng database SQL Server đã cấu hình trong `.env`. Tài khoản mẫu khác chế độ demo. |

Nếu dùng SQL Server:

1. Mở SSMS, tạo database nếu chưa có và chọn database muốn dùng trên thanh công cụ của cửa sổ query. Chạy toàn bộ `database/HotelManagerOOAD.sql` để cài/nâng cấp database đang chọn lên **schema 5**; script không tự chuyển sang database khác.
2. Điền `DB_SERVER`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` trong `.env` theo máy của bạn; đặt `DB_MODE=sqlserver`. `DB_NAME` là tên database vừa cài schema, không bắt buộc là `HotelManagerOOAD`.
3. Chạy `npm run db:check`, sau đó `npm run dev`.

Chi tiết: [Kết nối SQL Server](docs/DATABASE.md). SQL lỗi không tự chuyển sang demo. Không xóa database hoặc `data/demo.json` để xử lý lỗi đăng nhập.

## 2. Tài khoản và mật khẩu test

**Mật khẩu chung cho tài khoản mẫu ở cả hai chế độ: `mk1233456`.** Đăng nhập bằng email đầy đủ, không dùng `admin` hay mã `TK001`.

| Vai trò | Email khi `DB_MODE=sqlserver` | Email khi `DB_MODE=demo` |
|---|---|---|
| Quản lý (toàn quyền hệ thống) | `quanly@khachsan.test` | `manager@hotel.test` |
| Admin (quản trị vận hành) | `admin@khachsan.test` | `admin@hotel.test` |
| Lễ tân | `letan1@khachsan.test` | `reception@hotel.test` |
| Buồng phòng | `buongphong1@khachsan.test` | `housekeeping@hotel.test` |
| Khách hàng | `khach01@khachsan.test` | `customer@hotel.test` |

**Ví dụ với SQL Server, tài khoản quyền cao nhất:** email `quanly@khachsan.test`, mật khẩu `mk1233456`.

Các tài khoản trên là dữ liệu khởi tạo, không phải SQL Login trong `DB_USER` / `DB_PASSWORD`. Nếu database đã có dữ liệu từ trước hoặc đã đổi mật khẩu, chạy lại SQL không ghi đè tài khoản đó.

### Nếu không đăng nhập được

1. Kiểm tra `DB_MODE` và dùng đúng cột email trong bảng trên. `admin@hotel.test` không phải tài khoản mẫu của SQL Server.
2. Nhập đúng `mk1233456`, không thêm dấu cách; tài khoản đã đổi mật khẩu phải dùng mật khẩu mới.
3. Nếu báo phiên biểu mẫu hết hạn, tải lại trang đăng nhập. Nếu bị giới hạn do thử quá nhiều, chờ 15 phút.
4. Nếu dùng SQL mà server báo lỗi kết nối/schema, chạy `npm run db:check` và xem [cách xử lý](docs/DATABASE.md#7-lỗi-thường-gặp).

## 3. Thanh toán SePay

SePay được dùng ở **cọc đặt phòng** và **chuyển khoản khi checkout**. Thiếu cấu hình ngân hàng thì ứng dụng không tạo QR, tránh chuyển nhầm tiền.

### Chạy dev cùng SePay CLI (không cần đổi URL)

Cài và đăng nhập SePay CLI một lần theo [hướng dẫn chính thức](https://developer.sepay.vn/vi/agents/cli/cai-dat). Sau đó, cả hai lệnh dưới đây đều khởi chạy ứng dụng tự tải lại khi sửa code và SePay listener cùng lúc:

```bash
npm run dev
# hoặc
npm run dev:sepay
```

Listener tự chuyển tiếp tới `localhost:<PORT>/api/webhooks/sepay` (mặc định cổng 3000). Giữ cửa sổ terminal mở khi thử giao dịch; nhấn `Ctrl+C` để dừng cả hai tiến trình. Nếu SePay CLI chưa cài/đăng nhập, lệnh sẽ báo lỗi thay vì âm thầm chạy thiếu listener.

**Lưu ý:** SePay CLI `webhook listen` nhận webhook theo cơ chế CLI của SePay và có thể yêu cầu Sandbox/Test Mode; xác nhận môi trường được tài khoản SePay hỗ trợ trước khi dùng giao dịch thật. Với webhook URL công khai hoặc production, cấu hình URL HTTPS cố định do bạn quản lý; không dùng URL localhost.

`npm start` chỉ khởi chạy ứng dụng, không chạy SePay listener.

### Cấu hình một lần

Điền thông tin thật của tài khoản đã liên kết với SePay trong `.env`, không đưa key lên Git:

```dotenv
SEPAY_WEBHOOK_API_KEY=<key_webhook_toi_thieu_32_ky_tu>
SEPAY_BANK_ID=<ma_ngan_hang>
SEPAY_ACCOUNT_NO=<so_tai_khoan_nhan>
SEPAY_ACCOUNT_NAME=<ten_chu_tai_khoan>
```

Khởi động lại bằng `npm run dev`, chép URL vừa được in ra rồi tạo webhook:

| Mục | Giá trị |
|---|---|
| URL | Toàn bộ địa chỉ ở dòng `SePay webhook:` trong terminal |
| Sự kiện / dữ liệu | Tiền vào / JSON |
| Xác thực | API Key, dùng cùng `SEPAY_WEBHOOK_API_KEY` trong `.env` |
| Tiền tố mã thanh toán | `HT`, nếu bật lọc theo mã |
| Gửi lại khi lỗi | Bật gửi lại khi HTTP ngoài 2xx |

Tạo **webhook riêng cho khách sạn**, không thay webhook của BrewLite. API key chỉ ở server; không cần gửi key qua chat hoặc đặt vào mã giao diện.

### Số tiền được tính thế nào?

- **Cọc:** khách chọn số nguyên VND từ 1 đến tổng tiền phòng; server lưu số tiền trước khi tạo QR. Chưa áp đặt tỷ lệ cọc cố định.
- **Lễ tân đặt tại quầy:** chọn **Tiền mặt** để xác nhận tiền đã nhận, hoặc **Chuyển khoản (SePay)** để mở QR đúng số cọc đã nhập. Phiếu chuyển khoản giữ phòng 30 phút, chỉ xác nhận sau webhook; chưa nhận tiền thì số đã cọc vẫn là 0.
- **Checkout:** số còn thu = **tiền phòng + dịch vụ + phụ thu - cọc đã nhận**. Ví dụ tổng 1.200.000đ, đã cọc 300.000đ thì QR checkout là **900.000đ**. Không thu cọc lần thứ hai.
- Chỉ webhook hợp lệ, đúng tài khoản, đúng mã và đúng số tiền mới xác nhận đã thu. Quét QR không đồng nghĩa đã thanh toán; webhook lặp không ghi nhận tiền lần nữa.
- Sai tiền, quá hạn hoặc bảng kê thay đổi sẽ được lưu tại `SepayReceipt` với `Outcome = 'REVIEW'` để nhân viên đối soát. **Không chuyển thêm tiền khi báo cần đối soát.** Chưa có hoàn tiền tự động.

Database version 4 có thể chỉ chạy khối `-- BEGIN SEPAY SCHEMA V5` đến `-- END SEPAY SCHEMA V5` trong file SQL để bổ sung bảng thanh toán, không nạp lại dữ liệu mẫu.

## 4. Vị trí code

| Cần sửa | Vị trí |
|---|---|
| URL/middleware module | `src/routes/<module>/` |
| Nhận request, response/render | `src/controllers/<module>/` |
| Nghiệp vụ và truy vấn dữ liệu | `src/models/<module>/` |
| SQL dùng chung/tham số/transaction | `src/models/_shared/sql.model.js` |
| Kết nối SQL | `src/config/db.js` (không chứa query) |
| Giao diện module | `src/views/<module>/`, `src/public/js/modules/<module>/` |
| Layout/menu/dialog | `src/views/layouts/`, `src/views/partials/` |
| CSS | `src/public/css/` theo khu vực |
| Cấu trúc CSDL và dữ liệu mẫu | `database/HotelManagerOOAD.sql` |

Điểm chạy: `src/server.js`. Cấu hình Express: `src/app.js`.

## 5. Kiểm tra trước bàn giao

```bash
npm run check
npm run db:check
```

`check` kiểm tra cú pháp JavaScript, test và từ điển dữ liệu. `db:check` chỉ dùng cho SQL Server. Sau khi sửa schema, chạy `npm run docs:dictionary` để sinh lại từ điển, không sửa tay file sinh tự động.

Kiểm thử SePay trên SQL thật bằng fixture được rollback, không chuyển tiền thật:

```powershell
$env:SEPAY_SQL_TEST='1'
node --test src/models/payments/payment.sql.test.js
```

## 6. Tài liệu và giới hạn

- [Module và quy tắc MVC](docs/MODULES.md)
- [Phân công và việc còn lại](docs/PHAN_CONG_3_NGUOI.md)
- [Bảng đăng ký module](docs/Module_Signup.xlsx)
- [Từ điển dữ liệu](docs/DATABASE_DICTIONARY.md)
- [Kết nối SQL Server](docs/DATABASE.md)
- [Ma trận quyền](docs/PERMISSIONS.md)

Bản local dùng session bộ nhớ và OTP demo, chưa có SMS thật; production vẫn bị chặn. Có tích hợp SePay không đồng nghĩa đã nghiệm thu giao dịch ngân hàng thật. Demo restore bị chặn sau khi có lịch sử SePay để tránh mất dữ liệu chống thu trùng; SQL restore thực hiện ngoại tuyến bằng SSMS.

Không commit `.env`, `data/`, mật khẩu/API key thật, `node_modules` hoặc `.bak`. Tài khoản mẫu trong README chỉ dùng phát triển, không dùng triển khai thật.
