# Kết nối SQL Server trên từng máy

## 1. Chuẩn bị

Cài SQL Server **2019+** (Developer hoặc Express), SQL Server Management Studio (SSMS) và Node.js 22+. SSMS chỉ là công cụ quản trị; máy vẫn cần SQL Server Database Engine.

Bật TCP/IP cho instance trong SQL Server Configuration Manager. Với local đơn giản, đặt cổng IPAll cố định `1433`, xóa TCP Dynamic Ports và restart dịch vụ. Bật SQL Server and Windows Authentication mode nếu ứng dụng dùng SQL Login.

## 2. Cài schema ứng dụng

Đăng nhập SSMS, tạo database nếu chưa có (tên tùy chọn, ví dụ `HotelManagerOOAD`) và chọn đúng database trên thanh công cụ của cửa sổ query. Dùng tài khoản có quyền cài/nâng cấp schema, mở và Execute **toàn bộ một file duy nhất**:

```text
database/HotelManagerOOAD.sql
```

Đây là schema ứng dụng chuẩn. Script chạy trong database đang chọn, không tạo hoặc tự chuyển database; nó từ chối cài vào database hệ thống (`master`, `tempdb`, `model`, `msdb`). Script tạo hoặc nâng cấp bảng, FK/CHECK/index/view/trigger, nạp dữ liệu phát triển khi database trống và cuối cùng công bố `SchemaVersion = 5`. Version 5 bổ sung `PaymentIntent` và `SepayReceipt` để lưu yêu cầu thu tiền và chống ghi nhận trùng webhook SePay. Database đang ở version 4 có thể chỉ chạy khối `-- BEGIN SEPAY SCHEMA V5` đến `-- END SEPAY SCHEMA V5` bằng SSMS sau khi chọn đúng database, không cần chạy lại phần dữ liệu mẫu.

Script có `GO`, vì vậy chạy bằng SSMS hoặc `sqlcmd`; không gửi nguyên file qua `mssql.Request.query()` vì `GO` là batch separator của công cụ. Với `sqlcmd` cổ điển trên Windows, dùng `-d` để chọn database đã tạo và chỉ định UTF-8 để giữ đúng dữ liệu tiếng Việt:

```powershell
sqlcmd -S "localhost,1433" -E -C -d "TenDatabaseCuaBan" -f 65001 -b -i "database\HotelManagerOOAD.sql"
```

Thay `TenDatabaseCuaBan` bằng đúng tên database của bạn; script SQL không đọc `.env`. Thay `-E` bằng `-U hotel_dev` khi dùng SQL Login để `sqlcmd` hỏi mật khẩu; không ghi mật khẩu vào script hoặc lịch sử lệnh dùng chung. Có thể chạy lại script: DDL và version là idempotent, seed có marker `realistic_3roomtypes_v2`, không drop database và không xóa dữ liệu. Nếu database đã có tài khoản nhưng chưa có marker, script giữ dữ liệu và bỏ qua seed.

Seed gồm 20 tài khoản, 20 khách, 3 loại phòng, 20 phòng, 20 dịch vụ, giá lễ một lần, đặt/thuê/đổi phòng, sử dụng dịch vụ, hóa đơn/thanh toán/sổ điểm, buồng phòng, backup metadata và audit liên kết. Mọi thông tin đều giả.

Các thay đổi đến version 4 gồm actor attribution, chủ sở hữu và snapshot hóa đơn, liên kết dịch vụ với hóa đơn, ảnh/gallery/view/tiện nghi từng phòng, lịch giá lễ `ONE_OFF`/`ANNUAL`, QR thanh toán riêng, current room lấy từ dòng `StayRoomHistory` đang mở và finalization hóa đơn/cộng điểm nguyên tử. `Stay` không có `RoomId` cạnh tranh.

## 3. Tạo SQL Login

Trong SSMS: Security → Logins → New Login → SQL Server authentication. Tạo ví dụ `hotel_dev` với mật khẩu riêng. User Mapping → chọn database đã cài schema, cấp `db_datareader`, `db_datawriter`. Không dùng `sa` trong `.env`.

Trigger finalization cần quyền ghi vào `Invoice`, `ServiceUsage`, `MembershipPointEntry` và `Membership`; `db_datawriter` đáp ứng môi trường phát triển. Web không cần `db_owner` hoặc quyền tạo database khi chạy.

## 4. Cấu hình ứng dụng

Ở thư mục chứa `package.json`:

```bash
npm install
npm run setup
```

Mở `.env` đã tạo, giữ `SESSION_SECRET` ngẫu nhiên và sửa:

```dotenv
DB_MODE=sqlserver
DB_SERVER=localhost
DB_PORT=1433
DB_NAME=HotelManagerOOAD
DB_USER=hotel_dev
DB_PASSWORD=mat_khau_SQL_Login_cua_ban
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true
```

