package vn.hotel.domain;

/** Loại phòng và giá cơ bản; tiền tính bằng đồng nguyên. */
public record RoomType(String id, String name, int capacity, int beds, long hourlyPrice, long nightlyPrice,
    long dailyPrice, String amenities) implements java.io.Serializable {}
