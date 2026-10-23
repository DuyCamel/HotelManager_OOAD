# Kết nối SQL Server trên máy của từng thành viên

Làm theo thứ tự dưới đây từ **thư mục gốc repo**, nơi có `run.bat`, `configure-db.bat`, `check-db.bat`. Mỗi người sử dụng SQL Server trên máy của mình. Không copy tên máy hoặc mật khẩu của người khác.

**Kết quả cần đạt:** `check-db.bat` báo kết nối thành công, đúng CSDL `HotelManager_OOAD`, `Schema=2`, `Phòng=60`, `Phiếu đặt=240` ngay sau khi chèn dữ liệu mẫu.

## Bước 1 — Kiểm tra đã cài đủ công cụ

| Công cụ | Dùng để làm gì | Cách kiểm tra |
|---|---|---|
| SQL Server Database Engine 2019+ / Express | Máy chủ lưu dữ liệu | Mở SQL Server Configuration Manager → SQL Server Services, dịch vụ SQL Server phải Running |
| SQL Server Management Studio (SSMS) | Chạy 3 file SQL và xem dữ liệu | Mở SSMS, kết nối được vào instance của mình |
| JDK 17+ | Biên dịch/chạy Java và kiểm tra JDBC | Trong CMD: `java -version` và `javac -version` đều chạy được |
| Microsoft JDBC driver | Cho Java kết nối SQL Server | Sẽ tải và đặt vào thư mục ở Bước 6 |

**Chỉ cài SSMS thì chưa có máy chủ SQL Server. Chỉ cài JRE thì chưa có `javac`.**

Nên giải nén repo vào vị trí dễ tìm như `D:\Projects\HotelManager_OOAD`.

## Bước 2 — Xác định đúng SQL Server instance

Mở **SQL Server Configuration Manager → SQL Server Services**:

- Hiển thị `SQL Server (MSSQLSERVER)`: đây là default instance; SSMS thường dùng Server name `localhost`.
- Hiển thị `SQL Server (SQLEXPRESS)`: đây là named instance; SSMS thường dùng `localhost\SQLEXPRESS`.
- Nếu tên khác SQLEXPRESS, dùng đúng tên trong dấu ngoặc.

Trong SSMS chọn **Windows Authentication**, đăng nhập bằng Windows account đã có quyền SQL Server. Nếu chưa đăng nhập được ở bước này, kiểm tra dịch vụ/instance/quyền trước khi làm bước tiếp theo.

Phân biệt ba giá trị:

| Giá trị | Ví dụ | Điền ở đâu |
|---|---|---|
| Tên instance | `localhost\SQLEXPRESS` | Ô Server name trong SSMS |
| TCP host và port | `localhost:1433` | JDBC URL của Java, sau khi cấu hình bước 4 |
| Tên CSDL | `HotelManager_OOAD` | Script SQL và `databaseName` trong JDBC URL |

## Bước 3 — Chạy lần lượt 3 file SQL

Trong SSMS mở **File → Open → File**, tìm thư mục `backend/database/sql/`:

1. Mở `001_create_database.sql`, chạy **toàn bộ file bằng F5**. File tạo CSDL và bảng; cần tài khoản có quyền tạo CSDL.
2. Mở `002_constraints_and_logic.sql`, F5. File cài kiểm tra, khóa ngoại, chỉ mục, trigger và procedure.
3. Mở `003_seed_demo_data.sql`, F5. File chèn dữ liệu giả và hiển thị thống kê.

Sau **mỗi file**, xem tab **Messages**, chỉ chạy tiếp khi không có lỗi đỏ. Không chỉ bôi đen một đoạn giữa file, vì các đoạn sau phụ thuộc bảng/biến đã được khai báo trước đó. Không cần bật SQLCMD Mode để chạy các file này bằng SSMS.

Sau file 003, kiểm tra nhanh:

```sql
USE HotelManager_OOAD;
SELECT DB_NAME() AS CurrentDatabase;
SELECT MAX(VersionNo) AS SchemaVersion FROM dbo.SchemaVersion;
SELECT COUNT(*) AS Rooms FROM dbo.Room;
SELECT COUNT(*) AS Customers FROM dbo.Customer;
SELECT COUNT(*) AS Bookings FROM dbo.Booking;
SELECT COUNT(*) AS Invoices FROM dbo.Invoice;
```

Kết quả trên DB mẫu mới: **SchemaVersion=2, Rooms=60, Customers=120, Bookings=240, Invoices=150**. Chạy lại file 003 không sinh thêm dữ liệu trùng. Chi tiết bảng và tình huống mẫu ở [SQL_REFERENCE.md](SQL_REFERENCE.md).

