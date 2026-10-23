package vn.hotel.view;

/** Tìm kiếm, tạo và sửa hồ sơ; hiển thị mã tài khoản, không lộ username. */
import java.awt.BorderLayout;
import java.time.*;
import java.util.*;
import javax.swing.*;
import vn.hotel.controller.AppController;
import vn.hotel.domain.*;
import vn.hotel.service.*;
import vn.hotel.ui.*;
public final class CustomersScreen extends Screen {
    private final DataTable table =
        new DataTable("Mã", "Khách hàng", "Điện thoại", "Giấy tờ", "Địa chỉ", "Mã tài khoản", "Trạng thái");
    public CustomersScreen(AppController a) {
        super(a, "Hồ sơ khách hàng", "Hồ sơ khách tại quầy độc lập với tài khoản trực tuyến");
        content.add(table);
        action("Thêm hồ sơ", () -> edit(null));
        action("Chi tiết / sửa",
            ()
                -> edit(api.customers.list(session)
                            .stream()
                            .filter(c -> c.id().equals(table.id()))
                            .findFirst()
                            .orElseThrow()));
        action("Lưu trữ hồ sơ", () -> {
            if (app.confirm("Lưu trữ hồ sơ đã chọn?"))
                api.customers.archive(session, table.id());
            refresh();
        });
        refresh();
    }
    private void edit(Customer c) {
        Forms f = new Forms()
                      .text("name", "Họ tên", c == null ? "" : c.name())
                      .text("phone", "Điện thoại", c == null ? "" : c.phone())
                      .text("identity", "CCCD / Hộ chiếu", c == null ? "" : c.identity())
                      .text("address", "Địa chỉ", c == null ? "" : c.address());
        if (f.show(this, "Thông tin khách hàng")) {
            api.customers.save(session,
                new Customer(c == null ? Rules.id("KH") : c.id(), f.value("name"), f.value("phone"),
                    f.value("identity"), f.value("address"), c == null ? "" : c.accountId(), true));
            refresh();
        }
    }
    public void refresh() {
        table.rows(api.customers.list(session)
                       .stream()
                       .map(c
                           -> new Object[] {c.id(), c.name(), c.phone(), c.identity(), c.address(),
                               c.accountId(), c.active() ? "Hoạt động" : "Lưu trữ"})
                       .toList());
    }
}
