package vn.hotel.repository;

/** Trạng thái lưu trữ phiên bản demo; chỉ repository/service được truy cập. */
public final class HotelData implements java.io.Serializable {
    private static final long serialVersionUID = 1L;
    public final java.util.Map<String, vn.hotel.domain.Room> rooms = new java.util.LinkedHashMap<>();
    public final java.util.Map<String, vn.hotel.domain.RoomType> types = new java.util.LinkedHashMap<>();
    public final java.util.Map<String, vn.hotel.domain.HotelService> services =
        new java.util.LinkedHashMap<>();
    public final java.util.Map<String, vn.hotel.domain.HolidayRate> holidays =
        new java.util.LinkedHashMap<>();
    public final java.util.Map<String, vn.hotel.domain.Customer> customers = new java.util.LinkedHashMap<>();
    public final java.util.Map<String, vn.hotel.domain.Account> accounts = new java.util.LinkedHashMap<>();
    public final java.util.Map<String, vn.hotel.domain.Membership> memberships =
        new java.util.LinkedHashMap<>();
    public final java.util.Map<String, vn.hotel.domain.Booking> bookings = new java.util.LinkedHashMap<>();
    public final java.util.Map<String, vn.hotel.domain.Stay> stays = new java.util.LinkedHashMap<>();
    public final java.util.Map<String, vn.hotel.domain.Invoice> invoices = new java.util.LinkedHashMap<>();
    public final java.util.Map<String, vn.hotel.domain.Payment> payments = new java.util.LinkedHashMap<>();
    public final java.util.Map<String, vn.hotel.domain.AuditEvent> audit = new java.util.LinkedHashMap<>();
    public final java.util.Map<String, vn.hotel.domain.DamageReport> damages =
        new java.util.LinkedHashMap<>();
    public final java.util.Map<String, String> settings = new java.util.LinkedHashMap<>();
}
