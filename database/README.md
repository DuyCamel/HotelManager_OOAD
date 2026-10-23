# Cài SQL Server cho từng máy

Thư mục này có **đúng 3 file SQL**, chạy theo thứ tự. CSDL tên `HotelManager_OOAD`, dùng **SQL Server 2019 trở lên**; SQL Server Express dùng được. SSMS là công cụ mở/chạy script, cần có cả SQL Server Database Engine đang hoạt động.

| Thứ tự | File | Nội dung |
|---|---|---|
| 1 | `001_create_database.sql` | Tạo CSDL nếu chưa có, 22 bảng và khóa chính/default. Không cố định đường dẫn MDF/LDF trên máy người viết. |
| 2 | `002_constraints_and_logic.sql` | CHECK/FK/UNIQUE, chỉ mục, trigger, hàm tính giá, view tra cứu và procedure cho các luồng ghi chính. |
| 3 | `003_seed_demo_data.sql` | Dữ liệu giả đủ nhiều, kiểm tra hậu điều kiện, bảng thống kê để đối chiếu. |

**Trạng thái ứng dụng:** Java vẫn sử dụng `FileHotelRepository`. Các script và utility JDBC đã được chuẩn bị để nhóm cấu hình, xem/thử dữ liệu SQL; chúng chưa biến toàn bộ backend thành JDBC. Khi nối JDBC, cần ánh xạ DAO/repository và gọi procedure phù hợp, thay bootstrap demo bằng dữ liệu SQL.

## 1. Kết nối SSMS

Mở SSMS và kết nối bằng Windows Authentication. Tên Server thường là `localhost`, `.`, `TENMAY\SQLEXPRESS` hoặc `localhost\SQLEXPRESS` tùy cách cài. Xem đúng tên instance trong **SQL Server Configuration Manager → SQL Server Services**; không copy tên máy của thành viên khác.

Tài khoản chạy file 001 cần quyền tạo CSDL; người cấu hình local có thể dùng Windows account đã được cấp quản trị SQL Server. Script không tự tạo login `sa` hoặc đổi mật khẩu SQL Server.

Mở từng file bằng **File → Open → File**, chạy toàn bộ file bằng **Execute/F5**:

1. Chạy 001. Kiểm tra Messages không có lỗi.
2. Chạy 002. Kiểm tra không có lỗi đỏ ở bất kỳ batch nào; `GO` là dấu phân batch của SSMS, không gửi cả file chứa GO bằng JDBC.
3. Chạy 003. Xem các bảng kết quả cuối file và đối chiếu số lượng bên dưới.
4. Refresh Databases → HotelManager_OOAD → Tables/Views/Programmability.

Có thể dùng `sqlcmd` thay SSMS để tự dừng khi lỗi; chạy từ thư mục repo, thay tên server cho đúng máy:

```bat
sqlcmd -S "localhost\SQLEXPRESS" -E -b -f 65001 -i database\001_create_database.sql
sqlcmd -S "localhost\SQLEXPRESS" -E -b -f 65001 -i database\002_constraints_and_logic.sql
sqlcmd -S "localhost\SQLEXPRESS" -E -b -f 65001 -i database\003_seed_demo_data.sql
```

Nếu driver ODBC local báo chứng chỉ tự ký khi dùng sqlcmd, tùy phiên bản có thể thêm `-C` cho máy local. Không dùng tùy chọn bỏ kiểm tra chứng chỉ như cấu hình triển khai thật.

001 nhận diện phiên bản và bỏ qua khi đã tạo. 002 có thể chạy lại; cuối file chỉ tạo marker phiên bản 2 sau khi xác minh các object/ràng buộc/chỉ mục cần có. 003 có marker `hotel-demo-v1` nên không sinh trùng; nếu CSDL có dữ liệu khác trước khi seed, script dừng và không ghi đè. Không xóa marker seed để chạy lại trên dữ liệu đã phát sinh.

## 2. Cấu hình TCP/IP và cổng cho Java

Kết nối SSMS bằng Windows Authentication thành công chưa có nghĩa JDBC TCP đã kết nối được.

