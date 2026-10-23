package vn.hotel.view;

/** Danh sách, thêm/sửa thông tin và khóa/mở phòng có kiểm tra giao dịch. */
import java.awt.BorderLayout;
import java.time.*;
import java.util.*;
import javax.swing.*;
import vn.hotel.controller.AppController;
import vn.hotel.domain.*;
import vn.hotel.service.*;
import vn.hotel.ui.*;
public final class RoomsScreen extends Screen {
    private final DataTable table = new DataTable("Mã", "Tên phòng", "Loại", "Trạng thái", "Ảnh", "Ghi chú");
    public RoomsScreen(AppController a) {
        super(a, "Danh mục phòng", "Quản lý phòng vật lý, thông tin và tình trạng hoạt động");
        content.add(table);
        action("Thêm phòng", () -> edit(null));
        action("Chi tiết / sửa",
            ()
                -> edit(api.catalog.rooms(session)
                            .stream()
                            .filter(r -> r.id().equals(table.id()))
                            .findFirst()
                            .orElseThrow()));
        action("Khóa / mở", () -> {
            if (app.confirm("Đổi trạng thái hoạt động phòng đã chọn?"))
                api.catalog.disableRoom(session, table.id());
            refresh();
        });
        action("Làm mới", this::refresh);
        refresh();
    }
    private void edit(Room r) {
        Object[] types =
            api.catalog.types(session).stream().map(t -> new Forms.Option(t.id(), t.name())).toArray();
        Forms f = new Forms()
                      .text("id", "Mã phòng", r == null ? Rules.id("P") : r.id())
                      .text("name", "Tên phòng", r == null ? "" : r.name())
                      .choice("type", "Loại phòng", types, null)
                      .text("image", "Đường dẫn ảnh", r == null ? "" : r.imagePath())
                      .text("note", "Ghi chú", r == null ? "" : r.note());
        if (r != null)
            for (Object t : types)
                if (((Forms.Option) t).id().equals(r.typeId()))
                    f.select("type", t);
        if (f.show(this, r == null ? "Thêm phòng" : "Thông tin phòng")) {
            if (r != null && !f.value("id").equals(r.id()))
                throw new IllegalArgumentException("Không đổi mã phòng khi sửa");
            java.util.function.Consumer<Room> save = r == null ? value
                -> api.catalog.createRoom(session, value)
                : value -> api.catalog.room(session, value);
            save.accept(new Room(f.value("id"), f.value("name"), f.value("type"),
                r == null ? RoomStatus.AVAILABLE : r.status(), f.value("image"), f.value("note"),
                r == null ? null : r.cleaningDeadline()));
            refresh();
        }
    }
    public void refresh() {
        table.rows(
            api.catalog.rooms(session)
                .stream()
                .map(r -> new Object[] {r.id(), r.name(), r.typeId(), r.status(), r.imagePath(), r.note()})
                .toList());
    }
}
