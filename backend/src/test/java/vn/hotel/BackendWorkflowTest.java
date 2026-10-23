package vn.hotel;

import java.nio.file.*;
import java.time.*;
import vn.hotel.api.HotelBackend;
import vn.hotel.domain.*;
import vn.hotel.dto.*;
import vn.hotel.exception.BusinessException;

/** Kiểm thử tích hợp không cần JUnit: quyền, đặt trùng, checkout, lưu và khôi phục. */
public final class BackendWorkflowTest {
    private static int checks;
    private static void check(boolean condition, String name) {
        checks++;
        if (!condition)
            throw new AssertionError(name);
    }
    private static void rejects(Runnable r, String name) {
        try {
            r.run();
            throw new AssertionError("Phải từ chối: " + name);
        } catch (BusinessException e) {
            checks++;
        }
    }
    public static void main(String[] args) throws Exception {
        Path dir = Files.createTempDirectory("hotel-test-");
        Path data = dir.resolve("hotel.bin");
        HotelBackend b = new HotelBackend(data);
        Session admin = b.auth.login("admin", "Demo@123"), reception = b.auth.login("reception", "Demo@123"),
                customer = b.auth.login("customer", "Demo@123"),
                house = b.auth.login("housekeeping", "Demo@123");
        rejects(() -> b.auth.login("admin", "sai"), "Sai mật khẩu");
        rejects(() -> b.admin.audit(customer), "Khách không xem nhật ký");
        rejects(
            ()
                -> b.catalog.room(house, new Room("BAD", "Bad", "STD", RoomStatus.AVAILABLE, "", "", null)),
            "Buồng phòng không sửa danh mục");
        String stay = b.bookings.checkIn(reception, "DPDEMO01", "079200000002");
        rejects(() -> b.bookings.checkIn(reception, "DPDEMO01", "x"), "Không nhận phòng hai lần");
        b.bookings.changeRoom(reception, stay, "P109");
        check(b.catalog.rooms(admin).stream().anyMatch(
                  r -> r.id().equals("P101") && r.status() == RoomStatus.DIRTY),
            "Phòng cũ cần dọn");
        Bill preview = b.billing.preview(reception, stay);
        check(preview.due() > 0, "Bảng kê trừ cọc");
        rejects(()
                    -> b.billing.checkout(reception, stay, "Tiền mặt", preview.due() + 1),
            "Phải đối chiếu bảng kê");
        String invoice = b.billing.checkout(reception, stay, "Tiền mặt", preview.due());
        check(b.billing.invoices(reception).stream().anyMatch(i -> i.id().equals(invoice)),
            "Có hóa đơn chính thức");
        rejects(
            () -> b.billing.checkout(reception, stay, "Tiền mặt", preview.due()), "Không thu tiền hai lần");
        check(b.catalog.rooms(admin).stream().anyMatch(
                  r -> r.id().equals("P109") && r.status() == RoomStatus.DIRTY),
            "Checkout chuyển cần dọn");
        b.housekeeping.clean(house, "P109");
        check(b.catalog.rooms(admin).stream().anyMatch(
                  r -> r.id().equals("P109") && r.status() == RoomStatus.AVAILABLE),
            "Dọn xong phòng trống");
        LocalDateTime start = LocalDate.now().plusDays(3).atTime(14, 0), end = start.plusDays(2);
        String booking = b.bookings.create(customer, "KH01", "P102", start, end, 0);
        check(b.bookings.list(customer).size() == 1, "Khách chỉ thấy phiếu của mình");
        rejects(()
                    -> b.bookings.create(customer, "KH02", "P103", start, end, 0),
            "Không đặt cho hồ sơ người khác");
        rejects(() -> b.bookings.create(reception, "KH02", "P102", start, end, 100000), "Chặn đặt trùng");
        b.bookings.deposit(reception, booking, 200000);
        rejects(() -> b.bookings.deposit(reception, booking, 200000), "Không ghi cọc hai lần");
        rejects(() -> b.bookings.cancel(customer, booking), "Chặn hủy đã cọc khi chưa chốt hoàn tiền");
        b.catalog.holiday(admin, new HolidayRate("LE1", "Lễ", start.toLocalDate(), end.toLocalDate(), 20));
        rejects(()
                    -> b.catalog.holiday(admin,
                        new HolidayRate("LE2", "Trùng lễ", start.toLocalDate(), end.toLocalDate(), 30)),
            "Chặn giá lễ chồng lấn");
        check(b.bookings.quote(admin, "P103", start, end) == 1320000, "Tính giá lễ đúng số đêm");
        b.auth.register("Khách thử", "test@example.com", "0909876543", "testuser", "Test@123");
        check(b.auth.login("testuser", "Test@123").role() == Role.CUSTOMER, "Đăng ký chỉ tạo khách hàng");
        Path backup = dir.resolve("backup.bin");
        b.admin.backup(admin, backup);
        b.customers.save(
            reception, new Customer("KH_NEW", "Khách thêm", "0907777777", "NEW123", "", "", true));
        b.admin.restore(admin, backup);
        Session r2 = b.auth.login("reception", "Demo@123");
        rejects(() -> b.bookings.list(reception), "Khôi phục thu hồi phiên");
        check(
            b.customers.list(r2).stream().noneMatch(c -> c.id().equals("KH_NEW")), "Khôi phục đúng snapshot");
        HotelBackend reopened = new HotelBackend(data);
        Session login = reopened.auth.login("admin", "Demo@123");
        check(reopened.billing.invoices(login).size() == 1, "Mở lại giữ hóa đơn");
        check(Files.list(dir).anyMatch(p -> p.getFileName().toString().startsWith("before-restore-")),
            "Có sao lưu trước khôi phục");
        rejects(()
                    -> reopened.auth.register(
                        "Trùng user", "unique@example.com", "0909999999", " admin ", "Test@123"),
            "Chuẩn hóa username trước kiểm tra trùng");
        rejects(()
                    -> reopened.catalog.createRoom(
                        login, new Room("P102", "Ghi đè", "STD", RoomStatus.AVAILABLE, "", "", null)),
            "Thêm trùng mã phòng");
        rejects(()
                    -> reopened.catalog.createType(login, new RoomType("STD", "Ghi đè", 2, 1, 1, 1, 1, "")),
            "Thêm trùng mã loại");
        rejects(()
                    -> reopened.catalog.createService(login, new HotelService("DV01", "Ghi đè", "", 1, true)),
            "Thêm trùng mã dịch vụ");
        Room reserved = reopened.catalog.rooms(login)
                            .stream()
                            .filter(r -> r.id().equals("P102"))
                            .findFirst()
                            .orElseThrow();
        rejects(()
                    -> reopened.catalog.room(login,
                        new Room(reserved.id(), reserved.name(), "STE", reserved.status(), "", "", null)),
            "Chặn đổi loại phòng còn phiếu");
        Session rec3 = reopened.auth.login("reception", "Demo@123"),
                cust3 = reopened.auth.login("customer", "Demo@123");
        String active = reopened.bookings.create(
            cust3, "KH01", "P103", LocalDateTime.now().minusMinutes(1), LocalDateTime.now().plusDays(1), 0);
        reopened.bookings.deposit(rec3, active, 100000);
        String activeStay = reopened.bookings.checkIn(rec3, active, "079200000001");
        long points = reopened.customers.myCard(cust3).points();
        Bill activeBill = reopened.billing.preview(rec3, activeStay);
        reopened.billing.checkout(rec3, activeStay, "Tiền mặt", activeBill.due());
        check(reopened.customers.myCard(cust3).points() == points + activeBill.room() / 10000,
            "Tích điểm đúng một lần sau checkout");
        var challenge = reopened.auth.requestTransfer(login, "TK02");
        rejects(()
                    -> reopened.auth.completeTransfer(login, challenge.requestId(), "WRONG"),
            "OTP sai bị từ chối");
        reopened.auth.completeTransfer(login, challenge.requestId(), challenge.demoCode());
        rejects(() -> reopened.catalog.rooms(login), "Chuyển Admin thu hồi phiên cũ");
        check(reopened.auth.login("admin", "Demo@123").role() == Role.MANAGER, "Admin cũ thành quản lý");
        check(reopened.auth.login("manager", "Demo@123").role() == Role.ADMIN, "Người nhận thành Admin");
        Path expiredFile = dir.resolve("expired.bin");
        var expiredRepo = new vn.hotel.repository.FileHotelRepository(expiredFile);
        vn.hotel.bootstrap.DemoData.seed(expiredRepo);
        expiredRepo.write(d -> {
            d.bookings.put("EXPIRED",
                new Booking("EXPIRED", "KH01", "P102", start, end, BookingStatus.PENDING, 100000, 0,
                    LocalDateTime.now().minusMinutes(1), "Trực tuyến"));
            return null;
        });
        HotelBackend expiry = new HotelBackend(expiredFile);
        var exSession = expiry.auth.login("reception", "Demo@123");
        check(expiry.bookings.list(exSession).stream().anyMatch(
                  x -> x.id().equals("EXPIRED") && x.status() == BookingStatus.CANCELLED),
            "Tự hủy phiếu quá hạn chưa cọc");
        System.out.println("PASS " + checks + " kiểm tra nghiệp vụ · " + dir);
    }
}
