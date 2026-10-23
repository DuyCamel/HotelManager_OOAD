# HotelManager OOAD — Java Desktop

Ứng dụng quản lý khách sạn bằng **Java 17 + Swing**, tách `frontend` và `backend`, trong backend có hai phần làm việc chính `database` và `service`, cùng module dùng chung `common`. Bản đầu phục vụ xem xét giao diện và chạy thử nghiệp vụ; dữ liệu được lưu cục bộ, không phải hệ thống triển khai nhiều máy.

![Giao diện tổng quan](docs/screenshots/overview.png)

## Chạy ngay trong VS Code

1. Cài **JDK 17 trở lên** cho dự án và tiện ích **Extension Pack for Java** của Microsoft trong VS Code. Nếu VS Code gợi ý cài tiện ích được đề xuất, chọn Install.
2. Chọn **File → Open Folder**, mở đúng thư mục gốc `HotelManager_OOAD` có `pom.xml`, `backend`, `frontend` và `.vscode`. Không chỉ mở riêng một file Java hoặc thư mục frontend.
3. Đợi Java tải/import xong các Maven project; lần đầu có thể cần Internet để tải thành phần phụ thuộc.
4. Nhấn **F5**, hoặc mở **Run and Debug → Chạy HotelManager → nút tam giác xanh**. Giao diện đăng nhập Swing sẽ mở trong cửa sổ riêng.

Cấu hình `.vscode/launch.json` đã chỉ định main class và module frontend, đồng thời đặt thư mục chạy về gốc repo để dữ liệu vẫn lưu ở `data/hotel.bin`. Không phải nhập lệnh hay mở batch để chạy từ VS Code.

Có thể mở `frontend/src/main/java/vn/hotel/app/HotelApplication.java` rồi bấm **Run** ngay phía trên hàm `main`. Dùng nút Run của tiện ích Java, vì dự án có nhiều module phụ thuộc nhau.

Nếu chưa thấy Java Projects hoặc có thông báo “project frontend not found”, kiểm tra đã mở đúng thư mục gốc, đợi import xong rồi dùng **Ctrl+Shift+P → Java: Import Java Projects in Workspace**. Nếu tiện ích yêu cầu JDK mới hơn cho language server, cài theo gợi ý của tiện ích; mã dự án vẫn đặt mức Java 17 trong pom.xml.

Đăng nhập thử `admin` / `Demo@123`. Bản hiện tại mở UI với dữ liệu file; kết nối SQL Server được hướng dẫn riêng trong backend/database.

## Chạy trên Windows

1. Cài **JDK 17 hoặc mới hơn**, kiểm tra `java -version` và `javac -version`.
2. Tải repository, giải nén; mở `run.bat`. Hoặc mở thư mục gốc trong IntelliJ/VS Code và chạy `vn.hotel.app.HotelApplication` sau khi biên dịch cả hai module.
3. Không cần MySQL, Maven hay tải thư viện ngoài để chạy bằng script.

Linux/macOS: `bash run.sh`. Nếu dùng Maven: `mvn package` ở thư mục gốc, khi chạy main thủ công cần classpath của frontend và cả ba module backend. Các script là đường chạy đã kiểm thử trong phiên tạo mã.

## Tài khoản thử nghiệm

| Tên đăng nhập | Vai trò | Mật khẩu |
|---|---|---|
| admin | Admin | Demo@123 |
| manager | Quản lý | Demo@123 |
| reception | Lễ tân | Demo@123 |
| housekeeping | Buồng phòng | Demo@123 |
| customer | Khách hàng | Demo@123 |

Dữ liệu mẫu được tạo **một lần** khi chưa có tài khoản. Dữ liệu phát sinh lưu vào `data/hotel.bin`. Không chạy nhiều tiến trình cùng dùng file này. Để thử lại từ đầu, sao lưu rồi đổi tên file dữ liệu; ứng dụng tạo bộ demo mới. Không dùng thông tin cá nhân hoặc mật khẩu thật.

## Cấu trúc

```text
backend/
  database/       Toàn bộ công việc CSDL và lưu trữ
    sql/          3 file SQL Server: tạo DB, kiểm tra, dữ liệu mẫu
    config/       Cấu hình kết nối riêng từng máy
    lib/          JDBC driver
    src/          JDBC, repository và dữ liệu demo file
  service/        Nghiệp vụ, xác thực, phân quyền và ghép backend
    src/          Service Java
  common/         Model, DTO, lỗi và tiện ích dùng chung
frontend/         Giao diện Swing
  src/            Màn hình, controller và UI dùng chung
docs/             Kiến trúc và đối chiếu tài liệu
scripts/          Biên dịch và kiểm tra kết nối DB
configure-db.bat   Tạo cấu hình database riêng máy
check-db.bat       Kiểm tra kết nối SQL Server
run.bat           Chạy ứng dụng trên Windows
run.sh            Chạy ứng dụng trên Linux/macOS
```

