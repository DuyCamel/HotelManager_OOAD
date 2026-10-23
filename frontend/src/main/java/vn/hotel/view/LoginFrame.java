package vn.hotel.view;

/** Đăng nhập chung và đăng ký riêng cho khách; nhân viên do Admin tạo. */
import java.awt.*;
import javax.swing.*;
import vn.hotel.controller.AppController;
import vn.hotel.ui.*;
public final class LoginFrame extends JFrame {
    public LoginFrame(AppController app) {
        super("HotelManager · Đăng nhập");
        setDefaultCloseOperation(EXIT_ON_CLOSE);
        setSize(1000, 650);
        setLocationRelativeTo(null);
        setLayout(new GridLayout(1, 2));
        JPanel brand = new JPanel(new GridBagLayout());
        brand.setBackground(Theme.NAVY);
        JPanel copy = new JPanel(new GridLayout(0, 1, 0, 20));
        copy.setOpaque(false);
        for (String s : new String[] {"AURORA / HOTEL", "Một nơi. Mọi hoạt động.",
                 "Đặt phòng · Lưu trú · Dịch vụ", "Hệ thống quản lý khách sạn"}) {
            JLabel l = new JLabel(s);
            l.setForeground(Color.WHITE);
            l.setFont(new Font(
                "SansSerif", s.startsWith("Một") ? Font.BOLD : Font.PLAIN, s.startsWith("Một") ? 25 : 16));
            copy.add(l);
        }
        brand.add(copy);
        add(brand);
        JPanel right = new JPanel(new GridBagLayout());
        JPanel card = Theme.card();
        card.setLayout(new BorderLayout(0, 24));
        card.add(Theme.title("Chào mừng trở lại"), BorderLayout.NORTH);
        Forms f = new Forms().text("username", "Tài khoản", "").password("password", "Mật khẩu");
        card.add(f.panel(), BorderLayout.CENTER);
        JPanel buttons = new JPanel(new GridLayout(0, 1, 0, 10));
        buttons.add(Theme.button(
            "Đăng nhập", () -> app.safe(() -> app.login(f.value("username"), f.value("password")))));
        buttons.add(Theme.button("Đăng ký khách hàng", () -> app.safe(() -> register(app))));
        JLabel demo = new JLabel("<html>Demo: admin / manager / reception / housekeeping / customer<br>Mật "
            + "khẩu chung: Demo@123</html>");
        demo.setFont(new Font("SansSerif", Font.PLAIN, 12));
        buttons.add(demo);
        card.add(buttons, BorderLayout.SOUTH);
        right.add(card);
        add(right);
        getRootPane().setDefaultButton((JButton) buttons.getComponent(0));
    }
    private void register(AppController app) {
        Forms f = new Forms()
                      .text("name", "Họ tên", "")
                      .text("email", "Email", "")
                      .text("phone", "Điện thoại", "")
                      .text("username", "Tên đăng nhập", "")
                      .password("password", "Mật khẩu")
                      .password("confirm", "Nhập lại mật khẩu");
        if (!f.show(this, "Đăng ký khách hàng"))
            return;
        if (!f.value("password").equals(f.value("confirm")))
            throw new IllegalArgumentException("Mật khẩu nhập lại không khớp");
        app.backend.auth.register(
            f.value("name"), f.value("email"), f.value("phone"), f.value("username"), f.value("password"));
        app.message("Đăng ký thành công. Bạn có thể đăng nhập.");
    }
}
