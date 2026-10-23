package vn.hotel.service;

/** Tổng hợp doanh thu theo ngày lập hóa đơn; không nhầm tiền cọc thành doanh thu. */
import java.time.*;
import java.util.*;
import vn.hotel.domain.*;
import vn.hotel.dto.Session;
import vn.hotel.repository.HotelRepository;
import vn.hotel.security.AuthService;
public final class ReportService {
    private final HotelRepository repo;
    private final AuthService auth;
    public ReportService(HotelRepository r, AuthService a) {
        repo = r;
        auth = a;
    }
    public List<Invoice> invoices(Session s, LocalDate from, LocalDate to) {
        auth.check(s, Role.MANAGER);
        Rules.require(!to.isBefore(from), "Khoảng ngày không hợp lệ");
        return repo.read(d
            -> d.invoices.values()
                   .stream()
                   .filter(i
                       -> !i.issuedAt().toLocalDate().isBefore(from)
                           && !i.issuedAt().toLocalDate().isAfter(to))
                   .toList());
    }
    public Map<String, Long> totals(Session s, LocalDate from, LocalDate to) {
        var list = invoices(s, from, to);
        long room = list.stream().mapToLong(Invoice::roomCharge).sum(),
             services = list.stream().mapToLong(Invoice::serviceCharge).sum(),
             extra = list.stream().mapToLong(Invoice::surcharge).sum();
        return Map.of("Tiền phòng", room, "Dịch vụ", services, "Phụ thu", extra, "Doanh thu hóa đơn",
            room + services + extra, "Số hóa đơn", (long) list.size());
    }
    public vn.hotel.dto.ReportMetrics metrics(Session s, LocalDate from, LocalDate to) {
        auth.check(s, Role.MANAGER);
        Rules.require(!to.isBefore(from), "Khoảng ngày không hợp lệ");
        return repo.read(d -> {
            LocalDateTime lower = from.atStartOfDay(), upper = to.plusDays(1).atStartOfDay();
            long total = d.bookings.values()
                             .stream()
                             .filter(b -> !b.start().isBefore(lower) && b.start().isBefore(upper))
                             .count(),
                 cancelled = d.bookings.values()
                                 .stream()
                                 .filter(b
                                     -> !b.start().isBefore(lower) && b.start().isBefore(upper)
                                         && b.status() == BookingStatus.CANCELLED)
                                 .count();
            long minutes = 0;
            for (Stay st : d.stays.values()) {
                LocalDateTime end = st.checkOut() == null ? LocalDateTime.now() : st.checkOut();
                LocalDateTime a = st.checkIn().isAfter(lower) ? st.checkIn() : lower,
                              b = end.isBefore(upper) ? end : upper;
                if (b.isAfter(a))
                    minutes += java.time.Duration.between(a, b).toMinutes();
            }
            long rooms = d.rooms.values().stream().filter(r -> r.status() != RoomStatus.DISABLED).count();
            long possible = java.time.Duration.between(lower, upper).toMinutes() * rooms;
            Map<LocalDate, Long> daily = new TreeMap<>();
            for (Invoice i : d.invoices.values()) {
                LocalDate date = i.issuedAt().toLocalDate();
                if (!date.isBefore(from) && !date.isAfter(to))
                    daily.merge(
                        date, i.roomCharge() + i.serviceCharge() + i.surcharge() - i.discount(), Long::sum);
            }
            return new vn.hotel.dto.ReportMetrics(possible == 0 ? 0 : 100.0 * minutes / possible,
                total == 0 ? 0 : 100.0 * cancelled / total, total, cancelled, Map.copyOf(daily));
        });
    }
}