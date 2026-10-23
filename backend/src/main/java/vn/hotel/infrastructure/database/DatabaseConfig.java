package vn.hotel.infrastructure.database;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.Properties;

/** Đọc cấu hình riêng từng máy; không nhúng mật khẩu vào source hoặc log. */
public record DatabaseConfig(String url, String user, String password) {
    public static DatabaseConfig load(Path path) throws IOException {
        Properties properties = new Properties();
        if (!Files.isRegularFile(path)) {
            throw new IOException(
                "Chưa có " + path + ". Copy config/database.example.properties và sửa cấu hình.");
        }
        try (var reader = Files.newBufferedReader(path, StandardCharsets.UTF_8)) {
            properties.load(reader);
        }
        String url = value(properties, "db.url", "HOTEL_DB_URL").trim();
        String user = value(properties, "db.user", "HOTEL_DB_USER").trim();
        String password = value(properties, "db.password", "HOTEL_DB_PASSWORD");
        if (!url.startsWith("jdbc:sqlserver://"))
            throw new IOException("db.url phải bắt đầu bằng jdbc:sqlserver://");
        boolean integrated = url.toLowerCase(java.util.Locale.ROOT).contains("integratedsecurity=true");
        if (!integrated && (user.isBlank() || password.isBlank() || password.equals("CHANGE_ME"))) {
            throw new IOException("Điền db.user và db.password riêng trên máy của bạn.");
        }
        return new DatabaseConfig(url, user, password);
    }
    private static String value(Properties p, String key, String environment) {
        String override = System.getenv(environment);
        return override == null ? p.getProperty(key, "") : override;
    }
    @Override
    public String toString() {
        return "DatabaseConfig[credentials hidden]";
    }
}
