package vn.hotel.view;

/** Giao diện cấu hình loại phòng, tiện ích và giá cơ bản. */
import java.awt.BorderLayout;
import java.time.*;
import java.util.*;
import javax.swing.*;
import vn.hotel.controller.AppController;
import vn.hotel.domain.*;
import vn.hotel.service.*;
import vn.hotel.ui.*;
public final class RoomTypesScreen extends Screen {
    private final DataTable table =
        new DataTable("Mã", "Loại phòng", "Sức chứa", "Giường", "Giá giờ", "Giá đêm", "Giá ngày", "Tiện ích");
    public RoomTypesScreen(AppController a) {
        super(a, "Loại phòng & giá cơ bản", "Thiết lập sức chứa, giường, tiện ích và ba mức giá");
        content.add(table);
        action("Thêm loại", () -> edit(null));
        action("Chỉnh sửa",
            ()
                -> edit(api.catalog.types(session)
                            .stream()
                            .filter(x -> x.id().equals(table.id()))
                            .findFirst()
                            .orElseThrow()));
        refresh();
    }
    private void edit(RoomType t) {
        Forms f = new Forms()
                      .text("id", "Mã loại", t == null ? Rules.id("LP") : t.id())
                      .text("name", "Tên loại", t == null ? "" : t.name())
                      .text("capacity", "Số người", t == null ? 2 : t.capacity())
                      .text("beds", "Số giường", t == null ? 1 : t.beds())
                      .text("hour", "Giá giờ (đ)", t == null ? 150000 : t.hourlyPrice())
                      .text("night", "Giá đêm (đ)", t == null ? 450000 : t.nightlyPrice())
                      .text("day", "Giá ngày (đ)", t == null ? 550000 : t.dailyPrice())
                      .text("amenities", "Tiện ích / minibar", t == null ? "Wi-Fi, TV" : t.amenities());
        if (f.show(this, "Cấu hình loại phòng")) {
            if (t != null && !t.id().equals(f.value("id")))
                throw new IllegalArgumentException("Không đổi mã khi sửa");
            java.util.function.Consumer<RoomType> save = t == null ? value
                -> api.catalog.createType(session, value)
                : value -> api.catalog.type(session, value);
            save.accept(new RoomType(f.value("id"), f.value("name"), (int) f.number("capacity"),
                (int) f.number("beds"), f.number("hour"), f.number("night"), f.number("day"),
                f.value("amenities")));
            refresh();
        }
    }
    public void refresh() {
        table.rows(
            api.catalog.types(session)
                .stream()
                .map(t
                    -> new Object[] {t.id(), t.name(), t.capacity(), t.beds(), Theme.money(t.hourlyPrice()),
                        Theme.money(t.nightlyPrice()), Theme.money(t.dailyPrice()), t.amenities()})
                .toList());
    }
}