`DB_NAME` có thể là tên bất kỳ nhưng phải trùng database đã cài schema ở bước 2; `HotelManagerOOAD` chỉ là tên mặc định khi không đặt biến này. Đổi tên database không thay thế bước cài schema: database vẫn cần đủ bảng/cột, bao gồm `dbo.SchemaVersion`, và schema version 5.

`DB_SERVER` là tên máy/IP, không phải đường dẫn `.mdf`, tên database hay URL. Với SQLEXPRESS, bật TCP/IP, chọn cổng cố định rồi dùng `DB_SERVER=localhost` và đúng `DB_PORT`.

`DB_TRUST_SERVER_CERTIFICATE=true` chỉ phù hợp chứng chỉ tự ký khi phát triển. Không commit `.env`.

```bash
npm run db:check
npm run dev
```

`db:check` kiểm tra database được cấu hình bằng `DB_NAME`, không ép tên `HotelManagerOOAD`. Lệnh từ chối demo mode, database thực tế không khớp cấu hình, sai SchemaVersion, cột/object version 5 bị thiếu hoặc cấu hình khách sạn không đúng. Seed chuẩn cho kết quả tương tự (tên database thay đổi theo cấu hình):

```text
Kết nối thành công. Database: HotelManagerOOAD | Schema: 5 | Phòng: 20 | FK tin cậy: 41
```

Sau đó mở http://localhost:3000. SQL lỗi không tự fallback sang demo.

## 5. Tính toàn vẹn chính

- `Account.RoleCode` chỉ nhận `MANAGER`, `ADMIN`, `RECEPTIONIST`, `HOUSEKEEPER`, `CUSTOMER`. Quản lý (`MANAGER`) phụ trách tài khoản, phân quyền và quản trị dữ liệu hệ thống; Admin (`ADMIN`) quản trị vận hành theo ma trận quyền của ứng dụng.
- `Invoice.CustomerId` phải khớp quan hệ `Invoice → Stay → Booking → Customer`.
- Mỗi stay và mỗi room chỉ có tối đa một dòng `StayRoomHistory` đang mở; view `v_StayCurrentRoom` chiếu `CurrentRoomId` từ dòng đó.
- Chuyển hóa đơn `DRAFT → PAID` yêu cầu settlement bằng `AmountDue`, tự liên kết usage chưa hủy và cộng điểm đúng một lần theo khóa chính `MembershipPointEntry.InvoiceId`.
- Hóa đơn đã trả, dòng hóa đơn, settlement, usage đã billed, point ledger và audit được bảo vệ khỏi sửa/xóa trực tiếp.
- Giá lễ một lần dùng `StartDate`/`EndDate`; giá hằng năm dùng `StartMonthDay`/`EndMonthDay` dạng `MM-DD`. Khoảng hằng năm qua giao thừa có start lớn hơn end.

## 6. Sao lưu

**Demo:** Quản lý tạo/khôi phục JSON trong `data/backups/`; bản sao cần đúng một Quản lý đang hoạt động. Sao lưu JSON không chứa ảnh trong `data/uploads/`. Khi đã có yêu cầu/giao dịch SePay, restore demo bị chặn để không xóa lịch sử chống nhận trùng; không dùng demo làm sổ thu tiền thật.

**SQL:** đặt `SQL_BACKUP_DIR` là thư mục trên máy chạy SQL Server, cấp quyền ghi cho SQL Server service account và quyền backup cho SQL Login nếu dùng nút sao lưu. App dùng `COPY_ONLY, CHECKSUM`. Khôi phục SQL thực hiện ngoại tuyến bằng SSMS, sau đó chạy lại `database/HotelManagerOOAD.sql` và `npm run db:check`. File `.bak` không chứa ảnh đính kèm.

## 7. Lỗi thường gặp

| Lỗi | Cách xử lý |
|---|---|
| `ECONNREFUSED` / timeout | Kiểm tra dịch vụ SQL, TCP/IP, cổng, `DB_SERVER`, `DB_PORT` và firewall. |
| Login failed | Kiểm tra SQL Authentication, login/password và User Mapping vào database trong `DB_NAME`. |
| Cannot open database | Kiểm tra database trong `DB_NAME` đã tồn tại đúng instance và login có quyền truy cập. |
| SchemaVersion/cột/object thiếu | Chọn đúng database trong `DB_NAME`, chạy toàn bộ script và xử lý lỗi SQL đầu tiên; version chỉ lên 5 khi script hoàn tất. |
| Certificate chain | Local có thể dùng `DB_TRUST_SERVER_CERTIFICATE=true`; server thật cần chứng chỉ tin cậy. |
| Seed không được nạp | Database đã có dữ liệu; script cố ý không trộn seed vào dữ liệu hiện hữu. |
| Permission denied BACKUP | Cấp quyền backup cho login và quyền thư mục cho SQL Server service account. |

`npm run docs:check` chỉ kiểm tra dictionary khớp SQL đã commit. Nghiệm thu cuối vẫn phải chạy script và `npm run db:check` trên SQL Server thật.
