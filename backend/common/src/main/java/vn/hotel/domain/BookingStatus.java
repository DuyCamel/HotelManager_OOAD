package vn.hotel.domain;

/** Vòng đời phiếu đặt; xác nhận cọc khác tất toán. */
public enum BookingStatus {
    PENDING("Chờ xác nhận"),
    CONFIRMED("Đã xác nhận"),
    CHECKED_IN("Đang lưu trú"),
    COMPLETED("Hoàn tất"),
    CANCELLED("Đã hủy");
    private final String label;
    BookingStatus(String label) {
        this.label = label;
    }
    public String toString() {
        return label;
    }
}
