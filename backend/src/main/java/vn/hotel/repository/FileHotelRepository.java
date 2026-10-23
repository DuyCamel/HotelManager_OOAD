package vn.hotel.repository;

/** Lưu file nguyên tử, khóa truy cập và copy trước thay đổi để lỗi không ghi nửa chừng. */
import java.io.*;
import java.nio.file.*;
import java.util.function.Function;
import vn.hotel.exception.BusinessException;
public final class FileHotelRepository implements HotelRepository {
    private HotelData data;
    private final Path file;
    public FileHotelRepository(Path file) {
        this.file = file;
        data = Files.exists(file) ? load(file) : new HotelData();
    }
    private static byte[] encode(HotelData d) throws IOException {
        var out = new ByteArrayOutputStream();
        try (var o = new ObjectOutputStream(out)) {
            o.writeObject(d);
        }
        return out.toByteArray();
    }
    private static HotelData decode(byte[] bytes) throws IOException, ClassNotFoundException {
        try (var in = new ObjectInputStream(new ByteArrayInputStream(bytes))) {
            in.setObjectInputFilter(info -> {
                if (info.depth() > 40 || info.references() > 100000 || info.streamBytes() > 20000000)
                    return ObjectInputFilter.Status.REJECTED;
                Class<?> c = info.serialClass();
                if (c == null)
                    return ObjectInputFilter.Status.UNDECIDED;
                while (c.isArray()) c = c.getComponentType();
                return c.isPrimitive() || c.getName().startsWith("vn.hotel.")
                        || c.getName().startsWith("java.lang.") || c.getName().startsWith("java.time.")
                        || c.getName().startsWith("java.util.")
                    ? ObjectInputFilter.Status.ALLOWED
                    : ObjectInputFilter.Status.REJECTED;
            });
            Object d = in.readObject();
            if (!(d instanceof HotelData))
                throw new IOException("Sai định dạng bản sao");
            return (HotelData) d;
        }
    }
    private static HotelData load(Path p) {
        try {
            return decode(Files.readAllBytes(p));
        } catch (Exception e) {
            throw new BusinessException("Không đọc được dữ liệu/bản sao: " + e.getMessage());
        }
    }
    private static void save(Path p, HotelData d) {
        try {
            Path abs = p.toAbsolutePath();
            Files.createDirectories(abs.getParent());
            Path temp = Files.createTempFile(abs.getParent(), "hotel-", ".tmp");
            try {
                Files.write(temp, encode(d));
                try {
                    Files.move(
                        temp, abs, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
                } catch (AtomicMoveNotSupportedException e) {
                    Files.move(temp, abs, StandardCopyOption.REPLACE_EXISTING);
                }
            } finally {
                Files.deleteIfExists(temp);
            }
        } catch (IOException e) {
            throw new BusinessException("Không lưu được dữ liệu: " + e.getMessage());
        }
    }
    public synchronized<T> T read(Function<HotelData, T> q) {
        return q.apply(data);
    }
    public synchronized<T> T write(Function<HotelData, T> op) {
        try {
            HotelData copy = decode(encode(data));
            T result = op.apply(copy);
            save(file, copy);
            data = copy;
            return result;
        } catch (IOException | ClassNotFoundException e) {
            throw new BusinessException("Lỗi ghi dữ liệu: " + e.getMessage());
        }
    }
    public synchronized void backup(Path p) {
        save(p, data);
        load(p);
    }
    public synchronized void restore(Path p) {
        HotelData selected = load(p);
        save(file.resolveSibling("before-restore-" + System.currentTimeMillis() + ".bin"), data);
        save(file, selected);
        data = selected;
    }
}
