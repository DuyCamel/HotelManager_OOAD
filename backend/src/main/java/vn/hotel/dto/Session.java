package vn.hotel.dto;

/** Phiên đăng nhập chỉ chứa dữ liệu an toàn cho frontend. */
public record Session(String token, String accountId, String name, vn.hotel.domain.Role role) {}
