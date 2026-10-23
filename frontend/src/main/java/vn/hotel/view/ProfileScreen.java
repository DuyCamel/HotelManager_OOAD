package vn.hotel.view;

/** Hồ sơ khách tự xem với điểm, hạng thẻ và trạng thái. */
import java.awt.BorderLayout;
import java.time.*;
import java.util.*;
import javax.swing.*;
import vn.hotel.controller.AppController;
import vn.hotel.domain.*;
import vn.hotel.service.*;
import vn.hotel.ui.*;
public final class ProfileScreen extends Screen {
    public ProfileScreen(AppController a) {
        super(a, "Hồ sơ & thành viên", "Thông tin khách hàng và điểm được cộng từ hóa đơn đã thanh toán");
        action("Làm mới", this::refresh);
        refresh();
    }
    public void refresh() {
        content.removeAll();
        Customer c = api.customers.me(session);
        Membership m = api.customers.myCard(session);
        JPanel p = Theme.card();
        p.setLayout(new java.awt.GridLayout(0, 1, 0, 16));
        for (String s :
            new String[] {"Họ tên: " + c.name(), "Mã khách: " + c.id(), "Điện thoại: " + c.phone(),
                "Địa chỉ: " + c.address(), "Thẻ thành viên: " + (m == null ? "Chưa cấp" : m.id()),
                "Điểm tích lũy: " + (m == null ? 0 : m.points()),
                "Hạng: " + (m == null ? "Chưa có" : CustomerService.tier(m.points())),
                "Trạng thái thẻ: "
                    + (m == null         ? "Chưa cấp"
                            : m.active() ? "Hoạt động"
                                         : "Vô hiệu")})
            p.add(new JLabel(s));
        content.add(p, BorderLayout.NORTH);
        content.revalidate();
        content.repaint();
    }
}
