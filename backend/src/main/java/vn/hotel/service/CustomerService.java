package vn.hotel.service;

/** Hồ sơ khách, liên kết tài khoản và thẻ; không có API chỉnh điểm thủ công. */
import java.util.*;
import vn.hotel.domain.*;
import vn.hotel.dto.Session;
import vn.hotel.repository.*;
import vn.hotel.security.AuthService;
public final class CustomerService {
    private final HotelRepository repo;
    private final AuthService auth;
    public CustomerService(HotelRepository r, AuthService a) {
        repo = r;
        auth = a;
    }
    public List<Customer> list(Session s) {
        auth.check(s, Role.MANAGER, Role.RECEPTIONIST);
        return repo.read(d -> List.copyOf(d.customers.values()));
    }
    public Customer me(Session s) {
        auth.check(s);
        return repo.read(d
            -> d.customers.values()
                   .stream()
                   .filter(c -> c.accountId().equals(s.accountId()))
                   .findFirst()
                   .orElse(null));
    }
    public void save(Session s, Customer c) {
        auth.check(s, Role.MANAGER, Role.RECEPTIONIST);
        Rules.text(c.name(), "họ tên");
        Rules.require(c.phone().matches("[0-9+]{9,15}"), "Điện thoại không hợp lệ");
        Rules.text(c.identity(), "CCCD/giấy tờ");
        repo.write(d -> {
            Rules.require(d.customers.values().stream().noneMatch(
                              x -> !x.id().equals(c.id()) && x.identity().equals(c.identity())),
                "Giấy tờ đã thuộc hồ sơ khác");
            Customer old = d.customers.get(c.id());
            Rules.require(old == null || old.active(), "Hồ sơ đã lưu trữ");
            d.customers.put(c.id(),
                new Customer(c.id(), c.name(), c.phone(), c.identity(), c.address(),
                    old == null ? "" : old.accountId(), true));
            Rules.audit(d, s.accountId(), "Lưu hồ sơ", c.id(), c.name());
            return null;
        });
    }
    public void archive(Session s, String id) {
        auth.check(s, Role.MANAGER);
        repo.write(d -> {
            Customer c = d.customers.get(id);
            Rules.require(c != null, "Không có hồ sơ");
            Rules.require(
                d.bookings.values().stream().noneMatch(b
                    -> b.customerId().equals(id)
                        && List.of(BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN)
                               .contains(b.status())),
                "Khách còn giao dịch dang dở");
            d.customers.put(id,
                new Customer(c.id(), c.name(), c.phone(), c.identity(), c.address(), c.accountId(), false));
            Rules.audit(d, s.accountId(), "Lưu trữ hồ sơ", id, "");
            return null;
        });
    }
    public List<Membership> cards(Session s) {
        auth.check(s, Role.MANAGER, Role.RECEPTIONIST);
        return repo.read(d -> List.copyOf(d.memberships.values()));
    }
    public Membership myCard(Session s) {
        Customer c = me(s);
        return c == null ? null
                         : repo.read(d
                               -> d.memberships.values()
                                      .stream()
                                      .filter(m -> m.customerId().equals(c.id()))
                                      .findFirst()
                                      .orElse(null));
    }
    public void issueCard(Session s, String customer) {
        auth.check(s, Role.RECEPTIONIST);
        repo.write(d -> {
            Customer c = d.customers.get(customer);
            Rules.require(c != null && c.active(), "Khách không hợp lệ");
            Rules.require(d.memberships.values().stream().noneMatch(m -> m.customerId().equals(customer)),
                "Khách đã có thẻ, vui lòng tra cứu");
            String id = Rules.id("TV");
            d.memberships.put(id, new Membership(id, customer, 0, true));
            Rules.audit(d, s.accountId(), "Cấp thẻ", id, customer);
            return null;
        });
    }
    public void disableCard(Session s, String id) {
        auth.check(s, Role.MANAGER, Role.RECEPTIONIST);
        repo.write(d -> {
            Membership m = d.memberships.get(id);
            Rules.require(m != null && m.active(), "Thẻ không hoạt động");
            d.memberships.put(id, new Membership(m.id(), m.customerId(), m.points(), false));
            Rules.audit(d, s.accountId(), "Vô hiệu hóa thẻ", id, "");
            return null;
        });
    }
    public static String tier(long points) {
        return points >= 1000 ? "Kim cương" : points >= 500 ? "Vàng" : points >= 100 ? "Bạc" : "Thành viên";
    }
}
