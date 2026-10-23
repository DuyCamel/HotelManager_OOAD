package vn.hotel.service;

/** Danh mục phòng, loại phòng, giá cơ bản, dịch vụ và giá lễ. */
import java.util.*;
import vn.hotel.domain.*;
import vn.hotel.dto.Session;
import vn.hotel.repository.*;
import vn.hotel.security.AuthService;
public final class CatalogService {
    private final HotelRepository repo;
    private final AuthService auth;
    public CatalogService(HotelRepository r, AuthService a) {
        repo = r;
        auth = a;
    }
    public Map<String, String> publicSettings(Session s) {
        auth.check(s);
        return repo.read(d
            -> Map.of("hotelName", d.settings.get("hotelName"), "checkIn", d.settings.get("checkIn"),
                "checkOut", d.settings.get("checkOut")));
    }
    public List<Room> rooms(Session s) {
        auth.check(s);
        return repo.read(d -> List.copyOf(d.rooms.values()));
    }
    public List<RoomType> types(Session s) {
        auth.check(s);
        return repo.read(d -> List.copyOf(d.types.values()));
    }
    public List<HotelService> services(Session s) {
        auth.check(s);
        return repo.read(d -> List.copyOf(d.services.values()));
    }
    public List<HolidayRate> holidays(Session s) {
        auth.check(s);
        return repo.read(d -> List.copyOf(d.holidays.values()));
    }
    public void room(Session s, Room r) {
        saveRoom(s, r, false);
    }
    public void createRoom(Session s, Room r) {
        saveRoom(s, r, true);
    }
    private void saveRoom(Session s, Room r, boolean creating) {
        Rules.text(r.id(), "mã");
        auth.check(s, Role.MANAGER);
        Rules.text(r.id(), "mã phòng");
        Rules.text(r.name(), "tên phòng");
        repo.write(d -> {
            Rules.require(creating ? !d.rooms.containsKey(r.id()) : d.rooms.containsKey(r.id()),
                creating ? "Mã đã tồn tại, hãy chọn mã khác" : "Bản ghi không còn tồn tại");
            Rules.require(d.types.containsKey(r.typeId()), "Loại phòng không tồn tại");
            Room old = d.rooms.get(r.id());
            if (old != null) {
                Rules.require(old.status() != RoomStatus.OCCUPIED, "Không sửa phòng đang có khách");
                Rules.require(old.typeId().equals(r.typeId())
                        || d.bookings.values().stream().noneMatch(b
                            -> b.roomId().equals(r.id())
                                && List.of(BookingStatus.PENDING, BookingStatus.CONFIRMED,
                                           BookingStatus.CHECKED_IN)
                                       .contains(b.status())),
                    "Không đổi loại phòng đang có phiếu chưa hoàn tất");
                Rules.require(
                    r.status() == old.status(), "Đổi trạng thái tại sơ đồ phòng hoặc ngừng hoạt động");
            } else
                Rules.require(r.status() == RoomStatus.AVAILABLE, "Phòng mới phải Trống");
            d.rooms.put(r.id(), r);
            Rules.audit(d, s.accountId(), "Lưu phòng", r.id(), r.name());
            return null;
        });
    }
    public void disableRoom(Session s, String id) {
        auth.check(s, Role.MANAGER);
        repo.write(d -> {
            Room r = d.rooms.get(id);
            Rules.require(r != null, "Không có phòng");
            Rules.require(
                d.bookings.values().stream().noneMatch(b
                    -> b.roomId().equals(id)
                        && List.of(BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN)
                               .contains(b.status())),
                "Phòng còn giao dịch chưa hoàn tất");
            d.rooms.put(id,
                new Room(r.id(), r.name(), r.typeId(),
                    r.status() == RoomStatus.DISABLED ? RoomStatus.AVAILABLE : RoomStatus.DISABLED,
                    r.imagePath(), r.note(), null));
            Rules.audit(d, s.accountId(), "Khóa/mở phòng", id, "");
            return null;
        });
    }
    public void type(Session s, RoomType t) {
        saveType(s, t, false);
    }
    public void createType(Session s, RoomType t) {
        saveType(s, t, true);
    }
    private void saveType(Session s, RoomType t, boolean creating) {
        Rules.text(t.id(), "mã");
        auth.check(s, Role.MANAGER);
        Rules.text(t.name(), "tên loại");
        Rules.require(t.capacity() > 0 && t.beds() > 0 && t.dailyPrice() > 0 && t.hourlyPrice() > 0
                && t.nightlyPrice() > 0,
            "Sức chứa, giường và giá phải > 0");
        repo.write(d -> {
            Rules.require(creating ? !d.types.containsKey(t.id()) : d.types.containsKey(t.id()),
                creating ? "Mã đã tồn tại, hãy chọn mã khác" : "Bản ghi không còn tồn tại");
            d.types.put(t.id(), t);
            Rules.audit(d, s.accountId(), "Lưu loại phòng", t.id(), t.name());
            return null;
        });
    }
    public void service(Session s, HotelService v) {
        saveService(s, v, false);
    }
    public void createService(Session s, HotelService v) {
        saveService(s, v, true);
    }
    private void saveService(Session s, HotelService v, boolean creating) {
        Rules.text(v.id(), "mã");
        auth.check(s, Role.MANAGER);
        Rules.text(v.name(), "tên dịch vụ");
        Rules.require(v.price() > 0, "Giá dịch vụ phải > 0");
        repo.write(d -> {
            Rules.require(creating ? !d.services.containsKey(v.id()) : d.services.containsKey(v.id()),
                creating ? "Mã đã tồn tại, hãy chọn mã khác" : "Bản ghi không còn tồn tại");
            Rules.require(d.services.values().stream().noneMatch(
                              x -> !x.id().equals(v.id()) && x.name().equalsIgnoreCase(v.name())),
                "Tên dịch vụ trùng");
            d.services.put(v.id(), v);
            Rules.audit(d, s.accountId(), "Lưu dịch vụ", v.id(), v.name());
            return null;
        });
    }
    public void holiday(Session s, HolidayRate h) {
        auth.check(s, Role.MANAGER);
        Rules.text(h.name(), "tên đợt lễ");
        Rules.require(!h.end().isBefore(h.start()) && h.percent() >= 0 && h.percent() <= 1000,
            "Khoảng ngày hoặc mức tăng không hợp lệ");
        repo.write(d -> {
            Rules.require(
                d.holidays.values().stream().noneMatch(x
                    -> !x.id().equals(h.id()) && !h.start().isAfter(x.end()) && !x.start().isAfter(h.end())),
                "Đợt giá lễ chồng lấn");
            d.holidays.put(h.id(), h);
            Rules.audit(d, s.accountId(), "Lưu giá lễ", h.id(), h.name());
            return null;
        });
    }
    public void removeHoliday(Session s, String id) {
        auth.check(s, Role.MANAGER);
        repo.write(d -> {
            d.holidays.remove(id);
            Rules.audit(d, s.accountId(), "Xóa giá lễ", id, "");
            return null;
        });
    }
}
