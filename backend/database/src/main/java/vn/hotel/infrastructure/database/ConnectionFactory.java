package vn.hotel.infrastructure.database;

import java.sql.*;
import java.util.Properties;

/** Mở JDBC SQL Server; utility này chưa thay repository file trong HotelBackend. */
public final class ConnectionFactory {
    private final DatabaseConfig config;
    public ConnectionFactory(DatabaseConfig config) {
        this.config = config;
    }
    public Connection open() throws SQLException {
        try {
            Class.forName("com.microsoft.sqlserver.jdbc.SQLServerDriver");
        } catch (ClassNotFoundException e) {
            throw new SQLException(
                "Thiếu Microsoft JDBC Driver. Đặt mssql-jdbc-<version>.jre11.jar vào backend/database/lib/.", e);
        }
        Properties credentials = new Properties();
        if (!config.user().isBlank())
            credentials.setProperty("user", config.user());
        if (!config.password().isBlank())
            credentials.setProperty("password", config.password());
        Connection connection = DriverManager.getConnection(config.url(), credentials);
        try (var statement = connection.createStatement()) {
            statement.execute(
                "SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON; SET ANSI_WARNINGS ON; SET "
                + "ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF;");
            return connection;
        } catch (SQLException e) {
            try {
                connection.close();
            } catch (SQLException closeError) {
                e.addSuppressed(closeError);
            }
            throw e;
        }
    }
}
