# Kết nối SQL Server trên từng máy

## 1. Chuẩn bị

Cài SQL Server **2019+** (Developer hoặc Express), SQL Server Management Studio (SSMS), Node.js 22+. SSMS là công cụ quản trị; chỉ cài SSMS chưa có database engine. Mỗi người dùng SQL Server local riêng hoặc dùng server nhóm có cấp tài khoản riêng.

Trong **SQL Server Configuration Manager → SQL Server Network Configuration → Protocols for instance của bạn**, bật TCP/IP. Với local đơn giản, đặt IPAll TCP Port `1433`, xóa giá trị TCP Dynamic Ports, rồi restart dịch vụ SQL Server. Nếu dùng cổng khác, ghi đúng `DB_PORT`. Chỉ mở firewall nếu máy khác thực sự cần truy cập.

Bật **SQL Server and Windows Authentication mode** trong Server Properties → Security, restart dịch vụ. Web hiện kết nối bằng SQL Login; Windows Authentication của SSMS không tự chuyển sang ứng dụng Node.js.

## 2. Tạo database và dữ liệu

Đăng nhập SSMS bằng tài khoản quản trị. Mở và Execute **toàn bộ file**, lần lượt:

| File | Trách nhiệm |
|---|---|
| `database/01_schema.sql` | Tạo `HotelManager_OOAD_Web`, 23 bảng, khóa chính và giá trị mặc định. |
| `database/02_programmability.sql` | FK, CHECK, UNIQUE/index, trigger, view/function/procedure bảo vệ dữ liệu. |
| `database/03_seed.sql` | Chèn dữ liệu giả liên kết nhiều bảng, đối chiếu tổng hóa đơn và điểm. |

Mỗi file có `USE` và `GO`; chạy bằng **SSMS**, không dán cả file vào một `mssql.Request.query()` vì `GO` là batch separator của công cụ. Chỉ chạy tiếp khi không còn lỗi đỏ. 002 công bố schema **11** sau khi cài các object. 001/003 nhận diện phiên bản/seed và không xóa dữ liệu khi chạy lại. Không dùng ba file này để migrate database Java cũ: database web có tên riêng và email-only schema.

Muốn đổi tên database: sửa cùng tên ở cả ba file và `.env`, không sửa chỉ một chỗ. Không có đường dẫn MDF/LDF cố định theo máy.

Dữ liệu SQL: **104 tài khoản, 120 khách, 6 loại phòng, 60 phòng, 20 dịch vụ, 24 đợt giá lễ, 80 thẻ, 240 phiếu đặt, 160 phiếu thuê, 150 hóa đơn, 21 dòng dịch vụ đang lưu trú/đã hủy**, các dòng hóa đơn/thanh toán/sổ điểm/dọn phòng/nhật ký liên quan. Các phiếu gồm lịch sử, đã hủy, chờ cọc còn hạn/quá hạn, đã xác nhận và đang lưu trú. Thời điểm seed dựa trên UTC hiện tại; khi app khởi động sẽ tự hủy phiếu chưa cọc đã quá hạn nên số trạng thái thay đổi.

## 3. Tạo SQL Login cho ứng dụng

Trong SSMS: Security → Logins → New Login → SQL Server authentication. Tạo ví dụ `hotel_dev` với **mật khẩu riêng của bạn**. User Mapping → chọn `HotelManager_OOAD_Web`, chọn `db_datareader`, `db_datawriter`. Không dùng `sa` trong `.env`. Nếu chính sách mật khẩu bắt đổi ở lần đăng nhập đầu, đổi trước khi chạy ứng dụng.

Nếu muốn sử dụng view/procedure trực tiếp ngoài web, cấp EXECUTE cho đúng procedure theo nhu cầu. Web hiện dùng repository tham số hóa và transaction; không cần quyền `db_owner` hoặc CREATE DATABASE lúc chạy.

## 4. Tạo .env trên máy mình

Ở terminal thư mục chứa `package.json`:

```bash
npm install
npm run setup
```

Mở `.env` đã tạo, giữ `SESSION_SECRET` ngẫu nhiên, sửa phần database:

```dotenv
DB_MODE=sqlserver
DB_SERVER=localhost
DB_PORT=1433
DB_NAME=HotelManager_OOAD_Web
DB_USER=hotel_dev
DB_PASSWORD=mat_khau_SQL_Login_cua_ban
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true
```

