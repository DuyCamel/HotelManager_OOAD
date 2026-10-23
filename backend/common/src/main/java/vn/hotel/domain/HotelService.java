package vn.hotel.domain;

/** Danh mục dịch vụ; chưa quản lý tồn kho minibar. */
public record HotelService(String id, String name, String description, long price, boolean active)
    implements java.io.Serializable {}
