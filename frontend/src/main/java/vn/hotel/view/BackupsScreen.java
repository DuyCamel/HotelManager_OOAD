package vn.hotel.view;

/** Màn hình sao lưu và khôi phục có xác nhận thay thế dữ liệu. */
import java.awt.BorderLayout;
import java.time.*;
import java.util.*;
import javax.swing.*;
import vn.hotel.controller.AppController;
import vn.hotel.domain.*;
import vn.hotel.service.*;
import vn.hotel.ui.*;
public final class BackupsScreen extends Screen {
    private final JLabel info = new JLabel();
    public BackupsScreen(AppController a) {
        super(a, "Sao lưu & khôi phục",
            "Bản demo lưu file cục bộ; khôi phục tự tạo bản sao an toàn và yêu cầu đăng nhập lại");
        JPanel p = Theme.card();
        p.setLayout(new java.awt.GridLayout(0, 1, 0, 18));
        p.add(new JLabel("Sao lưu: chọn vị trí để xuất tệp .bin"));
        p.add(new JLabel("Khôi phục: chỉ chọn bản sao tin cậy được tạo từ ứng dụng này"));
        p.add(new JLabel("Dữ liệu hiện tại được sao lưu trước khi thay thế"));
        p.add(info);
        content.add(p, BorderLayout.NORTH);
        action("Tạo bản sao", this::backup);
        action("Khôi phục từ tệp", this::restore);
        refresh();
    }
    private void backup() {
        JFileChooser c = new JFileChooser();
        c.setSelectedFile(new java.io.File("hotel-backup-" + LocalDate.now() + ".bin"));
        if (c.showSaveDialog(this) == JFileChooser.APPROVE_OPTION) {
            var path = c.getSelectedFile().toPath();
            if (java.nio.file.Files.exists(path) && !app.confirm("Ghi đè bản sao đã có?"))
                return;
            api.admin.backup(session, path);
            info.setText("Đã sao lưu: " + path.toAbsolutePath());
        }
    }
    private void restore() {
        JFileChooser c = new JFileChooser();
        if (c.showOpenDialog(this) == JFileChooser.APPROVE_OPTION
            && app.confirm("Thay thế dữ liệu hiện tại bằng bản sao?\nMọi phiên đăng nhập sẽ bị thu hồi.")) {
            api.admin.restore(session, c.getSelectedFile().toPath());
            app.message("Khôi phục thành công. Vui lòng đăng nhập lại.");
            app.logout();
        }
    }
    public void refresh() {
        info.setText("Thao tác chỉ dành cho Admin");
    }
}
