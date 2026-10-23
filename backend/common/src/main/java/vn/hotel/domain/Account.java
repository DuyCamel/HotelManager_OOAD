package vn.hotel.domain;

/** Thông tin xác thực nội bộ backend, không truyền sang giao diện. */
public record Account(String id, String username, String passwordHash, String name, String email,
    String phone, Role role, boolean active) implements java.io.Serializable {}
