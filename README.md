# Aurora · HotelManager Web

Đồ án quản lý khách sạn chuyển từ Java desktop sang **JavaScript / Node.js / Express / EJS / SQL Server**. Frontend và backend nằm ở hai thư mục riêng; backend tách phần **database** và **service**. Mỗi file mã nguồn có chú thích mô tả trách nhiệm. Không còn mã Java, thư viện desktop hay thư mục/script test trong phiên bản này.

## Phân công phần việc còn lại

Xem [phân công 3 thành viên](docs/PHAN_CONG_3_NGUOI.md): TV1 hệ thống/tài khoản/hồ sơ; TV2 đặt phòng/lưu trú/thanh toán; TV3 phòng/buồng phòng/báo cáo/database. Mỗi người làm cả backend và frontend của module. Đầu các file có `TASK-BAN-GIAO`, người phụ trách và mã việc; phân biệt lỗi cần sửa, phần thiếu, nghiệm thu và việc cần chốt.

Bảng phân công được rà từ commit `d2c9ba4`. Các chú thích giao việc **không đồng nghĩa đã sửa hoặc triển khai**. Quy tắc thời gian mới đã khác một số mô tả bên dưới; xem B1/C1/C6 để đồng bộ code, SQL và tài liệu.

## Chạy nhanh bằng VS Code

Cài Node.js **22 trở lên**. Mở đúng thư mục chứa `package.json` trong VS Code, mở Terminal:

```bash
npm install
npm run dev
```

Mở http://localhost:3000. `npm install` tự tạo `.env` riêng với khóa phiên ngẫu nhiên. Nếu thiếu, chạy `npm run setup`. Sau lần cài đầu, có thể nhấn **F5 → Hotel Web — F5** hoặc chạy `npm start`. `npm run dev` tự khởi động lại khi sửa JavaScript phía server; sửa CSS/giao diện thì tải lại trình duyệt. Dừng bằng Ctrl+C. Không chạy F5 và npm start cùng một cổng.

Mặc định `DB_MODE=demo`, có dữ liệu JSON trên máy và lưu thay đổi qua lần khởi động. **Chế độ demo không kết nối SQL Server.** Muốn dùng database thật, làm theo [hướng dẫn database](docs/DATABASE.md), rồi chạy `npm run db:check`.

| Vai trò | Email mẫu |
|---|---|
| Admin | admin@hotel.test |
| Quản lý | manager@hotel.test |
| Nhân viên | reception@hotel.test |
| Buồng phòng | housekeeping@hotel.test |
| Khách hàng | customer@hotel.test |

Mật khẩu mẫu: **Demo@123**. Các tài khoản này có trong cả demo JSON và file SQL seed. Email là định danh đăng nhập, **không có username**. Dữ liệu cá nhân, tài khoản ngân hàng và giao dịch mẫu đều giả.

## Cấu trúc

```text
backend/
  config/                 Đọc và kiểm tra .env
  controllers/            Nhận request, gọi command nghiệp vụ
  routes/                 Tuyến HTML/API; tải ảnh hiện trạng
  middleware/             Phiên đăng nhập, CSRF, giới hạn đăng nhập
  database/               PHẦN LÀM VIỆC VỚI DATABASE
    sql/                  Đúng 3 file SQL, chạy 001 → 002 → 003
    repositories/         Adapter SQL Server và JSON demo
    seed/                 Sinh dữ liệu JSON demo
    connection.js         Pool SQL và kiểm tra schema version
    schema.js             Ánh xạ entity/cột; không nhận tên bảng từ client
    index.js              Chọn adapter theo DB_MODE
  service/                PHẦN LÀM VIỆC VỚI NGHIỆP VỤ
    authService.js        Email, đăng ký, OTP demo và chuyển Admin
    bookingService.js     Đặt, cọc, hết hạn, nhận/đổi phòng
    billingService.js     Dịch vụ phát sinh, bảng kê, hóa đơn, điểm thẻ
    customerService.js    Khách hàng và thẻ thành viên
    catalogService.js     Phòng, loại phòng, dịch vụ, giá lễ
    accountService.js     Tài khoản và phân quyền
    housekeepingService.js Dọn phòng và báo hỏng kèm ảnh
    profileService.js     Hồ sơ và đổi mật khẩu
    readService.js        Dữ liệu đọc được lọc theo vai trò/chủ sở hữu
    systemService.js      Cấu hình, sao lưu, khôi phục demo
    helpers.js            Giá theo ngày, lịch trùng, audit, hạn dọn
    index.js              Ghép các service
  shared/                 Lỗi, kiểm tra đầu vào, quyền, băm mật khẩu
frontend/
  views/                  EJS: trang công khai, đăng nhập, workspace, hóa đơn
  public/css/             Giao diện responsive
  public/js/              Tương tác trình duyệt và HTTP API
scripts/                  Tạo .env và kiểm tra kết nối
.vscode/                  Cấu hình F5
.env_ex                   Mẫu cấu hình dùng chung; không chứa bí mật thật
server.js                 Điểm khởi động
```

