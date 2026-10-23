package vn.hotel.api;

/** Điểm ghép backend; frontend chỉ gọi service, không đọc repository hoặc file dữ liệu. */
import java.nio.file.Path;
import vn.hotel.bootstrap.DemoData;
import vn.hotel.repository.*;
import vn.hotel.security.AuthService;
import vn.hotel.service.*;
public final class HotelBackend {
    public final AuthService auth;
    public final CatalogService catalog;
    public final CustomerService customers;
    public final BookingService bookings;
    public final BillingService billing;
    public final HousekeepingService housekeeping;
    public final AdminService admin;
    public final ReportService reports;
    public HotelBackend(Path file) {
        HotelRepository r = new FileHotelRepository(file);
        DemoData.seed(r);
        auth = new AuthService(r);
        catalog = new CatalogService(r, auth);
        customers = new CustomerService(r, auth);
        bookings = new BookingService(r, auth);
        billing = new BillingService(r, auth);
        housekeeping = new HousekeepingService(r, auth);
        admin = new AdminService(r, auth);
        reports = new ReportService(r, auth);
    }
}