1. Mở **SQL Server Configuration Manager → SQL Server Network Configuration → Protocols for instance đang dùng**.
2. Enable **TCP/IP**.
3. Trong TCP/IP → IP Addresses → IPAll, xem cổng. Có thể đặt một cổng cố định như `1433` (hoặc `14330` nếu cổng 1433 đã dùng): xóa giá trị TCP Dynamic Ports và điền TCP Port.
4. Restart đúng dịch vụ SQL Server của instance đó để áp dụng.
5. Java trên cùng máy dùng `localhost:<cổng>`. Mỗi thành viên dùng SQL Server của chính máy mình, không bắt buộc chung IP, không cần mở SQL Server ra Internet.

Nếu dùng `instanceName=SQLEXPRESS` thay cổng cố định, việc tìm cổng còn phụ thuộc SQL Server Browser. Cách cổng cố định dễ kiểm tra hơn cho nhóm.

## 3. Chọn cách đăng nhập SQL

### Cách A — SQL Authentication

Trong SSMS: Server Properties → Security → SQL Server and Windows Authentication mode; restart dịch vụ sau khi đổi mode. Tạo login riêng cho ứng dụng local, không dùng `admin` trong bảng Account làm login SQL.

Chạy đoạn sau **một lần trong SSMS bằng tài khoản quản trị**. Thay mật khẩu mẫu trước khi chạy; mật khẩu không được đưa vào repo:

```sql
USE master;
CREATE LOGIN hotel_dev WITH PASSWORD = 'Tu_dat_mat_khau_manh_rieng_may_cua_ban';
GO
USE HotelManager_OOAD;
CREATE USER hotel_dev FOR LOGIN hotel_dev;
ALTER ROLE db_datareader ADD MEMBER hotel_dev;
GRANT EXECUTE ON SCHEMA::dbo TO hotel_dev;
GO
```

Quyền trên đủ để kiểm tra kết nối, đọc dữ liệu và gọi các procedure hiện có; không cấp quyền UPDATE/DELETE tùy ý trên bảng. Chỉnh danh mục trực tiếp trong giai đoạn phát triển thì dùng phiên SSMS của người phát triển. Khi hoàn thiện CRUD JDBC cần thêm procedure/quyền tương ứng, không tự cấp `sysadmin` cho ứng dụng.

Nếu login/user đã có, bỏ các câu CREATE đã thực hiện; không tạo lại cùng tên.

### Cách B — Windows Authentication

Không cần tạo login SQL nếu Windows account đã có quyền SQL Server/CSDL. JDBC native Windows Authentication cần DLL `mssql-jdbc_auth-<version>-x64.dll` phù hợp phiên bản JDBC driver/JDK x64 trong `java.library.path` hoặc PATH. SSMS dùng Windows Authentication không tự động cung cấp DLL cho Java.

Nếu nhóm chưa quen phần DLL, có thể dùng Cách A cho utility JDBC local. Xem tài liệu Microsoft trong phần nguồn.

## 4. File cấu hình riêng từng thành viên

Chạy `configure-db.bat`, hoặc copy thủ công:

```bat
copy config\database.example.properties config\database.properties
```

Sửa `config/database.properties` trên **máy của mình**:

```properties
db.url=jdbc:sqlserver://localhost:1433;databaseName=HotelManager_OOAD;encrypt=true;trustServerCertificate=true;loginTimeout=10;
db.user=hotel_dev
db.password=MAT_KHAU_SQL_RIENG_CUA_BAN
```

