# JDBC driver của Microsoft

Tải Microsoft JDBC Driver for SQL Server từ https://learn.microsoft.com/en-us/sql/connect/jdbc/download-microsoft-jdbc-driver-for-sql-server

Giải nén và copy **một** file `mssql-jdbc-<version>.jre11.jar` vào thư mục này (dùng JDK 17). Không đặt nhiều phiên bản cùng lúc. JAR bị gitignore để từng máy tự cài driver.

SQL Authentication không cần DLL Windows. Windows Authentication native cần DLL `mssql-jdbc_auth-<version>-x64.dll` phù hợp JDK x64 và đúng phiên bản driver, đặt trong `java.library.path`/PATH. Xem hướng dẫn chính thức và database/README.md.

Ứng dụng vẫn dùng FileHotelRepository; driver hiện chỉ phục vụ `check-db.bat`/`scripts/check-db.sh` và lớp JDBC sắp triển khai.
