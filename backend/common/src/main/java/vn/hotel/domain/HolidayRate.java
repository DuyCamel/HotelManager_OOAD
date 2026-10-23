package vn.hotel.domain;

/** Đợt tăng giá theo ngày, bao gồm ngày đầu và cuối. */
public record HolidayRate(String id, String name, java.time.LocalDate start, java.time.LocalDate end,
    int percent) implements java.io.Serializable {}
