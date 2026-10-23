package vn.hotel.view;

/** Quản lý khoảng ngày giá lễ và xem thử giá sau tăng. */
import java.awt.BorderLayout;
import java.time.*;
import java.util.*;
import javax.swing.*;
import vn.hotel.controller.AppController;
import vn.hotel.domain.*;
import vn.hotel.service.*;
import vn.hotel.ui.*;
public final class HolidaysScreen extends Screen {
    private final DataTable table = new DataTable("Mã", "Tên đợt lễ", "Từ ngày", "Đến ngày", "Tăng %");
    public HolidaysScreen(AppController a) {
        super(a, "Giá dịp lễ", "Mức tăng áp dụng theo ngày lưu trú; không cho phép chồng lấn");
        content.add(table);
        action("Thêm đợt lễ", () -> edit(null));
        action("Chỉnh sửa",
            ()
                -> edit(api.catalog.holidays(session)
                            .stream()
                            .filter(h -> h.id().equals(table.id()))
                            .findFirst()
                            .orElseThrow()));
        action("Xóa đợt lễ", () -> {
            if (app.confirm("Xóa đợt giá đã chọn?"))
                api.catalog.removeHoliday(session, table.id());
            refresh();
        });
        action("Xem trước giá", () -> {
            Forms f = new Forms().text("base", "Giá cơ bản", 550000).text("percent", "Tăng %", 20);
            if (f.show(this, "Xem trước giá"))
                app.message("Giá dự kiến: "
                    + Theme.money(Math.round(f.number("base") * (100 + f.number("percent")) / 100.0)));
        });
        refresh();
    }
    private void edit(HolidayRate h) {
        Forms f = new Forms()
                      .text("name", "Tên đợt", h == null ? "" : h.name())
                      .text("start", "Từ ngày yyyy-MM-dd", h == null ? LocalDate.now() : h.start())
                      .text("end", "Đến ngày yyyy-MM-dd", h == null ? LocalDate.now().plusDays(1) : h.end())
                      .text("percent", "Tăng %", h == null ? 20 : h.percent());
        if (f.show(this, "Giá lễ")) {
            api.catalog.holiday(session,
                new HolidayRate(h == null ? Rules.id("GL") : h.id(), f.value("name"),
                    LocalDate.parse(f.value("start")), LocalDate.parse(f.value("end")),
                    (int) f.number("percent")));
            refresh();
        }
    }
    public void refresh() {
        table.rows(api.catalog.holidays(session)
                       .stream()
                       .map(h -> new Object[] {h.id(), h.name(), h.start(), h.end(), h.percent()})
                       .toList());
    }
}
