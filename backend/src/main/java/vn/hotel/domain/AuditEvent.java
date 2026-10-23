package vn.hotel.domain;

/** Nhật ký nghiệp vụ; không lưu mật khẩu hoặc OTP. */
public record AuditEvent(String id, java.time.LocalDateTime time, String actor, String action,
    String objectId, String detail) implements java.io.Serializable {}
