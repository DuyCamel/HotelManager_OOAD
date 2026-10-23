package vn.hotel.domain;

/** Hóa đơn bất biến sau khi đã thu tiền, dùng để in lại. */
public record Invoice(String id, String stayId, String customerId, java.time.LocalDateTime issuedAt,
    long roomCharge, long serviceCharge, long surcharge, long discount, long deposit, long paid,
    String method) implements java.io.Serializable {}
