package vn.hotel.service;

/** Cấu hình, nhật ký, sao lưu và khôi phục có bản sao an toàn trước thay thế. */
import java.nio.file.*;
import java.util.*;
import vn.hotel.domain.*;
import vn.hotel.dto.Session;
import vn.hotel.repository.*;
import vn.hotel.security.AuthService;
public final class AdminService {
    private final HotelRepository repo;
    private final AuthService auth;
    public AdminService(HotelRepository r, AuthService a) {
        repo = r;
        auth = a;
    }
    public List<AuditEvent> audit(Session s) {
        auth.check(s, Role.MANAGER);
        return repo.read(d
            -> d.audit.values().stream().sorted(Comparator.comparing(AuditEvent::time).reversed()).toList());
    }
    public Map<String, String> settings(Session s) {
        auth.check(s, Role.MANAGER);
        return repo.read(d -> Map.copyOf(d.settings));
    }
    public void settings(Session s, Map<String, String> values) {
        auth.check(s, Role.MANAGER);
        Rules.text(values.get("hotelName"), "tên khách sạn");
        Rules.require(values.getOrDefault("hotline", "").matches("[0-9+]{9,15}"), "Hotline không hợp lệ");
        try {
            java.time.LocalTime.parse(values.get("checkIn"));
            java.time.LocalTime.parse(values.get("checkOut"));
        } catch (Exception e) {
            throw new vn.hotel.exception.BusinessException("Giờ cần dạng HH:mm");
        }
        try {
            var from = java.time.LocalTime.parse(values.getOrDefault("lateFrom", "13:00"));
            var checkout = java.time.LocalTime.parse(values.get("checkOut"));
            Rules.require(!from.isBefore(checkout), "Mốc phụ thu phải sau giờ trả phòng");
            long percent = Long.parseLong(values.getOrDefault("latePercent", "30"));
            Rules.require(percent >= 0 && percent <= 1000, "Phụ thu phải từ 0 đến 1000%");
        } catch (java.time.format.DateTimeParseException | NumberFormatException e) {
            throw new vn.hotel.exception.BusinessException("Mốc hoặc mức phụ thu không hợp lệ");
        }
        String logo = values.getOrDefault("logoPath", "");
        Rules.require(logo.isBlank()
                || (java.nio.file.Files.isRegularFile(java.nio.file.Path.of(logo))
                    && logo.toLowerCase().matches(".*\\.(png|jpg|jpeg)")),
            "Logo phải là ảnh PNG/JPG tồn tại");
        repo.write(d -> {
            d.settings.putAll(values);
            Rules.audit(d, s.accountId(), "Cập nhật cấu hình", "HOTEL", "");
            return null;
        });
    }
    public void backup(Session s, Path path) {
        auth.check(s, Role.ADMIN);
        repo.backup(path);
        repo.write(d -> {
            Rules.audit(d, s.accountId(), "Sao lưu", path.getFileName().toString(), "");
            return null;
        });
    }
    public void restore(Session s, Path path) {
        auth.check(s, Role.ADMIN);
        repo.restore(path);
        auth.revokeAll();
    }
}
