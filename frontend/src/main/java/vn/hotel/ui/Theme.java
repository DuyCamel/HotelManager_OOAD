package vn.hotel.ui;

/** Màu sắc, chữ và thành phần giao diện dùng chung. */
import java.awt.*;
import javax.swing.*;
public final class Theme {
    public static final Color NAVY = new Color(20, 35, 58), TEAL = new Color(12, 124, 117),
                              BG = new Color(244, 247, 251), TEXT = new Color(31, 45, 65),
                              MUTED = new Color(109, 123, 141);
    private Theme() {}
    public static void install() {
        UIManager.put("Label.font", new Font("SansSerif", Font.PLAIN, 14));
        UIManager.put("Button.font", new Font("SansSerif", Font.PLAIN, 14));
        UIManager.put("TextField.font", new Font("SansSerif", Font.PLAIN, 14));
        UIManager.put("ComboBox.font", new Font("SansSerif", Font.PLAIN, 14));
        UIManager.put("Table.font", new Font("SansSerif", Font.PLAIN, 14));
        UIManager.put("TableHeader.font", new Font("SansSerif", Font.BOLD, 13));
        UIManager.put("Panel.background", BG);
    }
    public static JLabel title(String text) {
        JLabel l = new JLabel(text);
        l.setFont(new Font("SansSerif", Font.BOLD, 27));
        l.setForeground(TEXT);
        return l;
    }
    public static JButton button(String text, Runnable action) {
        JButton b = new JButton(text);
        b.setFocusPainted(false);
        b.setBackground(Color.WHITE);
        b.setForeground(TEXT);
        b.setBorder(
            BorderFactory.createCompoundBorder(BorderFactory.createLineBorder(new Color(218, 225, 234)),
                BorderFactory.createEmptyBorder(9, 14, 9, 14)));
        b.addActionListener(e -> action.run());
        return b;
    }
    public static String money(long value) {
        return java.text.NumberFormat.getIntegerInstance(new java.util.Locale("vi", "VN")).format(value)
            + " đ";
    }
    public static JPanel card() {
        JPanel p = new JPanel();
        p.setBackground(Color.WHITE);
        p.setBorder(
            BorderFactory.createCompoundBorder(BorderFactory.createLineBorder(new Color(227, 232, 239)),
                BorderFactory.createEmptyBorder(18, 18, 18, 18)));
        return p;
    }
}
