package vn.hotel.domain;

/** Thẻ duy nhất cho mỗi khách; điểm chỉ cộng sau checkout. */
public record Membership(String id, String customerId, long points, boolean active)
    implements java.io.Serializable {}
