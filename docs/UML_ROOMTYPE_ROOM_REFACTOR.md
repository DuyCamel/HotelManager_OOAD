# Điều chỉnh sơ đồ lớp phân tích: Loại phòng và Phòng

> Phạm vi: hai thay đổi đã thống nhất. Đây là **mô hình phân tích**; không yêu cầu một lớp tương ứng với một bảng SQL. Sơ đồ UML gốc dạng PDF do người dùng cung cấp không có trong repository nên tài liệu này là đặc tả để cập nhật bản vẽ, không tuyên bố đã chỉnh trực tiếp PDF.

## 1. Gộp Giá cơ bản vào Loại phòng

- **Xóa lớp `Giá cơ bản`** khỏi sơ đồ và xóa quan hệ composition `Loại phòng — Giá cơ bản`.
- **Giữ lớp `Loại phòng`** với các đặc trưng: tên, sức chứa, số giường, giá giờ, giá đêm, giá ngày, tiện nghi.
- **Giữ quan hệ** `Loại phòng (1) — Phòng (0..*)`: mỗi phòng thuộc đúng một loại phòng; một loại phòng có thể chưa có phòng.
- **Giữ quan hệ** `Đợt giá lễ — Loại phòng`: một đợt giá lễ thuộc đúng một loại phòng; một loại phòng có thể có 0..* đợt giá lễ.
- Không gộp `Đợt giá lễ` vào Loại phòng: có ngày bắt đầu/kết thúc và tỷ lệ tăng riêng.
- Không xóa `Cấu hình dịch vụ theo loại phòng`: nó biểu diễn kết hợp Loại phòng–Dịch vụ và thuộc tính `IsIncluded`.

**SQL hiện tại đã đúng với quyết định này:** `dbo.RoomType` có `HourlyPrice`, `NightlyPrice`, `DailyPrice`, `Capacity`, `Beds`, `Amenities`; không tồn tại bảng `BasePrice`. Mapping `src/models/room-types/schema.js` và form `src/public/js/modules/room-types/fields.js` đã sử dụng trực tiếp các trường giá trên loại phòng.

## 2. Gộp Thông tin phòng vào Phòng

- **Xóa lớp `Thông tin phòng`** khỏi sơ đồ cùng association/composition riêng của lớp này.
- **Giữ lớp `Phòng`** với số/mã phòng, tên, loại phòng, trạng thái, hình ảnh, mô tả/ghi chú.
- Trong thực thi hiện tại, thông tin mô tả riêng của một phòng dùng `Room.Note` (mức phân tích gọi là *mô tả/ghi chú*), hình ảnh dùng `Room.ImagePath`. Các tiện nghi chung cho một loại phòng thuộc `RoomType.Amenities`, không nhân đôi vào từng phòng.
- **Giữ** `Phòng — Đặt phòng` (giữ chỗ) và `Phòng — Phiếu thuê phòng` (phòng thực nhận): hai quan hệ khác thời điểm và khác ý nghĩa nghiệp vụ.
- **Giữ** quan hệ `Phòng — Loại phòng`; không cần nối `Thông tin phòng` sang `Loại phòng` nữa.

**SQL hiện tại đã đúng với quyết định này:** `dbo.Room` có `RoomTypeId`, `Name`, `StatusCode`, `ImagePath`, `Note`; không có bảng `RoomInfo`. Mapping `src/models/rooms/schema.js` và form `src/public/js/modules/rooms/fields.js` đã sử dụng `note` trực tiếp.

## 3. Những thành phần liên quan cần đồng bộ khi vẽ lại UML

| Nhóm | Giữ / chỉnh | Lý do |
|---|---|---|
| Loại phòng ↔ Giá cơ bản | **Bỏ đường nối và bỏ lớp Giá cơ bản** | Giá cơ bản là đặc trưng của loại phòng |
| Phòng ↔ Thông tin phòng | **Bỏ đường nối và bỏ lớp Thông tin phòng** | Ghi chú, ảnh thuộc về Phòng |
| Loại phòng ↔ Phòng | **Giữ** | `Room.RoomTypeId NOT NULL` |
| Đợt giá lễ ↔ Loại phòng | **Giữ** | `HolidayRate.RoomTypeId NOT NULL` |
| Loại phòng ↔ Cấu hình dịch vụ ↔ Dịch vụ | **Giữ** | `RoomTypeService(RoomTypeId, ServiceId, IsIncluded)` |
| Đặt phòng ↔ Phòng | **Giữ** | `Booking.RoomId NOT NULL`, giữ phòng cụ thể |
| Phiếu thuê ↔ Phòng | **Giữ** | `Stay.RoomId NOT NULL`, phòng thực tế có thể đổi |
| Lịch sử đổi phòng | **Không tự xóa** | `StayRoomHistory` ghi nhận lần đổi phòng |

## 4. Bội số quan trọng cần thể hiện

- `Loại phòng 1 — 0..* Phòng`: tại phía Loại phòng là `1`, phía Phòng là `0..*`.
- `Loại phòng 1 — 0..* Đợt giá lễ`: tại phía Loại phòng là `1`, phía Đợt giá lễ là `0..*`.
- `Phòng 1 — 0..* Đặt phòng`: tại phía Phòng là `1`, phía Đặt phòng là `0..*` (đặt các khoảng thời gian khác nhau).
- `Phòng 1 — 0..* Phiếu thuê`: tại phía Phòng là `1`, phía Phiếu thuê là `0..*` (theo lịch sử; không diễn giải là đồng thời).

## 5. Tương thích ứng dụng và dữ liệu

**Không cần migration SQL cho đúng hai thay đổi này.** Không xóa hoặc đổi tên bảng, cột, khóa ngoại, view, trigger hay procedure. Không thay đổi công thức tính giá, giá lễ, giữ chỗ, lịch sử đổi phòng, hóa đơn, thanh toán.

Đây là thay đổi mô hình/tài liệu: nguồn SQL và JavaScript hiện đã gộp hai khái niệm như yêu cầu. Nếu muốn bổ sung trường mô tả riêng ngoài `Note` hoặc tách thông số riêng cho từng phòng, đó sẽ là một yêu cầu mở rộng cần schema migration riêng, không nằm trong phạm vi sửa này.
