package vn.hotel.service;

/** Đặt trực tuyến/tại quầy, xác nhận cọc, nhả quá hạn, nhận và đổi phòng. */
import java.time.*;
import java.util.*;
import vn.hotel.domain.*;
import vn.hotel.dto.Session;
import vn.hotel.repository.*;
import vn.hotel.security.AuthService;
public final class BookingService {
    private final HotelRepository repo;
    private final AuthService auth;
    public BookingService(HotelRepository r, AuthService a) {
        repo = r;
        auth = a;
    }
    public void expire() {
        repo.write(d -> {
            for (Booking b : List.copyOf(d.bookings.values()))
                if (b.status() == BookingStatus.PENDING && b.deposit() == 0
                    && LocalDateTime.now().isAfter(b.holdUntil())) {
                    d.bookings.put(b.id(), copy(b, BookingStatus.CANCELLED, b.deposit()));
                    Rules.audit(d, "SYSTEM", "Hết hạn chưa cọc", b.id(), "");
                }
            return null;
        });
    }
    private static Booking copy(Booking b, BookingStatus st, long deposit) {
        return new Booking(b.id(), b.customerId(), b.roomId(), b.start(), b.end(), st, b.roomCharge(),
            deposit, b.holdUntil(), b.channel());
    }
    public List<Room> available(Session s, LocalDateTime start, LocalDateTime end, int people) {
        auth.check(s);
        Rules.require(start != null && end != null && end.isAfter(start) && people > 0,
            "Thời gian hoặc số người không hợp lệ");
        expire();
        return repo.read(d
            -> d.rooms.values()
                   .stream()
                   .filter(r
                       -> d.types.get(r.typeId()).capacity() >= people
                           && Rules.available(d, r.id(), start, end, ""))
                   .toList());
    }
    public long quote(Session s, String room, LocalDateTime start, LocalDateTime end) {
        auth.check(s);
        return repo.read(d -> Rules.price(d, room, start, end));
    }
    public List<Booking> list(Session s) {
        auth.check(s, Role.MANAGER, Role.RECEPTIONIST, Role.CUSTOMER);
        expire();
        return repo.read(d
            -> d.bookings.values()
                   .stream()
                   .filter(b
                       -> s.role() != Role.CUSTOMER
                           || d.customers.get(b.customerId()).accountId().equals(s.accountId()))
                   .toList());
    }
    public String create(
        Session s, String customer, String room, LocalDateTime start, LocalDateTime end, long deposit) {
        auth.check(s, Role.MANAGER, Role.RECEPTIONIST, Role.CUSTOMER);
        Rules.require(start != null && end != null && end.isAfter(start), "Ngày trả phải sau ngày nhận");
        Rules.require(start.isAfter(LocalDateTime.now().minusMinutes(5)), "Ngày nhận không được ở quá khứ");
        expire();
        return repo.write(d -> {
            Customer c = d.customers.get(customer);
            Rules.require(c != null && c.active(), "Hồ sơ khách không hợp lệ");
            boolean online = s.role() == Role.CUSTOMER;
            Rules.require(
                !online || c.accountId().equals(s.accountId()), "Không được đặt cho tài khoản khác");
            Rules.require(Rules.available(d, room, start, end, ""), "Phòng vừa được đặt hoặc không khả dụng");
            long charge = Rules.price(d, room, start, end);
            Rules.require(deposit >= 0 && deposit <= charge, "Tiền cọc ngoài phạm vi");
            Rules.require(!online || deposit == 0, "Khách phải chờ xác nhận giao dịch cọc");
            Rules.require(online || deposit > 0, "Đặt tại quầy cần ghi tiền cọc");
            String id = Rules.id("DP");
            d.bookings.put(id,
                new Booking(id, customer, room, start, end,
                    online ? BookingStatus.PENDING : BookingStatus.CONFIRMED, charge, deposit,
                    LocalDateTime.now().plusMinutes(30), online ? "Trực tuyến" : "Tại quầy"));
            if (deposit > 0) {
                String p = Rules.id("GD");
                d.payments.put(p, new Payment(p, id, "Cọc", deposit, "Tại quầy", LocalDateTime.now()));
            }
            Rules.audit(d, s.accountId(), "Đặt phòng", id, room);
            return id;
        });
    }
    public void deposit(Session s, String id, long amount) {
        auth.check(s, Role.MANAGER, Role.RECEPTIONIST);
        expire();
        repo.write(d -> {
            Booking b = d.bookings.get(id);
            Rules.require(b != null && b.status() == BookingStatus.PENDING, "Phiếu không còn chờ cọc");
            Rules.require(amount > 0 && amount <= b.roomCharge(), "Tiền cọc không hợp lệ");
            d.bookings.put(id, copy(b, BookingStatus.CONFIRMED, amount));
            String p = Rules.id("GD");
            d.payments.put(p, new Payment(p, id, "Cọc", amount, "Thủ công", LocalDateTime.now()));
            Rules.audit(d, s.accountId(), "Xác nhận cọc thủ công", id, String.valueOf(amount));
            return null;
        });
    }
    public void cancel(Session s, String id) {
        auth.check(s, Role.MANAGER, Role.RECEPTIONIST, Role.CUSTOMER);
        repo.write(d -> {
            Booking b = d.bookings.get(id);
            Rules.require(b != null, "Không tìm thấy phiếu");
            Rules.require(s.role() != Role.CUSTOMER
                    || d.customers.get(b.customerId()).accountId().equals(s.accountId()),
                "Không có quyền với phiếu này");
            Rules.require(b.status() == BookingStatus.PENDING || b.status() == BookingStatus.CONFIRMED,
                "Không thể hủy phiếu này");
            Rules.require(b.deposit() == 0, "Phiếu đã cọc: cần chốt quy tắc hoàn cọc trước khi hủy");
            d.bookings.put(id, copy(b, BookingStatus.CANCELLED, 0));
            Rules.audit(d, s.accountId(), "Hủy đặt phòng", id, "");
            return null;
        });
    }
    public String checkIn(Session s, String id, String identity) {
        auth.check(s, Role.RECEPTIONIST, Role.MANAGER);
        Rules.text(identity, "giấy tờ khách lưu trú");
        return repo.write(d -> {
            Booking b = d.bookings.get(id);
            Rules.require(
                b != null && b.status() == BookingStatus.CONFIRMED, "Chỉ nhận phòng cho phiếu đã xác nhận");
            Rules.require(!LocalDateTime.now().isBefore(b.start()) && !LocalDateTime.now().isAfter(b.end()),
                "Chưa tới giờ nhận hoặc đã quá thời gian đặt");
            Room r = d.rooms.get(b.roomId());
            Rules.require(r.status() == RoomStatus.AVAILABLE, "Phòng chưa sạch/sẵn sàng");
            String st = Rules.id("PT");
            d.stays.put(st, new Stay(st, id, r.id(), identity, LocalDateTime.now(), null, b.roomCharge(), 0));
            d.bookings.put(id, copy(b, BookingStatus.CHECKED_IN, b.deposit()));
            d.rooms.put(r.id(),
                new Room(r.id(), r.name(), r.typeId(), RoomStatus.OCCUPIED, r.imagePath(), r.note(), null));
            Rules.audit(d, s.accountId(), "Check-in", st, id);
            return st;
        });
    }
    public List<Stay> stays(Session s) {
        auth.check(s, Role.MANAGER, Role.RECEPTIONIST);
        return repo.read(d -> List.copyOf(d.stays.values()));
    }
    public void changeRoom(Session s, String stayId, String roomId) {
        auth.check(s, Role.MANAGER, Role.RECEPTIONIST);
        repo.write(d -> {
            Stay st = d.stays.get(stayId);
            Rules.require(st != null && st.checkOut() == null, "Phiếu thuê đã kết thúc");
            Booking b = d.bookings.get(st.bookingId());
            Rules.require(!st.roomId().equals(roomId), "Vui lòng chọn phòng khác");
            Room next = d.rooms.get(roomId);
            Rules.require(next != null && next.status() == RoomStatus.AVAILABLE
                    && Rules.available(d, roomId, LocalDateTime.now(), b.end(), b.id()),
                "Phòng mới không sẵn sàng");
            long remainingOld = Rules.price(d, st.roomId(), LocalDateTime.now(), b.end()),
                 remainingNew = Rules.price(d, roomId, LocalDateTime.now(), b.end());
            long extra = Math.max(0, remainingNew - remainingOld);
            Room old = d.rooms.get(st.roomId());
            d.rooms.put(old.id(),
                new Room(old.id(), old.name(), old.typeId(), RoomStatus.DIRTY, old.imagePath(), old.note(),
                    LocalDateTime.now().plusMinutes(90)));
            d.rooms.put(next.id(),
                new Room(next.id(), next.name(), next.typeId(), RoomStatus.OCCUPIED, next.imagePath(),
                    next.note(), null));
            d.stays.put(st.id(),
                new Stay(st.id(), st.bookingId(), roomId, st.identity(), st.checkIn(), null, st.roomCharge(),
                    st.surcharge() + extra));
            d.bookings.put(b.id(),
                new Booking(b.id(), b.customerId(), roomId, b.start(), b.end(), b.status(), b.roomCharge(),
                    b.deposit(), b.holdUntil(), b.channel()));
            Rules.audit(
                d, s.accountId(), "Đổi phòng", st.id(), old.id() + " -> " + roomId + "; phụ thu " + extra);
            return null;
        });
    }
}