Thay `1433` bằng cổng đã cấu hình. File `.properties` dùng dấu `=` và không bọc giá trị trong dấu nháy. Nếu mật khẩu có dấu `\`, cần viết `\\` theo cú pháp Java Properties, hoặc dùng biến môi trường `HOTEL_DB_PASSWORD`. Có thể ghi đè URL/user bằng `HOTEL_DB_URL` và `HOTEL_DB_USER`.

Với Windows Authentication, chọn mẫu `integratedSecurity=true` trong file example, để `db.user` và `db.password` rỗng. Chỉ giữ **một** bộ dòng cấu hình đang hoạt động.

File `config/database.properties` đã bị gitignore. Chỉ commit file example; không gửi password thật vào commit, ảnh chụp hay chat. `trustServerCertificate=true` là cấu hình **local** cho chứng chỉ tự ký; khi triển khai dùng chứng chỉ hợp lệ và xác minh chứng chỉ.

## 5. Tải JDBC driver và thử kết nối

Tải Microsoft JDBC Driver for SQL Server từ đường dẫn chính thức dưới đây, giải nén rồi copy **một** file `mssql-jdbc-<version>.jre11.jar` vào `lib/` (dùng Java 17). Không cần DLL khi dùng SQL Authentication.

Windows: chạy `check-db.bat`. Linux/macOS: `bash scripts/check-db.sh`.

Utility chỉ chạy SELECT, hiển thị server/database/phiên bản schema/số phòng/số phiếu; không chạy seed và không ghi dữ liệu. Chưa có driver hoặc cấu hình sai sẽ báo lý do. File example tự nó chưa phải cấu hình đã dùng; phải tạo `config/database.properties`.

`run.bat` vẫn mở ứng dụng với dữ liệu file như trước; **không coi kiểm tra JDBC thành công là ứng dụng đã nối toàn bộ SQL**.

## 6. Dữ liệu mẫu và tài khoản thử

| Dữ liệu | Số lượng sau khi seed mới |
|---|---:|
| Tài khoản | 104 (24 nhân viên, 80 khách) |
| Hồ sơ khách | 120 (40 không liên kết tài khoản) |
| Loại phòng / phòng | 6 / 60 |
| Dịch vụ / cấu hình dịch vụ theo loại | 20 / 24 |
| Đợt giá lễ theo loại | 24 |
| Thẻ thành viên | 80 |
| Phiếu đặt | 240 |
| Phiếu thuê / lịch sử phòng | 160 / 160 |
| Hóa đơn / dòng chi tiết | 150 / 265 |
| Giao dịch | 340 (190 cọc, 150 tất toán) |
| Sổ điểm hóa đơn | 106 |
| Lượt dọn | 158 (150 xong, 5 cần dọn, 3 bảo trì) |
| Báo thiệt hại | 6 |
| Nhật ký | 540 |
| Metadata sao lưu | 5 dòng DEMO, không có file backup thật |

Tài khoản **ứng dụng**: `admin`, `manager`, `reception`, `housekeeping`, `customer`; mật khẩu chung `Demo@123`. Ngoài ra có `customer002`…`customer080` và nhân viên phụ. Đây là bảng `dbo.Account`, khác login SQL `hotel_dev`. Trong SQL, ID khách đầu là `KH001`, ID tài khoản khách đầu `TK_C001`; không nhầm với ID KH01/TK05 của demo file Java.

Các hash tương thích `Passwords.java` (PBKDF2 HMAC-SHA256, 120.000 vòng, `saltBase64:hashBase64`), không lưu mật khẩu rõ. Dữ liệu seed dùng salt cố định để tái lập; tài khoản mới phải dùng salt ngẫu nhiên qua Java.

Tình huống có sẵn:

- 150 phiếu hoàn tất, 30 đã hủy, 30 đã xác nhận cọc, 20 chờ cọc và 10 đang lưu trú.
- 10 phiếu chờ cọc đã hết hạn, 10 còn hạn tại thời điểm seed. Sau khoảng 25 phút, các phiếu đang còn hạn cũng có thể hết hạn.
- 40 phòng trống, 10 có khách (`P151`–`P160`), 5 cần dọn (`P141`–`P145`), 3 bảo trì (`P146`–`P148`), 2 ngừng hoạt động (`P149`–`P150`). Trong 5 phòng cần dọn, 3 đã trễ hạn và 2 còn thời gian tại lúc seed.
- Hóa đơn nhiều ngày gần đây và các tháng trước, gồm tiền phòng, dịch vụ, phụ thu và giảm giá để thử thống kê.
- Thẻ có điểm/hạng khác nhau, có thẻ vô hiệu; hồ sơ và tài khoản có cả trạng thái hoạt động/lưu trữ/vô hiệu.
- Ảnh/backup/ngân hàng đều là giá trị giả hoặc đường dẫn placeholder; không có ảnh/bản sao thật và không thực hiện giao dịch tiền.

Ngày được tính từ đồng hồ **SQL Server** khi seed; chạy lại 003 chỉ đọc thống kê, không dời ngày dữ liệu cũ.

## 7. SQL kiểm tra nhanh trong SSMS

```sql
USE HotelManager_OOAD;
SELECT * FROM dbo.v_BookingLookup WHERE Phone LIKE '%000001%';
SELECT * FROM dbo.v_RoomBoard WHERE IsOverdue=1;
SELECT * FROM dbo.v_Membership ORDER BY Points DESC;
SELECT * FROM dbo.v_DailyRevenue ORDER BY RevenueDate DESC;
SELECT StatusCode,COUNT(*) SoPhieu FROM dbo.Booking GROUP BY StatusCode;
```

Thử nhận phòng ngay cho khách đang có phiếu xác nhận: các phiếu CONFIRMED mẫu nằm trong tương lai để thử lịch đặt, không cố tình bỏ kiểm tra giờ nhận. Muốn tạo mới để check-in ngay, dùng giờ nhận trong 5 phút gần nhất, ngày trả tương lai và một phòng trống như `P101` nếu không bị phiếu khác giữ trong khoảng đó. Ví dụ chạy **trên DB demo**, một lần:

```sql
DECLARE @Nhan datetime2(0)=DATEADD(MINUTE,-1,SYSDATETIME());
DECLARE @Tra datetime2(0)=DATEADD(DAY,1,SYSDATETIME());
EXEC dbo.usp_CreateBooking @BookingId='DP_TEST01',@CustomerId='KH001',@RoomId='P101',
 @StartAt=@Nhan,@EndAt=@Tra,@GuestCount=2,@ChannelCode='COUNTER',@DepositAmount=200000,@ActorId='TK03';
