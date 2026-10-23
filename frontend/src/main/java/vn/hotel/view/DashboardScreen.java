package vn.hotel.view;

/** Trang đầu gồm chỉ số thật từ dữ liệu demo và lưới tình trạng phòng. */
import java.awt.*;
import javax.swing.*;
import vn.hotel.controller.AppController;
import vn.hotel.domain.*;
import vn.hotel.ui.*;
public final class DashboardScreen extends Screen {
    public DashboardScreen(AppController a) {
        super(a, "Tổng quan khách sạn", "Theo dõi phòng và tình trạng phục vụ trong ngày");
        action("Làm mới", this::refresh);
        refresh();
    }
    public void refresh() {
        content.removeAll();
        var rooms = api.catalog.rooms(session);
        JPanel cards = new JPanel(new GridLayout(1, 4, 16, 0));
        String[] labels = {"TỔNG SỐ PHÒNG", "PHÒNG TRỐNG", "ĐANG CÓ KHÁCH", "CẦN DỌN"};
        long[] values = {rooms.size(), rooms.stream().filter(r -> r.status() == RoomStatus.AVAILABLE).count(),
            rooms.stream().filter(r -> r.status() == RoomStatus.OCCUPIED).count(),
            rooms.stream().filter(r -> r.status() == RoomStatus.DIRTY).count()};
        for (int i = 0; i < labels.length; i++) {
            JPanel p = Theme.card();
            p.setLayout(new GridLayout(0, 1, 0, 12));
            JLabel l = new JLabel(labels[i]);
            l.setForeground(Theme.MUTED);
            p.add(l);
            JLabel v = Theme.title(String.valueOf(values[i]));
            v.setForeground(Theme.TEAL);
            p.add(v);
            cards.add(p);
        }
        content.add(cards, BorderLayout.NORTH);
        JPanel lower = new JPanel(new BorderLayout(0, 14));
        JLabel title = new JLabel("Tình trạng phòng hiện tại");
        title.setFont(new Font("SansSerif", Font.BOLD, 18));
        lower.add(title, BorderLayout.NORTH);
        JPanel grid = new JPanel(new GridLayout(0, 4, 12, 12));
        for (Room r : rooms) {
            JPanel p = Theme.card();
            p.setLayout(new GridLayout(0, 1, 0, 8));
            p.add(new JLabel(r.name() + "  ·  " + r.typeId()));
            JLabel state = new JLabel(r.status().toString());
            state.setForeground(r.status() == RoomStatus.AVAILABLE ? Theme.TEAL
                    : r.status() == RoomStatus.DIRTY               ? new Color(185, 126, 19)
                                                                   : new Color(170, 64, 69));
            p.add(state);
            grid.add(p);
        }
        lower.add(new JScrollPane(grid), BorderLayout.CENTER);
        content.add(lower);
        content.revalidate();
        content.repaint();
    }
}
