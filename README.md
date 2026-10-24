# Aurora HotelManager Web

JavaScript / Express / EJS / SQL Server. Cấu trúc MVC theo từng đối tượng; route, controller, model, view và JavaScript giao diện tách thành các thư mục module.

## Chạy trong VS Code

Node.js 22+. Mở thư mục chứa `package.json`:

```bash
npm ci
npm run dev
```

Mở http://localhost:3000. Hoặc nhấn F5 sau khi cài thư viện. Điểm chạy là `src/server.js`; Express cấu hình ở `src/app.js`. `npm start` chạy bình thường, `npm run dev` theo dõi thay đổi server. `npm run setup` tạo `.env` từ `.env_ex` nếu chưa có, không ghi đè file riêng của máy.

Mặc định `DB_MODE=demo`, dữ liệu lưu local; muốn SQL thật xem [DATABASE.md](docs/DATABASE.md), chạy ba script trong `database/`, cấu hình `.env` rồi `npm run db:check`. SQL lỗi không tự fallback demo.

| Vai trò | Email demo |
|---|---|
| Admin | admin@hotel.test |
| Quản lý | manager@hotel.test |
| Nhân viên | reception@hotel.test |
| Buồng phòng | housekeeping@hotel.test |
| Khách | customer@hotel.test |

Mật khẩu: `Demo@123`. Mọi thông tin mẫu đều giả. Tài khoản đăng nhập bằng email, không có username.

## Mở đúng nơi để làm việc

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
| Schema, trigger/view/proc, seed | `database/01_schema.sql`, `02_programmability.sql`, `03_seed.sql` |

- [Danh sách module và quy tắc MVC](docs/MODULES.md)
- [Phân công 3 người và TODO còn lại](docs/PHAN_CONG_3_NGUOI.md)
- [Bảng tự đăng ký module](docs/Module_Signup.xlsx)
- [Từ điển dữ liệu tự sinh](docs/DATABASE_DICTIONARY.md)
- [Kết nối database trên từng máy](docs/DATABASE.md)
- [Ma trận quyền](docs/PERMISSIONS.md)

```bash
npm run docs:dictionary
npm run docs:check
```

Dictionary tự sinh từ DDL trong repo, không cần SQL đang chạy. Không sửa tay file này.

## Trạng thái chức năng

Đã có luồng cơ bản: đăng nhập/đăng ký, tài khoản, hồ sơ/thẻ, đặt/cọc/nhận/đổi phòng, dịch vụ, trả phòng/hóa đơn/in, danh mục, dọn/báo hỏng, báo cáo CSV cơ bản, backup demo/SQL và restore demo. Refactor này giữ URL API cũ và quyền, đồng thời đưa mỗi trang về controller/view riêng.

Các task còn lại trong phân công vẫn giữ: B1 lỗi đặt hôm nay, B2 gia hạn; A3 lọc/xuất audit đầy đủ; A4 SMS thật; C1 đồng bộ thời gian/giá và chạy SQL thật; C2/C3/C4 hoàn thiện ảnh/tiện ích/countdown/báo cáo. Có folder hoặc model không có nghĩa tính năng đã hoàn tất.

Bản local dùng session bộ nhớ, OTP chuyển Admin hiển thị mã DEMO. Chưa có SMS/cổng ngân hàng thật. Production vẫn bị chặn có chủ ý. SQL restore làm ngoại tuyến bằng SSMS. Chưa nghiệm thu trên SQL Server thật trong môi trường này.

Không commit `.env`, `data/`, mật khẩu/API key, `node_modules` hoặc `.bak`. Không thêm test tự động theo yêu cầu hiện tại. Tài liệu module và task là nơi bàn giao giữa các thành viên.
