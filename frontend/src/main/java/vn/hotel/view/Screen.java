package vn.hotel.view;

/** Khung tiêu đề và hành động chung cho từng màn hình nghiệp vụ. */
import java.awt.*;
import javax.swing.*;
import vn.hotel.api.HotelBackend;
import vn.hotel.controller.AppController;
import vn.hotel.dto.Session;
import vn.hotel.ui.*;
public abstract class Screen extends JPanel {
    protected final AppController app;
    protected final HotelBackend api;
    protected final Session session;
    protected final JPanel actions = new JPanel(new FlowLayout(FlowLayout.LEFT, 8, 0));
    protected final JPanel content = new JPanel(new BorderLayout(0, 16));
    protected Screen(AppController app, String title, String subtitle) {
        super(new BorderLayout(0, 20));
        this.app = app;
        api = app.backend;
        session = app.session();
        setBorder(BorderFactory.createEmptyBorder(26, 28, 20, 28));
        JPanel header = new JPanel(new BorderLayout(0, 7));
        header.add(Theme.title(title), BorderLayout.NORTH);
        JLabel sub = new JLabel(subtitle);
        sub.setForeground(Theme.MUTED);
        header.add(sub, BorderLayout.CENTER);
        header.add(actions, BorderLayout.SOUTH);
        add(header, BorderLayout.NORTH);
        add(content, BorderLayout.CENTER);
    }
    protected void action(String label, Runnable r) {
        actions.add(Theme.button(label, () -> app.safe(r)));
    }
    public abstract void refresh();
}