Mỗi file Java có chú thích trách nhiệm. Xem [danh mục file](docs/FILE_GUIDE.md) và [kiến trúc](docs/ARCHITECTURE.md).

## Thử nhanh

Đăng nhập `reception` → **Phiếu đặt & check-in** → chọn `DPDEMO01` → nhập giấy tờ → nhận phòng. Mở **Lưu trú & checkout** → xem bảng kê → chọn phương thức → chỉ xác nhận sau khi giả lập nhận đủ tiền. Hóa đơn xuất hiện tại **Hóa đơn**; phòng chuyển Cần dọn. Đăng nhập `housekeeping` → **Sơ đồ buồng phòng** → chọn phòng → xác nhận dọn xong.

Các bảng có tìm kiếm, phân trang, CSV và in. Hóa đơn có cửa sổ in riêng. Muốn PDF, chọn máy in **Microsoft Print to PDF** hoặc máy in PDF khác của hệ điều hành; ứng dụng chưa có bộ xuất PDF độc lập.

## Phạm vi bản đầu

Đã có giao diện cho 5 vai trò và các nhóm nghiệp vụ trong tài liệu mới. Luồng chính chạy với lưu trữ file: đăng ký/đăng nhập, danh mục, giá lễ, hồ sơ/thẻ, đặt phòng, cọc thủ công, nhận/đổi phòng, checkout, hóa đơn, dọn phòng, tài khoản/quyền, nhật ký, báo cáo doanh thu, sao lưu và khôi phục.

**Mô phỏng hoặc chưa hoàn thiện:** SMS OTP, VietQR/webhook ngân hàng, SQL/JDBC, tính phí giờ/qua đêm và trả trễ, liên kết dịch vụ theo mã loại phòng, dịch vụ phát sinh, đặt nhiều phòng, xuất XLSX/PDF trực tiếp, logo/ảnh được sao chép vào kho quản lý. Giá demo đặt phòng tính theo ngày/đêm dựa vào `dailyPrice`; hai giá khác được lưu và hiển thị để triển khai sau. Xem [ma trận phạm vi](docs/TRACEABILITY.md).


## Chọn đúng phần để làm việc

- Làm SQL, JDBC hoặc lưu trữ: [backend/database](backend/database/README.md).
- Làm nghiệp vụ: [backend/service](backend/service/README.md).
- Cài máy mới, kết nối SQL Server: **[Hướng dẫn kết nối từng bước](backend/database/HUONG_DAN_KET_NOI.md)**.
- Tổng quan backend: [backend/README.md](backend/README.md).

## SQL Server và cấu hình từng máy

Đã có bộ 3 script tại [database](backend/database/README.md): `001_create_database.sql`, `002_constraints_and_logic.sql`, `003_seed_demo_data.sql`. Chạy theo thứ tự trong SSMS để tạo 22 bảng, cài ràng buộc/nghiệp vụ và chèn dữ liệu giả (60 phòng, 120 khách, 240 phiếu đặt, 150 hóa đơn).

Mỗi thành viên chạy `configure-db.bat`, sửa `backend/database/config/database.properties`, thêm Microsoft JDBC JAR vào `backend/database/lib/`, rồi chạy `check-db.bat` để kiểm tra kết nối. Hướng dẫn tạo login SQL, bật TCP/IP/cổng và quyền nằm trong `backend/database/README.md`.

Đường chạy Swing hiện vẫn dùng `FileHotelRepository`; utility kết nối SQL tách riêng để hoàn thiện JDBC sau. Không nhầm `Demo@123` của bảng tài khoản ứng dụng với mật khẩu login SQL trên từng máy.

## Nếu đã tải bản cấu trúc cũ

SQL hiện ở `backend/database/sql/`. Cấu hình local chuyển từ `config/database.properties` sang `backend/database/config/database.properties`; `configure-db.bat` sẽ copy file cấu hình cũ nếu tìm thấy và chưa có file mới. JDBC JAR chuyển vào `backend/database/lib/`. Tên package và định dạng `data/hotel.bin` được giữ nguyên.
