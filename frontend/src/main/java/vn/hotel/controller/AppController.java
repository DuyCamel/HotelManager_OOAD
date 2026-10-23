package vn.hotel.controller;

/** Điều phối đăng nhập, phiên, màn hình và thông báo; không chứa quy tắc nghiệp vụ. */
import java.nio.file.Path;
import javax.swing.*;
import vn.hotel.api.HotelBackend;
import vn.hotel.dto.Session;
import vn.hotel.view.*;
public final class AppController {
    public final HotelBackend backend;
    private JFrame frame;
    private Session session;
    public AppController(Path file) {
        backend = new HotelBackend(file);
    }
    public Session session() {
        return session;
    }
    public void start() {
        showLogin();
    }
    public void login(String username, String password) {
        session = backend.auth.login(username, password);
        if (frame != null)
            frame.dispose();
        frame = new MainFrame(this);
        frame.setVisible(true);
    }
    public void logout() {
        backend.auth.logout(session);
        session = null;
        showLogin();
    }
    private void showLogin() {
        if (frame != null)
            frame.dispose();
        frame = new LoginFrame(this);
        frame.setVisible(true);
    }
    public void safe(Runnable r) {
        try {
            r.run();
        } catch (Exception e) {
            JOptionPane.showMessageDialog(frame, e.getMessage(), "Thông báo", JOptionPane.WARNING_MESSAGE);
        }
    }
    public void message(String text) {
        JOptionPane.showMessageDialog(frame, text);
    }
    public boolean confirm(String text) {
        return JOptionPane.showConfirmDialog(frame, text, "Xác nhận", JOptionPane.YES_NO_OPTION)
            == JOptionPane.YES_OPTION;
    }
}
