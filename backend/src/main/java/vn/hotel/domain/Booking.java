package vn.hotel.domain;

/** Phiếu đặt một phòng; lưu giá chốt để không đổi theo bảng giá mới. */
public record Booking(String id, String customerId, String roomId, java.time.LocalDateTime start,
    java.time.LocalDateTime end, BookingStatus status, long roomCharge, long deposit,
    java.time.LocalDateTime holdUntil, String channel) implements java.io.Serializable {}