Frontend dùng HTML/EJS, CSS và JavaScript thuần; không cần build React hoặc chạy hai server. Express render HTML rồi phục vụ tài nguyên frontend; service vẫn tách độc lập với giao diện. Hình minh họa phòng là CSS, không phải ảnh phòng thực tế.

## Chức năng và phạm vi hiện tại

- Trang khách sạn, tìm phòng theo ngày/số khách, đăng ký và đăng nhập email, hồ sơ cá nhân, đổi mật khẩu.
- Đặt online giữ 30 phút chưa thu tiền; đặt tại quầy có cọc; nhân viên xác nhận cọc thủ công. Chống lịch trùng; job hết hạn mỗi phút và khi tạo/xác nhận phiếu.
- Nhận phòng đúng khoảng lưu trú, kiểm tra giấy tờ và phòng sẵn sàng; đổi phòng, tính chênh lệch giá dương; trả phòng với bảng kê đối chiếu số tiền.
- Ghi/hủy dịch vụ khi đang ở; snapshot đơn giá. Hóa đơn có dòng phòng/dịch vụ/phụ thu, cọc và thu tất toán riêng; cộng điểm một lần khi thanh toán. Xem/in hoặc lưu PDF qua trình duyệt.
- Hồ sơ khách, cấp/vô hiệu hóa thẻ, danh mục, tài khoản, phân quyền; khóa/đổi quyền/đổi mật khẩu làm phiên cũ mất hiệu lực.
- Sơ đồ phòng, xác nhận dọn, báo hỏng kèm ảnh PNG/JPEG, hạn dọn 90 phút. Buồng phòng không có trang tổng quan.
- Báo cáo từ hóa đơn PAID, lọc ngày UTC, xuất CSV; audit cho thay đổi nghiệp vụ. Admin cấu hình khách sạn, sao lưu JSON demo hoặc SQL `.bak`; khôi phục demo qua UI, SQL khôi phục ngoại tuyến bằng SSMS.

Xem [ma trận quyền](docs/PERMISSIONS.md) và [kiến trúc / luồng dữ liệu](docs/ARCHITECTURE.md).

## Những điểm cần chốt tiếp

Đây là bản đồ án chạy local để xem xét và phát triển tiếp. Backend đã có các luồng nghiệp vụ nêu trên, chưa phải bản triển khai production. `NODE_ENV=production` chủ động dừng vì chưa tích hợp session store dùng chung và SMS thật. Phiên phát triển nằm trong bộ nhớ và mất khi server restart.

- OTP chuyển Admin là **demo local**, hiển thị rõ trên màn hình, không gửi SMS. Chỉ Quản lý đang hoạt động được nhận quyền; Admin cũ trở thành Quản lý. Chưa có thanh toán ngân hàng, email hoặc SMS thật.
- Giá phòng đang tính **theo ngày UTC**, tối thiểu 1 ngày, từng ngày có thể cộng % giá lễ. Giá giờ/đêm, phụ thu trễ và cấu hình giờ nhận/trả được lưu nhưng chưa tự áp dụng; bảng kê chỉ có phụ thu đổi phòng. Không tự thêm một chính sách chưa được thống nhất.
- Hủy chỉ cho phiếu chưa cọc. Hoàn cọc, hoàn tiền, sửa hóa đơn PAID, đổi lịch đã cọc và chiết khấu/đổi điểm cần thống nhất quy trình riêng.
- SQL Server chưa được chạy thực tế trong môi trường phát triển này; cần chạy đủ ba script bằng SSMS và thử lại các luồng trên máy có SQL Server. Phân tích cú pháp không thay thế việc thực thi SQL.
- Dữ liệu demo đơn máy; SQL repository hiện ưu tiên đúng transaction và dễ đọc cho đồ án, chưa tối ưu truy vấn/phân trang ở database khi dữ liệu lớn. Ảnh báo hỏng lưu cục bộ `data/uploads`; sao lưu SQL không tự sao lưu ảnh.

## Quy tắc làm việc nhóm

Commit `.env_ex`, không commit `.env`, `data/`, mật khẩu thật hoặc file `.bak`. Mỗi thành viên tự tạo database local bằng 001/002/003 và cấu hình máy mình. `.env_ex` không tự được đọc lúc chạy; ứng dụng đọc `.env`. `npm run setup` **không ghi đè** cấu hình đã có.

Không thêm test vào repo theo yêu cầu hiện tại. Kiểm tra thủ công bằng các vai trò và luồng mô tả trong tài liệu. Dùng `npm ci` khi đã có lockfile để cài đúng phiên bản thư viện.
