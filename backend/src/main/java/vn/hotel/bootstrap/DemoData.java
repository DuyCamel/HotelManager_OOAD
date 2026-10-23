package vn.hotel.bootstrap;

/** Dữ liệu giả chạy lần đầu và năm tài khoản demo, không tái ghi đè dữ liệu cũ. */
import java.time.*;
import vn.hotel.domain.*;
import vn.hotel.repository.*;
import vn.hotel.security.Passwords;
import vn.hotel.service.Rules;
public final class DemoData {
    private DemoData() {}
    public static void seed(HotelRepository r) {
        if (r.read(d -> !d.accounts.isEmpty()))
            return;
        r.write(d -> {
            String hash = Passwords.hash("Demo@123");
            String[] users = {"admin", "manager", "reception", "housekeeping", "customer"};
            Role[] roles = Role.values();
            for (int i = 0; i < users.length; i++) {
                String id = "TK0" + (i + 1);
                d.accounts.put(id,
                    new Account(id, users[i], hash, roles[i].toString(), users[i] + "@hotel.test",
                        "090000000" + i, roles[i], true));
            }
            d.customers.put("KH01",
                new Customer("KH01", "Nguyễn Minh Anh", "0901234567", "079200000001", "TP. Hồ Chí Minh",
                    "TK05", true));
            d.customers.put("KH02",
                new Customer("KH02", "Trần Quốc Bảo", "0912345678", "079200000002", "Đà Nẵng", "", true));
            d.types.put(
                "STD", new RoomType("STD", "Standard", 2, 1, 150000, 450000, 550000, "Wi-Fi, nước suối, TV"));
            d.types.put("DLX",
                new RoomType("DLX", "Deluxe", 3, 2, 200000, 650000, 800000, "Wi-Fi, minibar, ban công"));
            d.types.put("STE",
                new RoomType(
                    "STE", "Suite", 4, 2, 300000, 1000000, 1400000, "Bồn tắm, phòng khách, minibar"));
            for (int i = 1; i <= 18; i++) {
                String id = "P" + (100 + i);
                String type = i <= 8 ? "STD" : i <= 14 ? "DLX" : "STE";
                RoomStatus st = i == 4 ? RoomStatus.DIRTY
                    : i == 7           ? RoomStatus.MAINTENANCE
                                       : RoomStatus.AVAILABLE;
                d.rooms.put(id,
                    new Room(id, "Phòng " + (100 + i), type, st, "", "",
                        st == RoomStatus.DIRTY ? LocalDateTime.now().plusMinutes(60) : null));
            }
            d.services.put("DV01", new HotelService("DV01", "Giặt ủi", "Giá mỗi kg", 50000, true));
            d.services.put("DV02", new HotelService("DV02", "Đưa đón sân bay", "Một chiều", 350000, true));
            d.services.put(
                "DV03", new HotelService("DV03", "Nước suối minibar", "Danh mục tham khảo", 20000, true));
            d.memberships.put("TV01", new Membership("TV01", "KH01", 120, true));
            d.settings.put("hotelName", "Aurora Hotel");
            d.settings.put("address", "TP. Hồ Chí Minh");
            d.settings.put("hotline", "0281234567");
            d.settings.put("checkIn", "14:00");
            d.settings.put("checkOut", "12:00");
            d.settings.put("bank", "Chưa cấu hình");
            d.settings.put("bankAccount", "");
            d.settings.put("bankOwner", "");
            LocalDateTime start = LocalDateTime.now().minusHours(1),
                          end = LocalDate.now().plusDays(2).atTime(12, 0);
            d.bookings.put("DPDEMO01",
                new Booking("DPDEMO01", "KH02", "P101", start, end, BookingStatus.CONFIRMED, 1100000, 300000,
                    start.plusMinutes(30), "Tại quầy"));
            Rules.audit(d, "SYSTEM", "Khởi tạo demo", "HOTEL", "Dữ liệu giả phục vụ học tập");
            return null;
        });
    }
}
