package vn.hotel.view;

/** Điều hướng theo vai trò, làm mới dọn phòng và nhả phiếu chờ cọc định kỳ khi app đang chạy. */
import java.awt.*;
import java.util.function.Supplier;
import javax.swing.*;
import vn.hotel.controller.AppController;
import vn.hotel.domain.Role;
import vn.hotel.ui.Theme;
public final class MainFrame extends JFrame {
    private final AppController app;
    private final JPanel body = new JPanel(new BorderLayout());
    private final JPanel nav = new JPanel();
    private final javax.swing.Timer timer;
    private Screen current;
    public MainFrame(AppController app) {
        super("HotelManager OOAD · " + app.session().role());
        this.app = app;
        setDefaultCloseOperation(EXIT_ON_CLOSE);
        setSize(1400, 880);
        setMinimumSize(new Dimension(1120, 720));
        setLocationRelativeTo(null);
        setLayout(new BorderLayout());
        JPanel sidebar = new JPanel(new BorderLayout());
        sidebar.setPreferredSize(new Dimension(225, 800));
        sidebar.setBackground(Theme.NAVY);
        nav.setBackground(Theme.NAVY);
        nav.setLayout(new BoxLayout(nav, BoxLayout.Y_AXIS));
        JLabel logo = new JLabel("  AURORA / HOTEL");
        logo.setForeground(Color.WHITE);
        logo.setFont(new Font("SansSerif", Font.BOLD, 19));
        logo.setBorder(BorderFactory.createEmptyBorder(30, 10, 25, 10));
        sidebar.add(logo, BorderLayout.NORTH);
        sidebar.add(new JScrollPane(nav), BorderLayout.CENTER);
        Role role = app.session().role();
        if (role == Role.CUSTOMER) {
            link("Tìm & đặt phòng", () -> new BookingScreen(app, true));
            link("Đặt phòng của tôi", () -> new ReservationsScreen(app));
            link("Hồ sơ & thành viên", () -> new ProfileScreen(app));
        } else {
            link("Tổng quan", () -> new DashboardScreen(app));
            if (role == Role.ADMIN || role == Role.MANAGER) {
                link("Danh mục phòng", () -> new RoomsScreen(app));
                link("Loại phòng & giá", () -> new RoomTypesScreen(app));
                link("Dịch vụ & minibar", () -> new ServicesScreen(app));
                link("Giá dịp lễ", () -> new HolidaysScreen(app));
            }
            link("Sơ đồ buồng phòng", () -> new HousekeepingScreen(app));
            if (role != Role.HOUSEKEEPER) {
                link("Hồ sơ khách hàng", () -> new CustomersScreen(app));
                link("Thẻ thành viên", () -> new MembershipsScreen(app));
                link("Đặt phòng tại quầy", () -> new BookingScreen(app, false));
                link("Phiếu đặt & check-in", () -> new ReservationsScreen(app));
                link("Lưu trú & checkout", () -> new StaysScreen(app));
                link("Hóa đơn", () -> new InvoicesScreen(app));
            }
            if (role == Role.ADMIN || role == Role.MANAGER) {
                link("Báo cáo kinh doanh", () -> new ReportsScreen(app));
                link("Nhật ký & truy vết", () -> new AuditScreen(app));
                link("Cấu hình khách sạn", () -> new SettingsScreen(app));
            }
            if (role == Role.ADMIN) {
                link("Tài khoản & phân quyền", () -> new AccountsScreen(app));
                link("Sao lưu & khôi phục", () -> new BackupsScreen(app));
            }
        }
        JButton out = Theme.button("Đăng xuất", app::logout);
        sidebar.add(out, BorderLayout.SOUTH);
        add(sidebar, BorderLayout.WEST);
        JPanel right = new JPanel(new BorderLayout());
        JPanel top = new JPanel(new FlowLayout(FlowLayout.RIGHT, 20, 13));
        top.setBackground(Color.WHITE);
        top.add(new JLabel(app.session().name() + "  /  " + role + "   ·   Bản chạy thử"));
        right.add(top, BorderLayout.NORTH);
        right.add(body, BorderLayout.CENTER);
        add(right, BorderLayout.CENTER);
        if (role == Role.CUSTOMER)
            open(() -> new BookingScreen(app, true));
        else
            open(() -> new DashboardScreen(app));
        timer = new javax.swing.Timer(30000, e -> app.safe(() -> {
            app.backend.bookings.expire();
            if (current instanceof HousekeepingScreen)
                current.refresh();
        }));
        timer.start();
    }
    private void link(String title, Supplier<Screen> factory) {
        JButton b = new JButton(title);
        b.setAlignmentX(Component.LEFT_ALIGNMENT);
        b.setMaximumSize(new Dimension(225, 40));
        b.setHorizontalAlignment(SwingConstants.LEFT);
        b.setBackground(Theme.NAVY);
        b.setForeground(Color.WHITE);
        b.setBorder(BorderFactory.createEmptyBorder(10, 18, 10, 10));
        b.setFocusPainted(false);
        b.addActionListener(e -> app.safe(() -> open(factory)));
        nav.add(b);
    }
    private void open(Supplier<Screen> factory) {
        current = factory.get();
        body.removeAll();
        body.add(current);
        body.revalidate();
        body.repaint();
    }
    public void dispose() {
        if (timer != null)
            timer.stop();
        super.dispose();
    }
}
