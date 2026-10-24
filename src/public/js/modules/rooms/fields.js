/** Form rooms; TODO TV3 C2: ảnh và tiện ích theo module. */
export default function fields(r = {}, field, opts) {
  const kind = "rooms";
  const f = [
    field("kind", "", "hidden", kind),
    field("id", "", "hidden", r.id || ""),
  ];
  return f.concat(!r.id ? [field("code", "Mã phòng")] : [], [
    field("name", "Tên phòng", "text", r.name),
    field("typeId", "Loại phòng", "select", r.typeId, opts("types")),
    field("note", "Ghi chú", "textarea", r.note),
  ]);
}
