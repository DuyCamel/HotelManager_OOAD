package vn.hotel.view;

/** Lưới phòng có lọc trạng thái, đồng hồ, dọn xong và chọn ảnh báo hư hại. */
import java.awt.BorderLayout;
import java.time.*;
import java.util.*;
import javax.swing.*;
import vn.hotel.controller.AppController;
import vn.hotel.domain.*;
import vn.hotel.service.*;
import vn.hotel.ui.*;
public final class HousekeepingScreen extends Screen {
    private final JPanel grid = new JPanel(new java.awt.GridLayout(0, 4, 12, 12));
    private final JComboBox<String> filter =
        new JComboBox<>(new String[] {"Tất cả", "Trống", "Cần dọn", "Bảo trì", "Đang ở"});
    public HousekeepingScreen(AppController a) {
        super(a, "Sơ đồ buồng phòng",
            "Xanh: trống · Vàng: cần dọn · Đỏ: bảo trì · Hạn dọn: 90 phút sau checkout");
        actions.add(filter);
        filter.addActionListener(e -> refresh());
        action("Làm mới", this::refresh);
        content.add(new JScrollPane(grid));
        refresh();
    }
    public void refresh() {
        grid.removeAll();
        String selected = String.valueOf(filter.getSelectedItem());
        for (Room r : api.catalog.rooms(session)) {
            if (!selected.equals("Tất cả") && !r.status().toString().equals(selected))
                continue;
            JPanel p = Theme.card();
            p.setLayout(new java.awt.GridLayout(0, 1, 0, 10));
            java.awt.Color color = r.status() == RoomStatus.AVAILABLE ? new java.awt.Color(221, 246, 237)
                : r.status() == RoomStatus.DIRTY                      ? new java.awt.Color(255, 241, 195)
                : r.status() == RoomStatus.MAINTENANCE                ? new java.awt.Color(255, 221, 223)
                                                                      : java.awt.Color.WHITE;
            p.setBackground(color);
            p.add(new JLabel(r.name() + " · " + r.typeId()));
            p.add(new JLabel(r.status().toString()));
            if (r.cleaningDeadline() != null) {
                long minutes =
                    java.time.Duration.between(LocalDateTime.now(), r.cleaningDeadline()).toMinutes();
                p.add(
                    new JLabel(minutes < 0 ? "QUÁ HẠN " + (-minutes) + " phút" : "Còn " + minutes + " phút"));
            }
            p.add(Theme.button("Chi tiết / xử lý", () -> app.safe(() -> detail(r))));
            grid.add(p);
        }
        grid.revalidate();
        grid.repaint();
    }
    private void detail(Room r) {
        String[] choices = {"Xác nhận dọn xong", "Báo thiệt hại", "Đóng"};
        int c = JOptionPane.showOptionDialog(this, r.name() + " · " + r.status() + "\n" + r.note(),
            "Thông tin buồng phòng", JOptionPane.DEFAULT_OPTION, JOptionPane.PLAIN_MESSAGE, null, choices,
            choices[2]);
        if (c == 0) {
            if (app.confirm("Xác nhận phòng sạch/sẵn sàng?"))
                api.housekeeping.clean(session, r.id());
        }
        if (c == 1) {
            JFileChooser chooser = new JFileChooser();
            if (chooser.showOpenDialog(this) != JFileChooser.APPROVE_OPTION)
                return;
            Forms f = new Forms()
                          .text("detail", "Mô tả hư hại", "")
                          .text("photo", "Ảnh", chooser.getSelectedFile().getAbsolutePath());
            if (f.show(this, "Báo thiệt hại"))
                api.housekeeping.damage(session, r.id(), f.value("detail"), f.value("photo"));
        }
        refresh();
    }
}
