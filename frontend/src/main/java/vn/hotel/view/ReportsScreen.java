package vn.hotel.view;

/** Báo cáo doanh thu theo khoảng ngày với bảng và xuất CSV/in. */
import java.awt.BorderLayout;
import java.time.*;
import java.util.*;
import javax.swing.*;
import vn.hotel.controller.AppController;
import vn.hotel.domain.*;
import vn.hotel.service.*;
import vn.hotel.ui.*;
public final class ReportsScreen extends Screen {
    private final Forms dates = new Forms()
                                    .text("from", "Từ ngày yyyy-MM-dd", LocalDate.now().withDayOfMonth(1))
                                    .text("to", "Đến ngày yyyy-MM-dd", LocalDate.now());
    private final DataTable table =
        new DataTable("Hóa đơn", "Ngày", "Tiền phòng", "Dịch vụ", "Phụ thu", "Doanh thu");
    private final JLabel totals = new JLabel();
    private final RevenueChart chart = new RevenueChart();
    private final JLabel metrics = new JLabel();
    public ReportsScreen(AppController a) {
        super(a, "Báo cáo kinh doanh", "Doanh thu theo hóa đơn chính thức; CSV mở được trong Excel");
        JPanel top = new JPanel(new BorderLayout(0, 12));
        top.add(dates.panel(), BorderLayout.NORTH);
        JPanel summary = new JPanel(new java.awt.GridLayout(0, 1, 0, 10));
        summary.add(totals);
        summary.add(metrics);
        JPanel visual = new JPanel(new BorderLayout());
        visual.add(summary, BorderLayout.NORTH);
        visual.add(chart);
        top.add(visual, BorderLayout.SOUTH);
        content.add(top, BorderLayout.NORTH);
        content.add(table);
        action("Xem báo cáo", this::refresh);
        refresh();
    }
    public void refresh() {
        LocalDate from = LocalDate.parse(dates.value("from")), to = LocalDate.parse(dates.value("to"));
        var list = api.reports.invoices(session, from, to);
        var summary = api.reports.totals(session, from, to);
        var m = api.reports.metrics(session, from, to);
        metrics.setText(
            String.format(java.util.Locale.ROOT, "Công suất: %.1f%%   ·   Tỷ lệ hủy: %.1f%% (%d/%d phiếu)",
                m.occupancyPercent(), m.cancellationPercent(), m.cancelledCount(), m.bookedCount()));
        chart.values(m.dailyRevenue());
        totals.setText("Doanh thu: " + Theme.money(summary.get("Doanh thu hóa đơn"))
            + "     ·     Số hóa đơn: " + summary.get("Số hóa đơn"));
        totals.setFont(new java.awt.Font("SansSerif", java.awt.Font.BOLD, 18));
        table.rows(
            list.stream()
                .map(i
                    -> new Object[] {i.id(), i.issuedAt(), Theme.money(i.roomCharge()),
                        Theme.money(i.serviceCharge()), Theme.money(i.surcharge()),
                        Theme.money(i.roomCharge() + i.serviceCharge() + i.surcharge() - i.discount())})
                .toList());
    }
}
