package vn.hotel.domain;

/** Báo thiệt hại và đường dẫn ảnh do buồng phòng cung cấp. */
public record DamageReport(String id, String roomId, String description, String photoPath,
    java.time.LocalDateTime time) implements java.io.Serializable {}
