package vn.hotel.view;

/** Hai tab tài khoản; chỉ tab nhân viên có phân quyền/chuyển Admin mô phỏng. */
import java.awt.BorderLayout;
import java.time.*;
import java.util.*;
import javax.swing.*;
import vn.hotel.controller.AppController;
import vn.hotel.domain.*;
import vn.hotel.service.*;
import vn.hotel.ui.*;
public final class AccountsScreen extends Screen {
    private final DataTable staff = new DataTable("Mã", "Tên đăng nhập", "Họ tên", "Email", "Điện thoại",
                                "Vai trò", "Trạng thái"),
                            customers = new DataTable("Mã", "Tên đăng nhập", "Họ tên", "Email", "Điện thoại",
                                "Vai trò", "Trạng thái");
    private final JTabbedPane tabs = new JTabbedPane();
    public AccountsScreen(AppController a) {
        super(a, "Tài khoản & phân quyền", "Khách hàng tự đăng ký; nhân viên do Admin tạo");
        tabs.addTab("Nhân viên", staff);
        tabs.addTab("Khách hàng", customers);
        content.add(tabs);
        action("Tạo nhân viên", this::create);
        action("Chi tiết / sửa", () -> {
            var account = selected();
            Forms f = new Forms()
                          .text("name", "Họ tên", account.name())
                          .text("email", "Email", account.email())
                          .text("phone", "Điện thoại", account.phone());
            if (f.show(this, "Tài khoản " + account.username())) {
                api.auth.update(session, account.id(), f.value("name"), f.value("email"), f.value("phone"));
                refresh();
            }
        });
        action("Khóa / khôi phục", () -> {
            var account = selected();
            api.auth.active(session, account.id(), !account.active());
            refresh();
        });
        JButton role = Theme.button("Phân quyền", () -> app.safe(this::role));
        JButton transfer = Theme.button("Chuyển Admin DEMO", () -> app.safe(this::transfer));
        actions.add(role);
        actions.add(transfer);
        tabs.addChangeListener(e -> {
            role.setVisible(tabs.getSelectedIndex() == 0);
            transfer.setVisible(tabs.getSelectedIndex() == 0);
        });
        javax.swing.table.DefaultTableCellRenderer renderer =
            new javax.swing.table.DefaultTableCellRenderer() {
                public java.awt.Component getTableCellRendererComponent(
                    JTable t, Object v, boolean selected, boolean focus, int row, int col) {
                    var c = super.getTableCellRendererComponent(t, v, selected, focus, row, col);
                    if (!selected)
                        c.setForeground(
                            "Vô hiệu".equals(t.getValueAt(row, 6)) ? java.awt.Color.GRAY : Theme.TEXT);
                    return c;
                }
            };
        staff.table().setDefaultRenderer(Object.class, renderer);
        customers.table().setDefaultRenderer(Object.class, renderer);
        refresh();
    }
    private vn.hotel.dto.AccountView selected() {
        String id = (tabs.getSelectedIndex() == 0 ? staff : customers).id();
        return api.auth.accounts(session).stream().filter(x -> x.id().equals(id)).findFirst().orElseThrow();
    }
    private void create() {
        Forms f = new Forms()
                      .text("name", "Họ tên", "")
                      .text("email", "Email", "")
                      .text("phone", "Điện thoại", "")
                      .text("username", "Tên đăng nhập", "")
                      .password("password", "Mật khẩu")
                      .choice("role", "Vai trò",
                          new Role[] {Role.RECEPTIONIST, Role.HOUSEKEEPER, Role.MANAGER}, null);
        if (f.show(this, "Tạo nhân viên")) {
            api.auth.create(session, f.value("name"), f.value("email"), f.value("phone"), f.value("username"),
                f.value("password"), (Role) f.selected("role"));
            refresh();
        }
    }
    private void role() {
        var a = selected();
        Forms f = new Forms().choice(
            "role", "Vai trò", new Role[] {Role.RECEPTIONIST, Role.HOUSEKEEPER, Role.MANAGER}, a.role());
        if (f.show(this, "Phân quyền nhân viên")) {
            api.auth.role(session, a.id(), (Role) f.selected("role"));
            refresh();
        }
    }
    private void transfer() {
        var target = selected();
        if (app.confirm("CHỈ MÔ PHỎNG: chưa tích hợp SMS OTP.\nChuyển Admin cho " + target.name()
                + "? Admin hiện tại thành Quản lý, tất cả phiên bị thu hồi.")) {
            var challenge = api.auth.requestTransfer(session, target.id());
            Forms otp = new Forms()
                            .note("SMS mô phỏng tới " + challenge.maskedPhone())
                            .note("Mã DEMO: " + challenge.demoCode() + " (5 phút, tối đa 5 lần)")
                            .text("code", "Nhập OTP", "");
            if (!otp.show(this, "Xác thực chuyển Admin"))
                return;
            api.auth.completeTransfer(session, challenge.requestId(), otp.value("code"));
            app.message("Đã chuyển quyền trong dữ liệu demo. Vui lòng đăng nhập lại.");
            app.logout();
        }
    }
    public void refresh() {
        var all = api.auth.accounts(session);
        staff.rows(all.stream()
                       .filter(a -> a.role() != Role.CUSTOMER)
                       .map(a
                           -> new Object[] {a.id(), a.username(), a.name(), a.email(), a.phone(), a.role(),
                               a.active() ? "Hoạt động" : "Vô hiệu"})
                       .toList());
        customers.rows(all.stream()
                           .filter(a -> a.role() == Role.CUSTOMER)
                           .map(a
                               -> new Object[] {a.id(), a.username(), a.name(), a.email(), a.phone(),
                                   a.role(), a.active() ? "Hoạt động" : "Vô hiệu"})
                           .toList());
    }
}
