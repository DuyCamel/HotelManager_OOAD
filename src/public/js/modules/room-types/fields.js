/** Form room-types; TODO TV3 C2: ảnh và tiện ích theo module. */
export default function fields(r = {}, field, opts) {
  const kind = "types";
  const f = [
    field("kind", "", "hidden", kind),
    field("id", "", "hidden", r.id || ""),
  ];
  return f.concat([
    field("name", "Tên loại", "text", r.name),
    ...["capacity", "beds", "hourlyPrice", "nightlyPrice", "dailyPrice"].map(
      (k, i) =>
        field(
          k,
          [
            "Sức chứa",
            "Số giường",
            "Giá giờ (chưa áp dụng)",
            "Giá đêm (chưa áp dụng)",
            "Giá ngày",
          ][i],
          "number",
          r[k] || 1,
        ),
    ),
    field("amenities", "Tiện nghi", "textarea", r.amenities),
  ]);
}
