package vn.hotel.exception;

/** Lỗi nghiệp vụ có thông báo tiếng Việt để giao diện hiển thị. */
public class BusinessException extends RuntimeException {
    public BusinessException(String message) {
        super(message);
    }
}
