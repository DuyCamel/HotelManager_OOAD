package vn.hotel.ui;

/** Bảng dữ liệu có tìm kiếm, phân trang, CSV và hộp thoại in của hệ điều hành. */
import java.awt.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.List;
import javax.swing.*;
import javax.swing.event.*;
import javax.swing.table.*;
public final class DataTable extends JPanel {
    private final JTable table;
    private final DefaultTableModel model;
    private List<Object[]> rows = List.of(), filtered = List.of();
    private int page;
    private final int size = 10;
    private final JTextField query = new JTextField(24);
    private final JLabel status = new JLabel();
    public DataTable(String... columns) {
        super(new BorderLayout(0, 10));
        model = new DefaultTableModel(columns, 0) {
            public boolean isCellEditable(int r, int c) {
                return false;
            }
        };
        table = new JTable(model);
        table.setRowHeight(38);
        table.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
        table.setShowVerticalLines(false);
        table.setGridColor(new Color(236, 240, 245));
        table.getTableHeader().setReorderingAllowed(false);
        table.setAutoCreateRowSorter(true);
        if (columns.length >= 8) {
            table.setAutoResizeMode(JTable.AUTO_RESIZE_OFF);
            for (int i = 0; i < columns.length; i++)
                table.getColumnModel().getColumn(i).setPreferredWidth(i == 3 || i == 4 ? 160 : 125);
        }
        JPanel top = new JPanel(new FlowLayout(FlowLayout.LEFT, 8, 0));
        top.add(new JLabel("Tìm kiếm"));
        top.add(query);
        top.add(Theme.button("Xuất CSV", () -> safe(() -> export())));
        top.add(Theme.button("In / Lưu PDF", () -> safe(() -> table.print(JTable.PrintMode.FIT_WIDTH))));
        add(top, BorderLayout.NORTH);
        add(new JScrollPane(table), BorderLayout.CENTER);
        JPanel bottom = new JPanel(new FlowLayout(FlowLayout.RIGHT));
        bottom.add(Theme.button("‹ Trước", () -> {
            if (page > 0) {
                page--;
                render();
            }
        }));
        bottom.add(status);
        bottom.add(Theme.button("Sau ›", () -> {
            if ((page + 1) * size < filtered.size()) {
                page++;
                render();
            }
        }));
        add(bottom, BorderLayout.SOUTH);
        query.getDocument().addDocumentListener(new DocumentListener() {
            public void insertUpdate(DocumentEvent e) {
                filter();
            }
            public void removeUpdate(DocumentEvent e) {
                filter();
            }
            public void changedUpdate(DocumentEvent e) {
                filter();
            }
        });
    }
    public void rows(List<Object[]> rows) {
        this.rows = rows;
        filter();
    }
    private void filter() {
        String q = query.getText().trim().toLowerCase(java.util.Locale.ROOT);
        filtered = rows.stream()
                       .filter(r
                           -> Arrays.stream(r).anyMatch(
                               v -> String.valueOf(v).toLowerCase(java.util.Locale.ROOT).contains(q)))
                       .toList();
        page = 0;
        render();
    }
    private void render() {
        model.setRowCount(0);
        filtered.stream().skip((long) page * size).limit(size).forEach(model::addRow);
        status.setText("Trang " + (page + 1) + " / " + Math.max(1, (filtered.size() + size - 1) / size)
            + "  ·  " + filtered.size() + " kết quả");
    }
    public String id() {
        int r = table.getSelectedRow();
        if (r < 0)
            throw new IllegalArgumentException("Vui lòng chọn một dòng trong bảng");
        return String.valueOf(model.getValueAt(table.convertRowIndexToModel(r), 0));
    }
    public void onSelect(Runnable r) {
        table.getSelectionModel().addListSelectionListener(e -> {
            if (!e.getValueIsAdjusting())
                r.run();
        });
    }
    public JTable table() {
        return table;
    }
    private static String csv(Object v) {
        String s = String.valueOf(v);
        if (s.matches("^[=+@-].*"))
            s = "'" + s;
        return "\"" + s.replace("\"", "\"\"") + "\"";
    }
    private void export() throws Exception {
        JFileChooser c = new JFileChooser();
        c.setSelectedFile(new java.io.File("hotel-export.csv"));
        if (c.showSaveDialog(this) != JFileChooser.APPROVE_OPTION)
            return;
        Path p = c.getSelectedFile().toPath();
        if (Files.exists(p)
            && JOptionPane.showConfirmDialog(this, "Ghi đè tệp đã có?", "Xuất CSV", JOptionPane.YES_NO_OPTION)
                != JOptionPane.YES_OPTION)
            return;
        StringBuilder b = new StringBuilder("\uFEFF");
        for (int i = 0; i < model.getColumnCount(); i++) {
            if (i > 0)
                b.append(',');
            b.append(csv(model.getColumnName(i)));
        }
        b.append('\n');
        for (Object[] r : filtered) {
            for (int i = 0; i < r.length; i++) {
                if (i > 0)
                    b.append(',');
                b.append(csv(r[i]));
            }
            b.append('\n');
        }
        Files.writeString(p, b, StandardCharsets.UTF_8);
        JOptionPane.showMessageDialog(this, "Đã xuất " + filtered.size() + " dòng");
    }
    private void safe(Task t) {
        try {
            t.run();
        } catch (Exception e) {
            JOptionPane.showMessageDialog(
                this, e.getMessage(), "Không thể thực hiện", JOptionPane.ERROR_MESSAGE);
        }
    }
    private interface Task {
        void run() throws Exception;
    }
}
