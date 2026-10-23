package vn.hotel.view;

/** Thêm/sửa/ngừng danh mục dịch vụ, không nhập tồn kho. */
import java.awt.BorderLayout;
import java.time.*;
import java.util.*;
import javax.swing.*;
import vn.hotel.controller.AppController;
import vn.hotel.domain.*;
import vn.hotel.service.*;
import vn.hotel.ui.*;
public final class ServicesScreen extends Screen {
    private final DataTable table = new DataTable("Mã", "Tên dịch vụ", "Mô tả", "Giá", "Hoạt động");
    public ServicesScreen(AppController a) {
        super(a, "Dịch vụ & minibar", "Danh mục dịch vụ; minibar không có quản lý tồn kho");
        content.add(table);
        action("Thêm dịch vụ", () -> edit(null));
        action("Sửa dịch vụ",
            ()
                -> edit(api.catalog.services(session)
                            .stream()
                            .filter(v -> v.id().equals(table.id()))
                            .findFirst()
                            .orElseThrow()));
        action("Ngừng / mở cung cấp", () -> {
            HotelService v = api.catalog.services(session)
                                 .stream()
                                 .filter(x -> x.id().equals(table.id()))
                                 .findFirst()
                                 .orElseThrow();
            api.catalog.service(
                session, new HotelService(v.id(), v.name(), v.description(), v.price(), !v.active()));
            refresh();
        });
        refresh();
    }
    private void edit(HotelService v) {
        Forms f = new Forms()
                      .text("id", "Mã", v == null ? Rules.id("DV") : v.id())
                      .text("name", "Tên", v == null ? "" : v.name())
                      .text("desc", "Mô tả", v == null ? "" : v.description())
                      .text("price", "Giá (đ)", v == null ? 50000 : v.price());
        if (f.show(this, "Thông tin dịch vụ")) {
            if (v != null && !v.id().equals(f.value("id")))
                throw new IllegalArgumentException("Không đổi mã khi sửa");
            java.util.function.Consumer<HotelService> save = v == null ? value
                -> api.catalog.createService(session, value)
                : value -> api.catalog.service(session, value);
            save.accept(new HotelService(
                f.value("id"), f.value("name"), f.value("desc"), f.number("price"), v == null || v.active()));
            refresh();
        }
    }
    public void refresh() {
        table.rows(api.catalog.services(session)
                       .stream()
                       .map(v
                           -> new Object[] {v.id(), v.name(), v.description(), Theme.money(v.price()),
                               v.active() ? "Đang cung cấp" : "Ngừng cung cấp"})
                       .toList());
    }
}
