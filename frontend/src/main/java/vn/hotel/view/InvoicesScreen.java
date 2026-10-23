package vn.hotel.view;

/** Tra cứu và in lại hóa đơn bất biến, không gọi thanh toán lần nữa. */
import java.awt.BorderLayout;
import java.time.*;
import java.util.*;
import javax.swing.*;
import vn.hotel.controller.AppController;
import vn.hotel.domain.*;
import vn.hotel.service.*;
import vn.hotel.ui.*;
public final class InvoicesScreen extends Screen {
    private final DataTable table = new DataTable("Hóa đơn", "Phiếu thuê", "Khách", "Ngày lập", "Tiền phòng",
        "Dịch vụ", "Phụ thu", "Cọc", "Thu còn lại", "Phương thức");
    public InvoicesScreen(AppController a) {
        super(a, "Hóa đơn", "Tra cứu hóa đơn chính thức và in lại từ dữ liệu đã chốt");
        content.add(table);
        action("Chi tiết / In hóa đơn", this::detail);
        action("Làm mới", this::refresh);
        refresh();
    }
    private void detail() {
        Invoice i = api.billing.invoices(session)
                        .stream()
                        .filter(x -> x.id().equals(table.id()))
                        .findFirst()
                        .orElseThrow();
        String text = "HÓA ĐƠN DỊCH VỤ KHÁCH SẠN\n" + i.id() + "  ·  " + i.issuedAt()
            + "\nKhách: " + i.customerId() + "\nPhiếu thuê: " + i.stayId()
            + "\n--------------------------------------\nTiền phòng: " + Theme.money(i.roomCharge())
            + "\nDịch vụ: " + Theme.money(i.serviceCharge()) + "\nPhụ thu: " + Theme.money(i.surcharge())
            + "\nGiảm giá: " + Theme.money(i.discount()) + "\nĐã cọc: " + Theme.money(i.deposit())
            + "\nThu còn lại: " + Theme.money(i.paid()) + "\nPhương thức: " + i.method()
            + "\nĐÃ THANH TOÁN\nCảm ơn quý khách!";
        JTextArea area = new JTextArea(text, 20, 45);
        area.setEditable(false);
        if (JOptionPane.showConfirmDialog(this, new JScrollPane(area), "In hóa đơn (chọn máy in PDF nếu có)",
                JOptionPane.OK_CANCEL_OPTION)
            == JOptionPane.OK_OPTION) {
            try {
                area.print();
            } catch (Exception e) {
                throw new IllegalArgumentException("In thất bại; có thể in lại: " + e.getMessage());
            }
        }
    }
    public void refresh() {
        table.rows(api.billing.invoices(session)
                       .stream()
                       .map(i
                           -> new Object[] {i.id(), i.stayId(), i.customerId(), i.issuedAt(),
                               Theme.money(i.roomCharge()), Theme.money(i.serviceCharge()),
                               Theme.money(i.surcharge()), Theme.money(i.deposit()), Theme.money(i.paid()),
                               i.method()})
                       .toList());
    }
}
