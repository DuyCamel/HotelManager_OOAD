package vn.hotel.view;

/** Phiếu đặt cho nhân viên hoặc dữ liệu riêng của khách; xác nhận cọc và nhận phòng. */
import java.awt.BorderLayout;
import java.time.*;
import java.util.*;
import javax.swing.*;
import vn.hotel.controller.AppController;
import vn.hotel.domain.*;
import vn.hotel.service.*;
import vn.hotel.ui.*;
public final class ReservationsScreen extends Screen {
    private final DataTable table = new DataTable("Mã phiếu", "Khách", "Điện thoại", "Phòng", "Nhận", "Trả",
        "Trạng thái", "Tiền phòng", "Cọc", "Hạn giữ", "Kênh");
    public ReservationsScreen(AppController a) {
        super(a, sessionTitle(a), "Kiểm tra cọc, nhận phòng và theo dõi hạn giữ phiếu");
        content.add(table);
        action("Chi tiết / thanh toán cọc", this::detail);
        if (session.role() != Role.CUSTOMER) {
            action("Xác nhận cọc", () -> {
                String id = table.id();
                Forms f = new Forms().text("amount", "Số tiền đã nhận (đ)", 200000);
                if (f.show(this, "Xác nhận cọc thủ công"))
                    api.bookings.deposit(session, id, f.number("amount"));
                refresh();
            });
            action("Nhận phòng", () -> {
                String id = table.id();
                Forms f = new Forms().text("identity", "Giấy tờ khách lưu trú", "");
                if (f.show(this, "Xác nhận check-in"))
                    app.message("Phiếu thuê: " + api.bookings.checkIn(session, id, f.value("identity")));
                refresh();
            });
        }
        action("Hủy phiếu", () -> {
            if (app.confirm("Hủy phiếu chưa cọc đã chọn?"))
                api.bookings.cancel(session, table.id());
            refresh();
        });
        action("Làm mới", this::refresh);
        refresh();
    }
    private static String sessionTitle(AppController a) {
        return a.session().role() == Role.CUSTOMER ? "Đặt phòng của tôi" : "Phiếu đặt phòng & check-in";
    }
    private void detail() {
        Booking b = api.bookings.list(session)
                        .stream()
                        .filter(x -> x.id().equals(table.id()))
                        .findFirst()
                        .orElseThrow();
        app.message("Phiếu " + b.id() + "\nPhòng: " + b.roomId() + "\nTrạng thái: " + b.status()
            + "\nTiền phòng: " + Theme.money(b.roomCharge()) + "\nĐã cọc: " + Theme.money(b.deposit())
            + "\nHạn giữ: " + b.holdUntil()
            + "\nBản demo chưa có QR/nhận webhook ngân hàng. Lễ tân xác nhận cọc thủ công.");
    }
    public void refresh() {
        var people = session.role() == Role.CUSTOMER ? java.util.List.of(api.customers.me(session))
                                                     : api.customers.list(session);
        table.rows(api.bookings.list(session)
                       .stream()
                       .map(b
                           -> new Object[] {b.id(), b.customerId(),
                               people.stream()
                                   .filter(c -> c.id().equals(b.customerId()))
                                   .map(Customer::phone)
                                   .findFirst()
                                   .orElse(""),
                               b.roomId(), b.start(), b.end(), b.status(), Theme.money(b.roomCharge()),
                               Theme.money(b.deposit()), b.holdUntil(), b.channel()})
                       .toList());
    }
}
