package vn.hotel.dto;

/** Yêu cầu OTP của bản demo; demoCode chỉ phục vụ mô phỏng, phải bỏ khi nối SMS thật. */
public record TransferChallenge(String requestId, String maskedPhone, String demoCode) {}
