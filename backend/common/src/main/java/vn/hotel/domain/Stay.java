package vn.hotel.domain;

/** Phiếu thuê một phòng, thông tin giấy tờ và phụ thu đổi phòng. */
public record Stay(String id, String bookingId, String roomId, String identity,
    java.time.LocalDateTime checkIn, java.time.LocalDateTime checkOut, long roomCharge, long surcharge)
    implements java.io.Serializable {}
