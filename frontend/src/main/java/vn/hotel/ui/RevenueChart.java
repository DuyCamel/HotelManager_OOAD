package vn.hotel.ui;

/** Biểu đồ doanh thu Swing từ hóa đơn thật trong dữ liệu demo, không dùng ảnh giả. */
import java.awt.*;
import java.time.LocalDate;
import java.util.*;
import javax.swing.*;
public final class RevenueChart extends JPanel {
    private Map<LocalDate, Long> values = Map.of();
    public RevenueChart() {
        setPreferredSize(new Dimension(700, 180));
        setBackground(Color.WHITE);
    }
    public void values(Map<LocalDate, Long> v) {
        values = new TreeMap<>(v);
        repaint();
    }
    protected void paintComponent(Graphics graphics) {
        super.paintComponent(graphics);
        Graphics2D g = (Graphics2D) graphics.create();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setColor(Theme.TEXT);
        g.drawString("Doanh thu theo ngày lập hóa đơn", 18, 24);
        if (values.isEmpty()) {
            g.setColor(Theme.MUTED);
            g.drawString("Chưa có hóa đơn trong khoảng ngày đã chọn", 18, 64);
            g.dispose();
            return;
        }
        long max = Math.max(1, values.values().stream().mapToLong(Long::longValue).max().orElse(1));
        int n = values.size(), available = getWidth() - 100, step = Math.max(1, available / n), i = 0;
        for (var entry : values.entrySet()) {
            int h = (int) (95.0 * entry.getValue() / max), x = 65 + i * step;
            g.setColor(Theme.TEAL);
            g.fillRoundRect(x, 135 - h, Math.max(2, step - 12), h, 5, 5);
            if (n <= 12) {
                g.setColor(Theme.MUTED);
                g.drawString(entry.getKey().toString().substring(5), x, 154);
                g.drawString(String.valueOf(entry.getValue() / 1000) + "k", x, 130 - h);
            }
            i++;
        }
        g.dispose();
    }
}
