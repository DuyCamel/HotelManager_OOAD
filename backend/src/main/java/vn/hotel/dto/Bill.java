package vn.hotel.dto;

/** Bảng kê tạm tính phải được hiển thị trước xác nhận thu tiền. */
public record Bill(
    String stayId, long room, long services, long surcharge, long discount, long deposit, long due) {}
