package vn.hotel.ui;

/** Biểu mẫu nhập liệu dùng lại, mã đối tượng tách nhãn hiển thị. */
import java.awt.*;
import java.util.*;
import javax.swing.*;
public final class Forms {
    private final JPanel panel = new JPanel(new GridBagLayout());
    private final Map<String, JComponent> fields = new LinkedHashMap<>();
    private int row;
    public Forms() {
        panel.setBackground(Color.WHITE);
    }
    public Forms text(String key, String label, Object value) {
        JTextField f = new JTextField(value == null ? "" : value.toString(), 25);
        add(key, label, f);
        return this;
    }
    public Forms password(String key, String label) {
        add(key, label, new JPasswordField(25));
        return this;
    }
    public Forms choice(String key, String label, Object[] options, Object selected) {
        JComboBox<Object> b = new JComboBox<>(options);
        if (selected != null)
            b.setSelectedItem(selected);
        add(key, label, b);
        return this;
    }
    public Forms note(String text) {
        GridBagConstraints c = new GridBagConstraints();
        c.gridx = 0;
        c.gridy = row++;
        c.gridwidth = 2;
        c.anchor = GridBagConstraints.WEST;
        c.insets = new Insets(8, 8, 8, 8);
        panel.add(new JLabel(text), c);
        return this;
    }
    private void add(String key, String label, JComponent f) {
        fields.put(key, f);
        GridBagConstraints c = new GridBagConstraints();
        c.gridy = row++;
        c.gridx = 0;
        c.anchor = GridBagConstraints.WEST;
        c.insets = new Insets(7, 8, 7, 12);
        panel.add(new JLabel(label), c);
        c.gridx = 1;
        c.fill = GridBagConstraints.HORIZONTAL;
        c.weightx = 1;
        panel.add(f, c);
    }
    public String value(String k) {
        JComponent c = fields.get(k);
        if (c instanceof JComboBox<?> b) {
            Object v = b.getSelectedItem();
            return v instanceof Option o ? o.id() : String.valueOf(v);
        }
        if (c instanceof JPasswordField p)
            return new String(p.getPassword());
        return ((JTextField) c).getText().trim();
    }
    public void setText(String key, String value) {
        ((JTextField) fields.get(key)).setText(value);
    }
    public void select(String key, Object value) {
        ((JComboBox<?>) fields.get(key)).setSelectedItem(value);
    }
    public Object selected(String key) {
        return ((JComboBox<?>) fields.get(key)).getSelectedItem();
    }
    public long number(String k) {
        try {
            return Long.parseLong(value(k));
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Giá trị cần là số nguyên: " + k);
        }
    }
    public boolean show(Component parent, String title) {
        return JOptionPane.showConfirmDialog(
                   parent, panel, title, JOptionPane.OK_CANCEL_OPTION, JOptionPane.PLAIN_MESSAGE)
            == JOptionPane.OK_OPTION;
    }
    public JPanel panel() {
        return panel;
    }
    public record Option(String id, String label) {
        public String toString() {
            return label;
        }
    }
}
