package vn.hotel.app;

/** Điểm chạy ứng dụng desktop; có thể chọn file dữ liệu qua -Dhotel.data. */
import java.nio.file.Path;
import javax.swing.*;
import vn.hotel.controller.AppController;
import vn.hotel.ui.Theme;
public final class HotelApplication {
    private HotelApplication() {}
    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            try {
                Theme.install();
                new AppController(Path.of(System.getProperty("hotel.data", "data/hotel.bin"))).start();
            } catch (Exception e) {
                JOptionPane.showMessageDialog(null, "Không khởi động được: " + e.getMessage());
            }
        });
    }
}
