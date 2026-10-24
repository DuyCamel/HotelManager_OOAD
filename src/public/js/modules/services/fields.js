/** Form services; TODO TV3 C2: ảnh và tiện ích theo module. */
export default function fields(r = {}, field, opts) {
  const kind = "services";
  const f = [
    field("kind", "", "hidden", kind),
    field("id", "", "hidden", r.id || ""),
  ];
  return f.concat([
    field("name", "Tên dịch vụ", "text", r.name),
    field("unit", "Đơn vị", "text", r.unit),
    field("price", "Đơn giá", "number", r.price || 10000),
    field("description", "Mô tả", "textarea", r.description),
  ]);
}
