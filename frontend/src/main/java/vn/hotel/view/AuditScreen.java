package vn.hotel.view;

/** Nhật ký có tìm mã đối tượng và xuất CSV; không hiển thị bí mật xác thực. */
import java.awt.BorderLayout;
import java.time.*;
import java.util.*;
import javax.swing.*;
import vn.hotel.controller.AppController;
import vn.hotel.domain.*;
import vn.hotel.service.*;
import vn.hotel.ui.*;
public final class AuditScreen extends Screen {
    private final DataTable table =
        new DataTable("Mã sự kiện", "Thời gian", "Tài khoản", "Hành động", "Đối tượng", "Chi tiết");
    public AuditScreen(AppController a) {
        super(a, "Nhật ký & truy vết",
            "Tìm theo mã tài khoản, phòng, phiếu hoặc hóa đơn để xem chuỗi thao tác");
        content.add(table);
        action("Chi tiết", () -> {
            var e = api.admin.audit(session)
                        .stream()
                        .filter(x -> x.id().equals(table.id()))
                        .findFirst()
                        .orElseThrow();
            app.message(e.time() + "\nTài khoản: " + e.actor() + "\n" + e.action() + " · " + e.objectId()
                + "\n" + e.detail());
        });
        action("Làm mới", this::refresh);
        refresh();
    }
    public void refresh() {
        table.rows(
            api.admin.audit(session)
                .stream()
                .map(e -> new Object[] {e.id(), e.time(), e.actor(), e.action(), e.objectId(), e.detail()})
                .toList());
    }
}
