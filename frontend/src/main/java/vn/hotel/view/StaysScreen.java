package vn.hotel.view;

/** Phiếu thuê, đổi phòng, bảng kê trước xác nhận thu tiền và trả phòng. */
import java.awt.BorderLayout;
import java.time.*;
import java.util.*;
import javax.swing.*;
import vn.hotel.controller.AppController;
import vn.hotel.domain.*;
import vn.hotel.service.*;
import vn.hotel.ui.*;
public final class StaysScreen extends Screen {
    private final DataTable table = new DataTable("Phiếu thuê", "Phiếu đặt", "Phòng", "Giấy tờ",
        "Nhận thực tế", "Trả thực tế", "Tiền phòng", "Phụ thu");
    public StaysScreen(AppController a) {
        super(a, "Lưu trú & checkout", "Xem bảng kê trước khi thu tiền; in lại không tạo giao dịch mới");
        content.add(table);
        action("Đổi phòng", this::change);
        action("Bảng kê & thanh toán", this::checkout);
        action("Làm mới", this::refresh);
        refresh();
    }
    private void change() {
        String id = table.id();
        Object[] rooms = api.catalog.rooms(session)
                             .stream()
                             .filter(r -> r.status() == RoomStatus.AVAILABLE)
                             .map(r -> new Forms.Option(r.id(), r.name() + " · " + r.typeId()))
                             .toArray();
        Forms f = new Forms()
                      .choice("room", "Phòng mới", rooms, null)
                      .note("Backend kiểm tra lại khoảng lưu trú; phụ thu nếu phòng mới đắt hơn.");
        if (f.show(this, "Đổi phòng")) {
            api.bookings.changeRoom(session, id, f.value("room"));
            refresh();
        }
    }
    private void checkout() {
        String id = table.id();
        var b = api.billing.preview(session, id);
        Forms f = new Forms()
                      .note("Tiền phòng: " + Theme.money(b.room()))
                      .note("Dịch vụ: " + Theme.money(b.services()))
                      .note("Phụ thu: " + Theme.money(b.surcharge()))
                      .note("Giảm giá: " + Theme.money(b.discount()))
                      .note("Đã cọc: " + Theme.money(b.deposit()))
                      .note("CÒN PHẢI THU: " + Theme.money(b.due()))
                      .choice("method", "Phương thức", new String[] {"Tiền mặt", "Chuyển khoản", "Thẻ"}, null)
                      .note("Chỉ xác nhận sau khi đã nhận tiền thực tế.");
        if (f.show(this, "Bảng kê trước thanh toán")
            && app.confirm("Đã nhận đủ " + Theme.money(b.due()) + " và xác nhận trả phòng?")) {
            String invoice = api.billing.checkout(session, id, f.value("method"), b.due());
            app.message(
                "Hoàn tất checkout. Hóa đơn: " + invoice + "\nPhòng chuyển Cần dọn. In từ mục Hóa đơn.");
            refresh();
        }
    }
    public void refresh() {
        table.rows(api.bookings.stays(session)
                       .stream()
                       .map(s
                           -> new Object[] {s.id(), s.bookingId(), s.roomId(), s.identity(), s.checkIn(),
                               s.checkOut() == null ? "Đang lưu trú" : s.checkOut(),
                               Theme.money(s.roomCharge()), Theme.money(s.surcharge())})
                       .toList());
    }
}
