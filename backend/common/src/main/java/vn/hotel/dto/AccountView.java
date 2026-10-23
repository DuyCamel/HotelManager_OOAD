package vn.hotel.dto;

/** Dữ liệu tài khoản dành cho UI, không có mật khẩu băm. */
public record AccountView(String id, String username, String name, String email, String phone,
    vn.hotel.domain.Role role, boolean active) {}
