package vn.hotel.domain;

/** Giao dịch cọc hoặc tất toán; không tạo lại khi in hóa đơn. */
public record Payment(String id, String referenceId, String kind, long amount, String method,
    java.time.LocalDateTime time) implements java.io.Serializable {}
