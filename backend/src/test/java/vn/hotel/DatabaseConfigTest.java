package vn.hotel;

import java.io.IOException;
import java.nio.file.*;
import vn.hotel.infrastructure.database.DatabaseConfig;

/** Kiểm thử cấu hình từng máy và bảo vệ bí mật, không cần SQL Server/driver. */
public final class DatabaseConfigTest {
    private static int checks;
    private static void require(boolean ok, String message) {
        checks++;
        if (!ok)
            throw new AssertionError(message);
    }
    private static void reject(Path path) throws Exception {
        try {
            DatabaseConfig.load(path);
            throw new AssertionError("Phải từ chối cấu hình sai");
        } catch (IOException expected) {
            checks++;
        }
    }
    public static void main(String[] args) throws Exception {
        Path dir = Files.createTempDirectory("hotel-config-");
        Path file = dir.resolve("database.properties");
        reject(file);
        Files.writeString(file,
            "db.url=jdbc:sqlserver://"
            + "localhost:1433;databaseName=HotelManager_OOAD;\ndb.user=hotel_dev\ndb.password=CHANGE_ME\n");
        reject(file);
        Files.writeString(file,
            "db.url=jdbc:sqlserver://"
            + "localhost:1433;databaseName=HotelManager_OOAD;\ndb.user=hotel_dev\ndb.password=Mat_khau_UTF8_"
            + "thử\n");
        var config = DatabaseConfig.load(file);
        require(config.password().equals("Mat_khau_UTF8_thử"), "Đọc UTF-8 phải giữ mật khẩu");
        require(!config.toString().contains(config.password()), "Không lộ mật khẩu trong toString");
        require(config.user().equals("hotel_dev"), "Đọc login SQL riêng");
        Files.writeString(file,
            "db.url=jdbc:sqlserver://localhost:1433;integratedSecurity=true;\ndb.user=\ndb.password=\n");
        require(DatabaseConfig.load(file).user().isEmpty(), "Windows auth cho phép user/password rỗng");
        Files.writeString(file, "db.url=jdbc:mysql://localhost/test\ndb.user=x\ndb.password=example\n");
        reject(file);
        System.out.println("PASS " + checks + " kiểm tra cấu hình JDBC (không kết nối server)");
    }
}
