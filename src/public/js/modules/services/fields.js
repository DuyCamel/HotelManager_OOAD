/** Form dịch vụ tính phí/miễn phí; liên kết bao gồm được cấu hình tại loại phòng. */
export default function fields(r = {}, field, opts) {
  const kind = "services";
  const f = [
    field("kind", "", "hidden", kind),
    field("id", "", "hidden", r.id || ""),
  ];
  return f.concat([
    field("name", "Tên dịch vụ", "text", r.name),
    field("unit", "Đơn vị", "text", r.unit),
    field("price", "Đơn giá", "number", r.price ?? 0),
    field("description", "Mô tả", "textarea", r.description),
  ]);
}
