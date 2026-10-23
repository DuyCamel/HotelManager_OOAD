package vn.hotel.infrastructure.database;

import java.nio.file.Path;

/** Kiểm tra kết nối thật bằng SELECT; không chạy seed, không ghi/xóa dữ liệu. */
public final class DatabaseConnectionCheck {
    private DatabaseConnectionCheck() {}
    public static void main(String[] args) {
        Path file = Path.of(args.length == 0 ? "backend/database/config/database.properties" : args[0]);
        try {
            DatabaseConfig config = DatabaseConfig.load(file);
            try (var connection = new ConnectionFactory(config).open();
                 var statement = connection.createStatement();
                 var result = statement.executeQuery("SELECT DB_NAME() DatabaseName, CONVERT(nvarchar(128), "
                                                     + "SERVERPROPERTY('ServerName')) ServerName")) {
                if (result.next()) {
                    System.out.println("Kết nối thành công: " + result.getString("ServerName") + " / "
                        + result.getString("DatabaseName"));
                }
                try (var check = connection.createStatement();
                     var rows =
                         check.executeQuery("SELECT (SELECT MAX(VersionNo) FROM dbo.SchemaVersion) "
                                            + "SchemaVersion, (SELECT COUNT_BIG(*) FROM dbo.Room) Rooms, "
                                            + "(SELECT COUNT_BIG(*) FROM dbo.Booking) Bookings")) {
                    if (rows.next())
                        System.out.println("Schema=" + rows.getInt(1) + ", Phòng=" + rows.getLong(2)
                            + ", Phiếu đặt=" + rows.getLong(3));
                }
            }
        } catch (Exception e) {
            System.err.println("Kiểm tra kết nối thất bại: " + e.getMessage());
            System.err.println(
                "Xem backend/database/README.md: instance, TCP/IP, cổng, quyền login và chứng chỉ local.");
            System.exit(1);
        }
    }
}
