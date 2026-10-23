package vn.hotel.service;

/** Quy tắc dùng chung: khoảng thời gian nửa mở, giá chốt, mã và nhật ký. */
import java.time.*;
import vn.hotel.domain.*;
import vn.hotel.exception.BusinessException;
import vn.hotel.repository.HotelData;
public final class Rules {
    private Rules() {}
    public static void require(boolean ok, String message) {
        if (!ok)
            throw new BusinessException(message);
    }
    public static String text(String s, String field) {
        require(s != null && !s.isBlank(), "Vui lòng nhập " + field);
        return s.trim();
    }
    public static String id(String prefix) {
        return prefix + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
    public static void audit(HotelData d, String actor, String action, String object, String detail) {
        String id = id("NK");
        d.audit.put(id, new AuditEvent(id, LocalDateTime.now(), actor, action, object, detail));
    }
    public static boolean overlap(LocalDateTime a, LocalDateTime b, LocalDateTime c, LocalDateTime e) {
        return a.isBefore(e) && c.isBefore(b);
    }
    public static boolean available(
        HotelData d, String roomId, LocalDateTime start, LocalDateTime end, String excludedBooking) {
        Room r = d.rooms.get(roomId);
        if (r == null || r.status() == RoomStatus.DISABLED || r.status() == RoomStatus.MAINTENANCE)
            return false;
        return d.bookings.values().stream().noneMatch(b
            -> !b.id().equals(excludedBooking) && b.roomId().equals(roomId)
                && (b.status() == BookingStatus.PENDING || b.status() == BookingStatus.CONFIRMED
                    || b.status() == BookingStatus.CHECKED_IN)
                && overlap(start, end, b.start(), b.end()));
    }
    public static long price(HotelData d, String roomId, LocalDateTime start, LocalDateTime end) {
        require(start != null && end != null && end.isAfter(start), "Ngày trả phải sau ngày nhận");
        Room r = d.rooms.get(roomId);
        require(r != null, "Không có phòng");
        long total = 0;
        var day = start.toLocalDate();
        long nights = Math.max(1, java.time.temporal.ChronoUnit.DAYS.between(day, end.toLocalDate()));
        for (long i = 0; i < nights; i++) {
            var date = day.plusDays(i);
            int percent = d.holidays.values()
                              .stream()
                              .filter(h -> !date.isBefore(h.start()) && !date.isAfter(h.end()))
                              .mapToInt(HolidayRate::percent)
                              .findFirst()
                              .orElse(0);
            total += Math.round(d.types.get(r.typeId()).dailyPrice() * (100.0 + percent) / 100);
        }
        return total;
    }
}
