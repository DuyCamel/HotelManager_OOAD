package vn.hotel.security;

/** Quản lý phiên và quyền phía backend; chuyển Admin thật cần SMS adapter bổ sung. */
import java.util.*;
import vn.hotel.domain.*;
import vn.hotel.dto.*;
import vn.hotel.repository.*;
import vn.hotel.service.Rules;
public final class AuthService {
    private final HotelRepository repo;
    private final Map<String, Session> sessions = new HashMap<>();
    public AuthService(HotelRepository repo) {
        this.repo = repo;
    }
    public synchronized Session login(String username, String password) {
        Account a = repo.read(d
            -> d.accounts.values()
                   .stream()
                   .filter(x -> x.username().equalsIgnoreCase(username.trim()))
                   .findFirst()
                   .orElse(null));
        Rules.require(a != null && a.active() && Passwords.matches(password, a.passwordHash()),
            "Sai tài khoản/mật khẩu hoặc tài khoản bị khóa");
        Session s = new Session(UUID.randomUUID().toString(), a.id(), a.name(), a.role());
        sessions.put(s.token(), s);
        return s;
    }
    public synchronized Session check(Session s, Role... roles) {
        Rules.require(
            s != null && s.equals(sessions.get(s.token())), "Phiên hết hạn. Vui lòng đăng nhập lại");
        Account a = repo.read(d -> d.accounts.get(s.accountId()));
        Rules.require(a != null && a.active() && a.role() == s.role(), "Quyền đã đổi, hãy đăng nhập lại");
        Rules.require(roles.length == 0 || a.role() == Role.ADMIN || Arrays.asList(roles).contains(a.role()),
            "Bạn không có quyền thực hiện thao tác này");
        return s;
    }
    public synchronized void logout(Session s) {
        if (s != null)
            sessions.remove(s.token());
    }
    public synchronized void revoke(String accountId) {
        sessions.values().removeIf(s -> s.accountId().equals(accountId));
    }
    public synchronized void revokeAll() {
        sessions.clear();
    }
    public void register(String name, String email, String phone, String username, String password) {
        create(null, name, email, phone, username, password, Role.CUSTOMER);
    }
    public void create(
        Session actor, String name, String email, String phone, String username, String password, Role role) {
        if (role != Role.CUSTOMER)
            check(actor, Role.ADMIN);
        Rules.text(name, "họ tên");
        Rules.require(email != null && email.matches("[^@\\s]+@[^@\\s]+\\.[^@\\s]+"), "Email không hợp lệ");
        Rules.require(phone != null && phone.matches("[0-9+]{9,15}"), "Số điện thoại không hợp lệ");
        Rules.require(password != null && password.length() >= 8, "Mật khẩu tối thiểu 8 ký tự");
        Rules.text(username, "tên đăng nhập");
        Rules.require(role != Role.ADMIN, "Dùng chuyển quyền để cấp Admin");
        String normalizedUsername = username.trim(), normalizedEmail = email.trim();
        String hash = Passwords.hash(password);
        repo.write(d -> {
            Rules.require(d.accounts.values().stream().noneMatch(a
                              -> a.username().equalsIgnoreCase(normalizedUsername)
                                  || a.email().equalsIgnoreCase(normalizedEmail)),
                "Tên đăng nhập/email đã tồn tại");
            String id = Rules.id("TK");
            d.accounts.put(id,
                new Account(id, normalizedUsername, hash, name.trim(), normalizedEmail, phone, role, true));
            if (role == Role.CUSTOMER) {
                String c = Rules.id("KH");
                d.customers.put(c, new Customer(c, name, phone, "", "", id, true));
            }
            Rules.audit(d, actor == null ? id : actor.accountId(), "Tạo tài khoản", id, role.toString());
            return null;
        });
    }
    public List<AccountView> accounts(Session s) {
        check(s, Role.ADMIN);
        return repo.read(d
            -> d.accounts.values()
                   .stream()
                   .map(a
                       -> new AccountView(
                           a.id(), a.username(), a.name(), a.email(), a.phone(), a.role(), a.active()))
                   .sorted(Comparator.comparing(AccountView::active).reversed())
                   .toList());
    }
    public void active(Session s, String id, boolean active) {
        check(s, Role.ADMIN);
        repo.write(d -> {
            Account a = d.accounts.get(id);
            Rules.require(a != null && a.role() != Role.ADMIN, "Không được khóa Admin");
            d.accounts.put(id,
                new Account(a.id(), a.username(), a.passwordHash(), a.name(), a.email(), a.phone(), a.role(),
                    active));
            Rules.audit(d, s.accountId(), active ? "Khôi phục tài khoản" : "Khóa tài khoản", id, "");
            return null;
        });
        revoke(id);
    }
    public void role(Session s, String id, Role role) {
        check(s, Role.ADMIN);
        Rules.require(role != Role.ADMIN && role != Role.CUSTOMER, "Chỉ chọn vai trò nhân viên");
        repo.write(d -> {
            Account a = d.accounts.get(id);
            Rules.require(a != null && a.active() && a.role() != Role.ADMIN && a.role() != Role.CUSTOMER,
                "Không thể đổi vai trò tài khoản này");
            d.accounts.put(id,
                new Account(
                    a.id(), a.username(), a.passwordHash(), a.name(), a.email(), a.phone(), role, true));
            Rules.audit(d, s.accountId(), "Phân quyền", id, role.toString());
            return null;
        });
        revoke(id);
    }
    private void transferDemo(Session s, String target) {
        check(s, Role.ADMIN);
        repo.write(d -> {
            Account a = d.accounts.get(s.accountId()), b = d.accounts.get(target);
            Rules.require(b != null && b.active() && b.role() == Role.MANAGER,
                "Người nhận phải là Quản lý đang hoạt động");
            d.accounts.put(a.id(),
                new Account(a.id(), a.username(), a.passwordHash(), a.name(), a.email(), a.phone(),
                    Role.MANAGER, true));
            d.accounts.put(b.id(),
                new Account(b.id(), b.username(), b.passwordHash(), b.name(), b.email(), b.phone(),
                    Role.ADMIN, true));
            Rules.audit(d, a.id(), "Chuyển Admin DEMO", b.id(), "Chưa tích hợp SMS OTP");
            return null;
        });
        revokeAll();
    }
    private record Otp(String actor, String target, String code, java.time.Instant expires, int attempts) {}
    private final Map<String, Otp> challenges = new HashMap<>();
    public synchronized TransferChallenge requestTransfer(Session s, String target) {
        check(s, Role.ADMIN);
        Account a = repo.read(d -> d.accounts.get(s.accountId())), b = repo.read(d -> d.accounts.get(target));
        Rules.require(
            b != null && b.active() && b.role() == Role.MANAGER, "Người nhận phải là Quản lý đang hoạt động");
        challenges.values().removeIf(
            o -> o.actor().equals(s.accountId()) || o.expires().isBefore(java.time.Instant.now()));
        String id = UUID.randomUUID().toString();
        String code = String.format("%06d", new java.security.SecureRandom().nextInt(1000000));
        challenges.put(id, new Otp(s.accountId(), target, code, java.time.Instant.now().plusSeconds(300), 0));
        return new TransferChallenge(
            id, "*******" + a.phone().substring(Math.max(0, a.phone().length() - 3)), code);
    }
    public synchronized void completeTransfer(Session s, String requestId, String code) {
        check(s, Role.ADMIN);
        Otp o = challenges.get(requestId);
        Rules.require(o != null && o.actor().equals(s.accountId()), "Yêu cầu OTP không hợp lệ");
        if (o.expires().isBefore(java.time.Instant.now()) || o.attempts() >= 5) {
            challenges.remove(requestId);
            Rules.require(false, "OTP hết hạn hoặc vượt số lần nhập");
        }
        if (!o.code().equals(code)) {
            challenges.put(
                requestId, new Otp(o.actor(), o.target(), o.code(), o.expires(), o.attempts() + 1));
            Rules.require(false, "OTP sai; còn " + (4 - o.attempts()) + " lần thử");
        }
        challenges.remove(requestId);
        transferDemo(s, o.target());
    }
    public void update(Session s, String id, String name, String email, String phone) {
        check(s, Role.ADMIN);
        Rules.text(name, "họ tên");
        Rules.require(email != null && email.matches("[^@\\s]+@[^@\\s]+\\.[^@\\s]+"), "Email không hợp lệ");
        Rules.require(phone != null && phone.matches("[0-9+]{9,15}"), "Điện thoại không hợp lệ");
        repo.write(d -> {
            Account a = d.accounts.get(id);
            Rules.require(a != null && a.active(), "Tài khoản không hoạt động");
            Rules.require(d.accounts.values().stream().noneMatch(
                              x -> !x.id().equals(id) && x.email().equalsIgnoreCase(email)),
                "Email đã tồn tại");
            d.accounts.put(
                id, new Account(a.id(), a.username(), a.passwordHash(), name, email, phone, a.role(), true));
            Rules.audit(d, s.accountId(), "Sửa tài khoản", id, "");
            return null;
        });
    }
}