EXEC dbo.usp_CheckIn @StayId='PT_TEST01',@BookingId='DP_TEST01',@IdentityNo='079900000001',@ActorId='TK03';
SELECT * FROM dbo.Stay WHERE StayId='PT_TEST01';
-- Xem bảng kê trước, lấy đúng số tiền còn phải thu:
SELECT s.RoomCharge+s.Surcharge-b.DepositAmount AmountDue
 FROM dbo.Stay s JOIN dbo.Booking b ON b.BookingId=s.BookingId WHERE s.StayId='PT_TEST01';
```

Sau khi đã xem số phải thu, gọi `usp_CheckOut` với `@ExpectedAmount` đúng số đó. Trả sai số hoặc NULL bị từ chối; chạy lại cùng phiếu đã checkout cũng bị từ chối. `usp_CheckOut` hiện khớp phạm vi Java: dịch vụ phát sinh/giảm giá mới bằng 0; hóa đơn seed có các dòng dịch vụ để nhóm thử mô hình lưu trữ/thống kê trước khi triển khai nghiệp vụ nhập dịch vụ.

Các kiểm tra từ chối dùng transaction rồi rollback (đừng sửa DB thật). Ví dụ cập nhật thử điểm thẻ:

```sql
BEGIN TRY
 BEGIN TRANSACTION;
 UPDATE dbo.Membership SET Points=Points+100 WHERE MembershipId='TV001';
 ROLLBACK TRANSACTION;
 SELECT N'LỖI: thao tác phải bị chặn' AS KetQua;
END TRY
BEGIN CATCH
 IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
 SELECT ERROR_NUMBER() MaLoi,ERROR_MESSAGE() LyDo; -- mong đợi 51117
