package vn.hotel.service;

/** Dọn phòng và thiệt hại, kiểm tra ảnh trước chuyển bảo trì. */
import java.nio.file.*;
import java.time.*;
import java.util.*;
import vn.hotel.domain.*;
import vn.hotel.dto.Session;
import vn.hotel.repository.*;
import vn.hotel.security.AuthService;
public final class HousekeepingService {
    private final HotelRepository repo;
    private final AuthService auth;
    public HousekeepingService(HotelRepository r, AuthService a) {
        repo = r;
        auth = a;
    }
    public void clean(Session s, String room) {
        auth.check(s, Role.HOUSEKEEPER, Role.MANAGER);
        repo.write(d -> {
            Room r = d.rooms.get(room);
            Rules.require(
                r != null && (r.status() == RoomStatus.DIRTY || r.status() == RoomStatus.MAINTENANCE),
                "Phòng không cần dọn/bảo trì");
            d.rooms.put(room,
                new Room(r.id(), r.name(), r.typeId(), RoomStatus.AVAILABLE, r.imagePath(), r.note(), null));
            Rules.audit(d, s.accountId(), "Hoàn tất dọn/bảo trì", room, "");
            return null;
        });
    }
    public void damage(Session s, String room, String detail, String photo) {
        auth.check(s, Role.HOUSEKEEPER, Role.MANAGER);
        Rules.text(detail, "mô tả thiệt hại");
        Rules.require(photo != null && Files.isRegularFile(Path.of(photo))
                && photo.toLowerCase().matches(".*\\.(png|jpg|jpeg)"),
            "Chọn ảnh PNG/JPG tồn tại");
        repo.write(d -> {
            Room r = d.rooms.get(room);
            Rules.require(r != null && r.status() != RoomStatus.OCCUPIED && r.status() != RoomStatus.DISABLED,
                "Không thể chuyển phòng đang ở/ngừng hoạt động");
            String id = Rules.id("HH");
            d.damages.put(id, new DamageReport(id, room, detail, photo, LocalDateTime.now()));
            d.rooms.put(room,
                new Room(r.id(), r.name(), r.typeId(), RoomStatus.MAINTENANCE, r.imagePath(), detail, null));
            Rules.audit(d, s.accountId(), "Báo hư hại", id, room);
            return null;
        });
    }
    public List<DamageReport> damages(Session s) {
        auth.check(s, Role.HOUSEKEEPER, Role.MANAGER);
        return repo.read(d -> List.copyOf(d.damages.values()));
    }
}
