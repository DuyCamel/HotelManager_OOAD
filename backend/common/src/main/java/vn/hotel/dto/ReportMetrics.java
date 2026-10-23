package vn.hotel.dto;

/** Chỉ số trong khoảng ngày: công suất theo phút lưu trú và tỷ lệ hủy theo ngày nhận dự kiến. */
public record ReportMetrics(double occupancyPercent, double cancellationPercent, long bookedCount,
    long cancelledCount, java.util.Map<java.time.LocalDate, Long> dailyRevenue) {}
