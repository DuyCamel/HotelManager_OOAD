package vn.hotel.domain;

/** Phòng vật lý, ảnh tham chiếu và hạn dọn 90 phút. */
public record Room(String id, String name, String typeId, RoomStatus status, String imagePath, String note,
    java.time.LocalDateTime cleaningDeadline) implements java.io.Serializable {}