`DB_SERVER` là **tên máy/IP**, không phải đường dẫn `.mdf`, không phải tên database, không phải URL `http://`. Với `localhost\SQLEXPRESS`, cách cấu hình được hỗ trợ ở đây là bật TCP/IP cho instance SQLEXPRESS, chọn cổng cố định, rồi dùng `DB_SERVER=localhost` và đúng `DB_PORT`; không phụ thuộc SQL Browser hoặc dynamic port.

`DB_TRUST_SERVER_CERTIFICATE=true` dành cho chứng chỉ tự ký ở máy phát triển. Khi có server/chứng chỉ chuẩn, dùng `false`. Mật khẩu có ký tự `#`, khoảng trắng hoặc ký tự đặc biệt nên đặt trong dấu nháy theo cú pháp dotenv. Không gửi `.env` cho cả nhóm và không commit lên Git.

```bash
npm run db:check
npm run dev
```

Kết quả mong đợi: `Kết nối thành công. Chế độ: sqlserver | Phòng: 60`. Sau đó vào http://localhost:3000. Muốn quay về dữ liệu demo, đổi `DB_MODE=demo` và khởi động lại. Lỗi SQL **không tự chuyển** sang dữ liệu demo.

## 5. Sao lưu và khôi phục

**Demo:** Admin tạo JSON trong `data/backups/`, khôi phục bản trong lịch sử. Khôi phục thay toàn bộ dữ liệu JSON, đăng xuất mọi phiên. Sao lưu này không chứa ảnh trong `data/uploads/`. Copy cả thư mục ảnh riêng nếu muốn phục hồi báo hỏng đầy đủ. Tệp sao lưu cũ có thể không còn xuất hiện trong lịch sử sau khôi phục vì lịch sử cũng được phục hồi về thời điểm cũ.

**SQL:** cấu hình `SQL_BACKUP_DIR` là thư mục **trên máy chạy SQL Server**, ví dụ `D:/HotelBackups`. Tạo thư mục trước, cấp quyền ghi cho **SQL Server service account**. Tài khoản SQL của ứng dụng cần quyền BACKUP DATABASE (ví dụ `db_backupoperator`) nếu muốn dùng nút sao lưu. App dùng `COPY_ONLY, CHECKSUM`; không nhận đường dẫn tùy ý từ trình duyệt. File `.bak` nằm trên SQL Server, không tải về máy browser.

Khôi phục SQL thực hiện **ngoại tuyến**: dừng Node.js, dùng SSMS → Databases → Restore Database → Device → chọn `.bak`, kiểm tra tên database đích và thông tin backup trước khi xác nhận. Có thể cần đóng các kết nối hiện có trong Options. Sau khi hoàn tất, kiểm tra user mapping rồi chạy `npm run db:check` và khởi động web. UI không chạy lệnh RESTORE trên pool đang hoạt động. SQL `.bak` không chứa ảnh đính kèm; sao lưu thêm `data/uploads/` riêng.

## 6. Lỗi thường gặp

| Lỗi | Cách xử lý |
|---|---|
| `ECONNREFUSED` / timeout | Kiểm tra dịch vụ SQL đang chạy, bật TCP/IP, cổng cố định, restart SQL, `DB_SERVER`, `DB_PORT` và firewall. |
| Login failed | Kiểm tra SQL Authentication, login/password, login có bị disable hoặc bắt đổi password. |
| Cannot open database | Chạy 001/002/003 đúng instance, kiểm tra tên database và User Mapping. |
| Certificate chain / self-signed | Local đặt `DB_TRUST_SERVER_CERTIFICATE=true`; server thật cài chứng chỉ tin cậy. |
| Schema không đúng | Cần schema web 10/11; chạy lại 002 và xử lý hết lỗi trước, không trỏ vào DB Java. |
| Invalid column AuthVersion / object ServiceUsage | Đang dùng database cũ hoặc chạy thiếu 001 của web. |
| Permission denied BACKUP | Cấp quyền backup cho SQL Login và quyền thư mục cho SQL service account. |
| EADDRINUSE khi chạy web | Dừng server cũ hoặc đổi PORT trong `.env`. |
| Đã sửa `.env` mà chưa đổi chế độ | Dừng và khởi động lại Node.js. |

Chỉ gửi thông báo lỗi đã che mật khẩu khi nhờ người khác hỗ trợ. Chạy ba script/đăng nhập thật trên SQL Server là bước nghiệm thu bắt buộc trước khi dùng chế độ SQL cho buổi bảo vệ.
