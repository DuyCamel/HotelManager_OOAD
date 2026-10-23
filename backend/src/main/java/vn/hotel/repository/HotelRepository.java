package vn.hotel.repository;

/** Cổng lưu trữ tách nghiệp vụ khỏi file; có thể thay bằng JDBC sau này. */
public interface HotelRepository {
    <T> T read(java.util.function.Function<HotelData, T> query);
    <T> T write(java.util.function.Function<HotelData, T> operation);
    void backup(java.nio.file.Path path);
    void restore(java.nio.file.Path path);
}
