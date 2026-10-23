package vn.hotel.view;

/** Biểu mẫu thông tin khách sạn, giờ nhận trả và tài khoản ngân hàng tham khảo. */
import java.awt.BorderLayout;
import java.time.*;
import java.util.*;
import javax.swing.*;
import vn.hotel.controller.AppController;
import vn.hotel.domain.*;
import vn.hotel.service.*;
import vn.hotel.ui.*;
public final class SettingsScreen extends Screen {
    private Forms form;
    public SettingsScreen(AppController a) {
        super(
            a, "Cấu hình khách sạn", "Thông tin cơ sở và giờ mặc định; cấu hình ngân hàng chỉ lưu tham khảo");
        action("Lưu cấu hình", this::save);
        action("Tải lại", this::refresh);
        action("Chọn logo", () -> {
            JFileChooser chooser = new JFileChooser();
            if (chooser.showOpenDialog(this) == JFileChooser.APPROVE_OPTION)
                form.setText("logoPath", chooser.getSelectedFile().getAbsolutePath());
        });
        refresh();
    }
    public void refresh() {
        var s = api.admin.settings(session);
        form = new Forms()
                   .text("hotelName", "Tên khách sạn", s.get("hotelName"))
                   .text("address", "Địa chỉ", s.get("address"))
                   .text("hotline", "Hotline", s.get("hotline"))
                   .text("checkIn", "Giờ nhận HH:mm", s.get("checkIn"))
                   .text("checkOut", "Giờ trả HH:mm", s.get("checkOut"))
                   .text("bank", "Ngân hàng", s.get("bank"))
                   .text("bankAccount", "Số tài khoản", s.get("bankAccount"))
                   .text("bankOwner", "Chủ tài khoản", s.get("bankOwner"))
                   .text("logoPath", "Đường dẫn logo (PNG/JPG)", s.getOrDefault("logoPath", ""))
                   .text("lateFrom", "Bắt đầu phụ thu HH:mm", s.getOrDefault("lateFrom", "13:00"))
                   .text("latePercent", "Phụ thu % giá ngày", s.getOrDefault("latePercent", "30"))
                   .note("Quy định phụ thu được lưu để duyệt; chưa đưa vào bảng kê demo.");
        content.removeAll();
        content.add(form.panel(), BorderLayout.NORTH);
        content.revalidate();
        content.repaint();
    }
    private void save() {
        Map<String, String> values = new LinkedHashMap<>();
        for (String k : new String[] {"hotelName", "address", "hotline", "checkIn", "checkOut", "bank",
                 "bankAccount", "bankOwner", "logoPath", "lateFrom", "latePercent"})
            values.put(k, form.value(k));
        api.admin.settings(session, values);
        app.message("Đã lưu cấu hình");
    }
}
