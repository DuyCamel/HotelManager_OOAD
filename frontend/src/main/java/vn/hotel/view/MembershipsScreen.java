package vn.hotel.view;

/** Danh sách thẻ, cấp thẻ và vô hiệu hóa; hạng được suy ra từ điểm. */
import java.awt.BorderLayout;
import java.time.*;
import java.util.*;
import javax.swing.*;
import vn.hotel.controller.AppController;
import vn.hotel.domain.*;
import vn.hotel.service.*;
import vn.hotel.ui.*;
public final class MembershipsScreen extends Screen {
    private final DataTable table =
        new DataTable("Mã thẻ", "Mã khách", "Khách hàng", "Điểm", "Hạng", "Trạng thái");
    public MembershipsScreen(AppController a) {
        super(a, "Thẻ thành viên", "Điểm tự cộng sau checkout; không chỉnh điểm thủ công");
        content.add(table);
        action("Cấp thẻ", () -> {
            Object[] cs = api.customers.list(session)
                              .stream()
                              .filter(Customer::active)
                              .map(c -> new Forms.Option(c.id(), c.id() + " · " + c.name()))
                              .toArray();
            Forms f = new Forms().choice("customer", "Khách hàng", cs, null);
            if (f.show(this, "Cấp thẻ"))
                api.customers.issueCard(session, f.value("customer"));
            refresh();
        });
        action("Vô hiệu hóa", () -> {
            if (app.confirm("Vô hiệu hóa thẻ đã chọn?"))
                api.customers.disableCard(session, table.id());
            refresh();
        });
        refresh();
    }
    public void refresh() {
        var customers = api.customers.list(session);
        table.rows(
            api.customers.cards(session)
                .stream()
                .map(m
                    -> new Object[] {m.id(), m.customerId(),
                        customers.stream()
                            .filter(c -> c.id().equals(m.customerId()))
                            .map(Customer::name)
                            .findFirst()
                            .orElse(""),
                        m.points(), CustomerService.tier(m.points()), m.active() ? "Hoạt động" : "Vô hiệu"})
                .toList());
    }
}