## Bước 4 — Bật TCP/IP và xác định port cho Java

SSMS có thể kết nối qua phương thức khác TCP, vì vậy SSMS kết nối được chưa đủ để Java kết nối.

1. Trong Configuration Manager → **SQL Server Network Configuration → Protocols for instance của bạn**.
2. Đặt **TCP/IP → Enabled = Yes**.
3. Mở TCP/IP → **IP Addresses**, kéo xuống **IPAll**.
4. Chọn cổng cố định: ví dụ `1433`, hoặc `14330` nếu cổng 1433 đã có instance khác dùng. Xóa giá trị trong **TCP Dynamic Ports**, điền số vào **TCP Port**.
5. Về SQL Server Services, **Restart đúng dịch vụ SQL Server** của instance đó.

Ghi lại cổng vừa đặt. Nếu dùng port 14330, JDBC URL phải là `localhost:14330`; không để URL 1433.

Với cấu hình cổng cố định, Java không cần ghi `\SQLEXPRESS` trong URL; instance được xác định bằng cổng đang lắng nghe. Kết nối local không yêu cầu chia sẻ server của một thành viên cho cả nhóm.

## Bước 5 — Tạo SQL login riêng cho Java

Hướng dẫn chính dùng **SQL Authentication** để không phải xử lý DLL Windows Authentication. Windows Authentication cho JDBC được mô tả ở phần lựa chọn bên dưới.

1. SSMS → chuột phải server → **Properties → Security**.
2. Chọn **SQL Server and Windows Authentication mode** (Mixed Mode).
3. Restart dịch vụ SQL Server sau khi đổi mode.
4. Đăng nhập SSMS bằng tài khoản quản trị local và chạy đoạn sau **một lần**. Thay mật khẩu mẫu bằng mật khẩu riêng của mình trước khi chạy:

```sql
USE master;
GO
CREATE LOGIN hotel_dev WITH PASSWORD = 'Thay_mat_khau_manh_rieng_cua_ban_123!';
GO
USE HotelManager_OOAD;
GO
CREATE USER hotel_dev FOR LOGIN hotel_dev;
ALTER ROLE db_datareader ADD MEMBER hotel_dev;
GRANT EXECUTE ON SCHEMA::dbo TO hotel_dev;
GO
```

Nếu login/user đã có thì không chạy lại dòng CREATE tương ứng. Không cấp `sysadmin` cho tài khoản ứng dụng. Quyền trên phục vụ đọc và các procedure hiện có; CRUD JDBC chưa hoàn thiện sẽ cần bổ sung procedure/quyền theo công việc sau.

**Đừng nhầm hai loại tài khoản:**

| Tài khoản | Ví dụ | Mật khẩu | Dùng ở đâu |
|---|---|---|---|
| Login SQL Server | `hotel_dev` | Do từng thành viên tự đặt | File cấu hình kết nối JDBC |
| Tài khoản ứng dụng trong `dbo.Account` | `admin`, `reception`, `customer` | `Demo@123` với dữ liệu mẫu | Màn hình đăng nhập ứng dụng |

Không lấy `admin / Demo@123` điền làm login SQL Server.

## Bước 6 — Đặt JDBC driver vào đúng thư mục

Tải từ trang Microsoft: https://learn.microsoft.com/en-us/sql/connect/jdbc/download-microsoft-jdbc-driver-for-sql-server

Giải nén gói tải xuống, lấy **một** file `mssql-jdbc-<version>.jre11.jar` và đặt tại:

```text
backend/database/lib/mssql-jdbc-<version>.jre11.jar
```

Phần `<version>` là phiên bản thật trong tên file tải về, không đổi tên thành chữ `<version>`. Dùng bản JAR jre11 cho JDK 17. Không copy cả file ZIP hoặc đặt nhiều phiên bản driver trong cùng thư mục.

SQL Authentication không cần DLL. JAR đã được gitignore để mỗi máy tự cài.

## Bước 7 — Tạo và sửa cấu hình riêng máy mình

Từ thư mục gốc repo, chạy `configure-db.bat`. Script mở Notepad với file:

```text
backend/database/config/database.properties
```

Điền như sau, thay port và mật khẩu theo bước 4–5:

```properties
db.url=jdbc:sqlserver://localhost:1433;databaseName=HotelManager_OOAD;encrypt=true;trustServerCertificate=true;loginTimeout=10;
db.user=hotel_dev
db.password=MAT_KHAU_SQL_BAN_DA_DAT_O_BUOC_5
```

