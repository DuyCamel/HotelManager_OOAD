package vn.hotel.domain;

/** Hồ sơ khách; có thể không liên kết tài khoản. */
public record Customer(String id, String name, String phone, String identity, String address,
    String accountId, boolean active) implements java.io.Serializable {}