END CATCH;
```

Có thể thử thêm giá âm, trùng username/CCCD, hai phiếu giữ cùng phòng và khoảng giờ, hai giá lễ cùng loại chồng lấn, sửa hóa đơn PAID, giảm sức chứa dưới số người đã đặt. Kỳ vọng các CHECK/UNIQUE/trigger từ chối, không chỉ frontend báo lỗi.

Để thử phiếu quá hạn: `EXEC dbo.usp_ExpireUnpaidBookings;` rồi đếm lại PENDING/CANCELLED. SQL Server Express không có SQL Server Agent; hiện procedure không tự chạy nếu không có bên gọi. Khi nối backend cần gọi theo lịch/tìm phòng và xử lý retry deadlock 1205 ở **toàn bộ nghiệp vụ**.

## 8. Giới hạn và quy tắc cần nhớ

- SQL dùng `decimal(18,2)` cho tiền; Booking kiểm tra tiền nguyên đồng để tương thích Java `long`. Khi làm JDBC dùng `BigDecimal` và chuyển có kiểm tra, không dùng `double` cho tiền.
- Một Booking/Stay cho một phòng hiện tại; `StayRoomHistory` lưu từng lần đổi. `InvoiceLine` nối dịch vụ trực tiếp vào hóa đơn. Chưa hỗ trợ một phiếu đặt nhiều phòng.
- FK giữ lịch sử, không CASCADE DELETE hóa đơn/giao dịch. Hóa đơn PAID và chứng từ thanh toán không chỉnh/xóa; nghiệp vụ hoàn tiền cần được đặc tả riêng.
- Ngăn chỉnh điểm thủ công bằng đối chiếu sổ; điểm cộng khi hóa đơn chuyển PAID, khóa hóa đơn/sổ giúp tránh cộng lại.
- Các procedure nhận ActorId nhưng không tự chứng minh danh tính người gọi; backend phải xác thực phiên và quyền trước. OTP và thu hồi phiên vẫn do backend làm. DB login là thông tin nội bộ của ứng dụng, không cấp cho khách.
- Tối đa một Admin hoạt động được UNIQUE kiểm soát; chuyển Admin qua `usp_TransferAdmin` để Admin cũ thành Quản lý trong cùng transaction. Không sửa vai trò Admin trực tiếp bằng UPDATE.
- Giá hàm `fn_QuoteRoom` tính ngày theo `DailyPrice`, tối thiểu một ngày; giá giờ/đêm, gia hạn và chính sách trả trễ cần chốt tiếp. Bản SQL không tự nghĩ ra hoàn cọc cho phiếu đã cọc.
- CSDL kiểm tra dữ liệu và tính nguyên tử của procedure; việc máy thực sự nhận đủ tiền, ảnh có tồn tại, SMS đã gửi và backup .bak thật cần tầng tích hợp.

## 9. Khi gặp lỗi

| Lỗi | Việc kiểm tra |
|---|---|
| Login failed (18456) | Tên/password login SQL, Mixed Mode, login enabled; không dùng account `admin` của ứng dụng thay login SQL. |
| Connection refused / timeout | Đúng instance, SQL Server đang chạy, TCP/IP enabled, cổng đã restart, URL trùng cổng. |
| Certificate / PKIX | Máy local dùng mẫu encrypt=true;trustServerCertificate=true; triển khai thật cần chứng chỉ được tin cậy. |
| No suitable driver / thiếu SQLServerDriver | Copy đúng JAR jre11 vào lib, chạy script có classpath `lib/*`. |
| Cannot open database | Chạy 001, kiểm tra `databaseName`, tạo user và quyền trên đúng CSDL. |
| integrated authentication / DLL | Đúng phiên bản DLL, đúng x64/JDK, java.library.path/PATH. |
| Seed báo DB đã có dữ liệu | Không DROP tùy tiện; kiểm tra dữ liệu hiện có và dùng DB demo trống khi cần. |
| 1205 deadlock | Rollback và retry toàn bộ thao tác; không bỏ trigger hay bỏ kiểm tra trùng. |

## Nguồn kỹ thuật và mức kiểm chứng

Đã đối chiếu cú pháp/thiết kế với Microsoft Learn:

- https://learn.microsoft.com/en-us/sql/relational-databases/triggers/create-dml-triggers-to-handle-multiple-rows-of-data
- https://learn.microsoft.com/en-us/sql/t-sql/queries/hints-transact-sql-table
- https://learn.microsoft.com/en-us/sql/t-sql/statements/create-trigger-transact-sql
- https://learn.microsoft.com/en-us/sql/connect/jdbc/connecting-with-ssl-encryption
- https://learn.microsoft.com/en-us/sql/connect/jdbc/building-the-connection-url
- https://learn.microsoft.com/en-us/sql/connect/jdbc/download-microsoft-jdbc-driver-for-sql-server

Các script được phân tích cú pháp T-SQL và rà soát tĩnh, kiểm tra độc lập số lượng/liên kết/lịch đặt/hash mật khẩu; utility Java được biên dịch. Môi trường tạo mã **không có SQL Server đang chạy**, nên chưa xác nhận thực thi trọn bộ trên SQL Server thật. Sau khi chạy 001→002→003 trên máy nhóm, kiểm tra Messages và bảng thống kê cuối file; lỗi runtime nếu có cần được xử lý trước khi coi DB sẵn sàng.
