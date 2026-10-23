package vn.hotel.service;

/** Bảng kê trước thu tiền, lập hóa đơn đúng một lần và tích điểm; dịch vụ phát sinh đang ngoài phạm vi. */
import java.time.*;
import java.util.*;
import vn.hotel.domain.*;
import vn.hotel.dto.*;
import vn.hotel.repository.*;
import vn.hotel.security.AuthService;
public final class BillingService {
    private final HotelRepository repo;
    private final AuthService auth;
    public BillingService(HotelRepository r, AuthService a) {
        repo = r;
        auth = a;
    }
    private Bill bill(HotelData d, String stayId) {
        Stay st = d.stays.get(stayId);
        Rules.require(st != null && st.checkOut() == null, "Phiếu thuê không còn đang lưu trú");
        Booking b = d.bookings.get(st.bookingId());
        return new Bill(st.id(), st.roomCharge(), 0, st.surcharge(), 0, b.deposit(),
            st.roomCharge() + st.surcharge() - b.deposit());
    }
    public Bill preview(Session s, String id) {
        auth.check(s, Role.MANAGER, Role.RECEPTIONIST);
        return repo.read(d -> bill(d, id));
    }
    public String checkout(Session s, String stayId, String method, long expectedDue) {
        auth.check(s, Role.MANAGER, Role.RECEPTIONIST);
        Rules.text(method, "phương thức");
        return repo.write(d -> {
            Bill bill = bill(d, stayId);
            Rules.require(bill.due() == expectedDue, "Bảng kê đã đổi, vui lòng đối chiếu lại");
            Stay st = d.stays.get(stayId);
            Booking b = d.bookings.get(st.bookingId());
            String id = Rules.id("HD");
            d.invoices.put(id,
                new Invoice(id, stayId, b.customerId(), LocalDateTime.now(), bill.room(), bill.services(),
                    bill.surcharge(), bill.discount(), bill.deposit(), bill.due(), method));
            String p = Rules.id("GD");
            d.payments.put(p, new Payment(p, id, "Tất toán", bill.due(), method, LocalDateTime.now()));
            d.stays.put(st.id(),
                new Stay(st.id(), st.bookingId(), st.roomId(), st.identity(), st.checkIn(),
                    LocalDateTime.now(), st.roomCharge(), st.surcharge()));
            d.bookings.put(b.id(),
                new Booking(b.id(), b.customerId(), b.roomId(), b.start(), b.end(), BookingStatus.COMPLETED,
                    b.roomCharge(), b.deposit(), b.holdUntil(), b.channel()));
            Room r = d.rooms.get(st.roomId());
            d.rooms.put(r.id(),
                new Room(r.id(), r.name(), r.typeId(), RoomStatus.DIRTY, r.imagePath(), r.note(),
                    LocalDateTime.now().plusMinutes(90)));
            for (Membership m : List.copyOf(d.memberships.values()))
                if (m.customerId().equals(b.customerId()) && m.active())
                    d.memberships.put(m.id(),
                        new Membership(m.id(), m.customerId(),
                            m.points()
                                + (bill.room() + bill.services() + bill.surcharge() - bill.discount())
                                    / 10000,
                            true));
            Rules.audit(d, s.accountId(), "Thanh toán và checkout", id, method);
            return id;
        });
    }
    public List<Invoice> invoices(Session s) {
        auth.check(s, Role.MANAGER, Role.RECEPTIONIST);
        return repo.read(d -> List.copyOf(d.invoices.values()));
    }
    public List<Payment> payments(Session s) {
        auth.check(s, Role.MANAGER, Role.RECEPTIONIST);
        return repo.read(d -> List.copyOf(d.payments.values()));
    }
}
