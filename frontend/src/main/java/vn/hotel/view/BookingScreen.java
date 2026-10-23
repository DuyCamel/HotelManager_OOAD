package vn.hotel.view;

/** Tìm phòng theo khoảng thời gian và sức chứa, đặt trực tuyến hoặc tại quầy. */
import java.awt.BorderLayout;
import java.time.*;
import java.util.*;
import javax.swing.*;
import vn.hotel.controller.AppController;
import vn.hotel.domain.*;
import vn.hotel.service.*;
import vn.hotel.ui.*;
public final class BookingScreen extends Screen {
    private final boolean online;
    private final DataTable table =
        new DataTable("Mã phòng", "Tên phòng", "Loại", "Sức chứa", "Giá ngày", "Tạm tính");
    private Forms search =
        new Forms()
            .text("start", "Nhận yyyy-MM-ddTHH:mm", LocalDate.now().plusDays(1).atTime(14, 0))
            .text("end", "Trả yyyy-MM-ddTHH:mm", LocalDate.now().plusDays(2).atTime(12, 0))
            .text("people", "Số người", 2);
    public BookingScreen(AppController a, boolean online) {
        super(a, online ? "Tìm & đặt phòng" : "Đặt phòng tại quầy",
            "Chọn khoảng lưu trú, tìm phòng phù hợp và xem tiền dự kiến trước xác nhận");
        this.online = online;
        var config = api.catalog.publicSettings(session);
        search = new Forms()
                     .text("start", "Nhận yyyy-MM-ddTHH:mm",
                         LocalDate.now().plusDays(1).atTime(LocalTime.parse(config.get("checkIn"))))
                     .text("end", "Trả yyyy-MM-ddTHH:mm",
                         LocalDate.now().plusDays(2).atTime(LocalTime.parse(config.get("checkOut"))))
                     .text("people", "Số người", 2);
        content.add(search.panel(), BorderLayout.NORTH);
        content.add(table);
        action("Tìm phòng", this::refresh);
        action("Đặt phòng đã chọn", this::book);
        refresh();
    }
    private LocalDateTime start() {
        return LocalDateTime.parse(search.value("start"));
    }
    private LocalDateTime end() {
        return LocalDateTime.parse(search.value("end"));
    }
    private void book() {
        String room = table.id();
        long price = api.bookings.quote(session, room, start(), end());
        String customer;
        long deposit = 0;
        if (online) {
            Customer c = api.customers.me(session);
            if (c == null)
                throw new IllegalArgumentException("Chưa có hồ sơ tài khoản");
            customer = c.id();
            if (!app.confirm("Đặt " + room + " · Tạm tính " + Theme.money(price)
                    + "?\nPhiếu chờ cọc giữ 30 phút. Chưa thu tiền ở bước này."))
                return;
        } else {
            Object[] cs = api.customers.list(session)
                              .stream()
                              .filter(Customer::active)
                              .map(c -> new Forms.Option(c.id(), c.id() + " · " + c.name()))
                              .toArray();
            Forms f = new Forms()
                          .choice("customer", "Hồ sơ khách", cs, null)
                          .text("deposit", "Tiền cọc (đ)", price * 30 / 100)
                          .note("Khách mới: tạo tại Hồ sơ khách hàng trước khi đặt.");
            if (!f.show(this, "Xác nhận đặt · " + Theme.money(price)))
                return;
            customer = f.value("customer");
            deposit = f.number("deposit");
        }
        String id = api.bookings.create(session, customer, room, start(), end(), deposit);
        app.message("Đã tạo phiếu " + id
            + (online ? "\nChờ cọc. Liên hệ lễ tân xác nhận khoản cọc.\nVietQR/ngân hàng chưa tích hợp trong "
                        + "bản này."
                      : "\nĐã xác nhận cọc tại quầy."));
        refresh();
    }
    public void refresh() {
        var types = api.catalog.types(session);
        table.rows(
            api.bookings.available(session, start(), end(), (int) search.number("people"))
                .stream()
                .map(r -> {
                    RoomType t =
                        types.stream().filter(x -> x.id().equals(r.typeId())).findFirst().orElseThrow();
                    return new Object[] {r.id(), r.name(), t.name(), t.capacity(),
                        Theme.money(t.dailyPrice()),
                        Theme.money(api.bookings.quote(session, r.id(), start(), end()))};
                })
                .toList());
    }
}