Lưu bằng **Ctrl+S**, đóng Notepad. Không bọc password trong dấu nháy. Nếu password có ký tự `\`, ghi `\\` trong Properties hoặc dùng biến môi trường `HOTEL_DB_PASSWORD`. File thật `database.properties` đã được gitignore; chỉ file `database.example.properties` được chia sẻ trong repo.

`trustServerCertificate=true` dùng cho môi trường local với chứng chỉ tự ký. Khi triển khai thật cần cấu hình chứng chỉ được xác minh.

**Nếu dùng Windows Authentication thay SQL Authentication:** xem mẫu `integratedSecurity=true` trong `database.example.properties`, để user/password rỗng; đặt DLL `mssql-jdbc_auth-<version>-x64.dll` đúng phiên bản driver trong `java.library.path`/PATH. Không trộn hai mẫu URL. Nếu chưa quen DLL, dùng hướng dẫn SQL Authentication phía trên.

## Bước 8 — Chạy kiểm tra kết nối và đọc kết quả

Từ thư mục gốc, mở `check-db.bat`. Script biên dịch rồi chạy SELECT, không mở UI và không thay dữ liệu SQL. Ví dụ kết quả đúng:

```text
Kết nối thành công: TENMAY\SQLEXPRESS / HotelManager_OOAD
Schema=2, Phòng=60, Phiếu đặt=240
```

Tên server có thể khác ví dụ. Nếu đã thêm/sửa dữ liệu thì số lượng cũng có thể khác. Điều cần kiểm tra là **đúng server của mình, đúng database và không có thông báo lỗi**.

Linux/macOS có SQL Server truy cập được: cấu hình cùng file, dùng `bash scripts/check-db.sh` thay batch Windows. Hệ điều hành khác không dùng DLL native Windows.

## Bước 9 — Biết phần nào đã nối và phần nào đang chờ

- `check-db.bat` thành công: **utility JDBC kết nối thật với SQL Server của máy bạn**.
- `run.bat`: mở Swing, **hiện vẫn dùng FileHotelRepository** và `data/hotel.bin`.
- Muốn service/UI đọc ghi SQL, cần hoàn thiện repository/DAO và ghép vào `HotelBackend`. Chỉ sửa connection string chưa hoàn thành bước này.

Người làm database sửa SQL/JDBC/repository trong `backend/database/`. Người làm nghiệp vụ sửa `backend/service/`. Các bên thống nhất model/DTO trong `backend/common/` khi cần tích hợp.

## Lỗi thường gặp và chỗ cần sửa

| Thông báo / hiện tượng | Kiểm tra và xử lý |
|---|---|
| `javac` không được nhận diện | Cài JDK 17+, thêm thư mục bin của JDK vào PATH, mở lại CMD |
| Chưa có `database.properties` | Chạy `configure-db.bat`, lưu file đúng thư mục ở bước 7 |
| Thiếu `SQLServerDriver` / No suitable driver | Kiểm tra file JAR thật ở `backend/database/lib/`, chạy `check-db.bat` từ repo |
| Timeout / Connection refused | SQL Server đang Running, TCP/IP enabled, đúng port và đã Restart ở bước 4 |
| Login failed / 18456 | Kiểm tra Mixed Mode, login `hotel_dev`, password của bước 5, không dùng tài khoản ứng dụng |
| Cannot open database | Chạy đủ 001–003, `databaseName=HotelManager_OOAD`, tạo user và quyền trong đúng DB |
| PKIX / certificate | Kiểm tra URL local giữ `encrypt=true;trustServerCertificate=true;` |
| Integrated authentication / lỗi DLL | Đang chọn Windows Auth: cần DLL đúng phiên bản/x64; hoặc quay về mẫu SQL Authentication |
| `SchemaVersion` / `dbo.Room` không tồn tại | Đang nối sai database hoặc chưa chạy 001–002 thành công |
| Thêm SQL nhưng UI chưa thấy dữ liệu | UI vẫn dùng file; đọc bước 9, không phải lỗi đăng nhập SQL |

Nếu cần gửi lỗi cho nhóm, gửi **tên bước + nguyên văn thông báo lỗi**, che password và thông tin nhạy cảm. Tham chiếu chi tiết về schema và câu SQL thử tại [SQL_REFERENCE.md](SQL_REFERENCE.md).

Hướng dẫn đã được kiểm tra đường dẫn và utility Java. Môi trường tạo mã chưa có SQL Server thật để chạy các bước kết nối; mỗi thành viên cần thực hiện bước 8 trên máy mình trước khi báo đã cấu hình xong.
