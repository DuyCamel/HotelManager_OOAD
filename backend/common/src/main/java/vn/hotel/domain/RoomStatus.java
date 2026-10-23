package vn.hotel.domain;

/** Trạng thái vệ sinh và sử dụng thực tế của phòng. */
public enum RoomStatus {
    AVAILABLE("Trống"),
    OCCUPIED("Đang ở"),
    DIRTY("Cần dọn"),
    MAINTENANCE("Bảo trì"),
    DISABLED("Ngừng hoạt động");
    private final String label;
    RoomStatus(String label) {
        this.label = label;
    }
    public String toString() {
        return label;
    }
}
