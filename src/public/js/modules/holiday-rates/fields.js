/** Form holiday-rates; TODO TV3 C2: ảnh và tiện ích theo module. */
export default function fields(r = {}, field, opts) {
  const kind = "holidays";
  const f = [
    field("kind", "", "hidden", kind),
    field("id", "", "hidden", r.id || ""),
  ];
  return f.concat([
    field("name", "Tên đợt lễ", "text", r.name),
    field("typeId", "Loại phòng", "select", r.typeId, opts("types")),
    field("startDate", "Ngày bắt đầu", "date", r.startDate?.slice(0, 10)),
    field("endDate", "Ngày kết thúc", "date", r.endDate?.slice(0, 10)),
    field("percent", "Tăng giá (%)", "number", r.percent || 10),
  ]);
}
