package vn.hotel.domain;

/** Vai trò thực thi quyền; không phải lớp Quyền trong sơ đồ phân tích. */
public enum Role {
    ADMIN("Admin"),
    MANAGER("Quản lý"),
    RECEPTIONIST("Lễ tân"),
    HOUSEKEEPER("Buồng phòng"),
    CUSTOMER("Khách hàng");
    private final String label;
    Role(String label) {
        this.label = label;
    }
    public String toString() {
        return label;
    }
}
