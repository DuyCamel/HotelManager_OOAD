/** Form loại phòng: một giá đêm cơ bản là nguồn giá có thẩm quyền. */
export default function fields(r = {}, field, opts) {
  const kind = "types";
  const f = [
    field("kind", "", "hidden", kind),
    field("id", "", "hidden", r.id || ""),
    field("serviceConfig", "", "hidden", JSON.stringify(r.serviceConfig || [])),
    field("serviceConfigTouched", "", "hidden", "0"),
  ];
  return f.concat([
    field("name", "Tên loại", "text", r.name),
    field("capacity", "Sức chứa tối đa", "number", r.capacity || 1),
    field("beds", "Số giường", "number", r.beds || 1),
    field("nightlyPrice", "Giá cơ bản / đêm", "number", r.nightlyPrice || 1),
    field("amenities", "Tiện nghi", "textarea", r.amenities),
  ]);
}
