package vn.hotel;

import java.awt.*;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;
import javax.swing.*;
import vn.hotel.controller.AppController;
import vn.hotel.ui.Theme;
import vn.hotel.view.MainFrame;

/** Mở tất cả mục điều hướng cho năm vai trò; cần màn hình desktop hoặc DISPLAY. */
public final class FrontendSmokeTest {
    private static void buttons(Container parent, List<JButton> result) {
        for (Component child : parent.getComponents()) {
            if (child instanceof JButton button && button.getParent().getLayout() instanceof BoxLayout)
                result.add(button);
            if (child instanceof Container container)
                buttons(container, result);
        }
    }
    public static void main(String[] args) throws Exception {
        if (GraphicsEnvironment.isHeadless())
            throw new IllegalStateException("Kiểm thử UI cần màn hình");
        AppController app = new AppController(Files.createTempDirectory("hotel-ui-").resolve("hotel.bin"));
        int count = 0;
        for (String user : new String[] {"admin", "manager", "reception", "housekeeping", "customer"}) {
            SwingUtilities.invokeAndWait(() -> {
                Theme.install();
                app.login(user, "Demo@123");
            });
            JFrame frame = java.util.Arrays.stream(Frame.getFrames())
                               .filter(f -> f instanceof MainFrame && f.isVisible())
                               .map(f -> (JFrame) f)
                               .findFirst()
                               .orElseThrow();
            List<JButton> navigation = new ArrayList<>();
            SwingUtilities.invokeAndWait(() -> buttons(frame, navigation));
            for (JButton button : navigation) {
                SwingUtilities.invokeAndWait(() -> button.doClick());
                if (java.util.Arrays.stream(Window.getWindows())
                        .anyMatch(w -> w instanceof JDialog && w.isVisible()))
                    throw new AssertionError("Lỗi mở màn hình " + user + "/" + button.getText());
                count++;
            }
        }
        SwingUtilities.invokeAndWait(() -> {
            for (Window window : Window.getWindows()) window.dispose();
        });
        System.out.println("UI PASS " + count + " mục điều hướng / 5 vai trò");
        System.exit(0);
    }
}
