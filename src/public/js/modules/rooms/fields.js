import { effectiveRoomImages, roomDetails } from "./metadata.js";

const VIEW_OPTIONS = [
  ["", "— Chưa chọn / Mặc định —"],
  ["Hướng phố", "Hướng phố (City View)"],
  ["Hướng vườn", "Hướng vườn (Garden View)"],
  ["Hướng hồ bơi", "Hướng hồ bơi (Pool View)"],
  ["Hướng biển / Sông", "Hướng biển / Sông"],
  ["Hướng nội khu", "Hướng nội khu / Giếng trời"],
  ["Tiêu chuẩn (Không cửa sổ)", "Tiêu chuẩn (Không cửa sổ)"],
];

/** Form quản lý hồ sơ phòng; không thay thao tác vận hành đang ở/cần dọn. */
export default function fields(r = {}, field, opts) {
  const kind = "rooms";
  const details = roomDetails(r);
  const initialImages = effectiveRoomImages(r);
  const optional = (value) => ({ ...value, optional: true });
  const statusLabels = {
    AVAILABLE: "Sẵn sàng",
    OCCUPIED: "Đang ở (quản lý tại sơ đồ)",
    DIRTY: "Cần dọn (quản lý tại sơ đồ)",
    MAINTENANCE: "Bảo trì",
    DISABLED: "Ngừng hoạt động",
  };
  const statusOptions = ["OCCUPIED", "DIRTY"].includes(r.status)
    ? [[r.status, statusLabels[r.status]]]
    : ["AVAILABLE", "MAINTENANCE", "DISABLED"].map((status) => [
        status,
        statusLabels[status],
      ]);
  const viewOptions =
    details.viewName && !VIEW_OPTIONS.some(([val]) => val === details.viewName)
      ? [[details.viewName, details.viewName], ...VIEW_OPTIONS]
      : VIEW_OPTIONS;
  const f = [
    field("kind", "", "hidden", kind),
    field("id", "", "hidden", r.id || ""),
    field("imageUrl", "", "hidden", initialImages[0] || ""),
    field("galleryUrls", "", "hidden", initialImages.slice(1, 5).join("\n")),
  ];
  return f.concat(!r.id ? [optional(field("code", "Mã phòng (Tự động sinh)"))] : [], [
    field("name", "Tên phòng", "text", r.name),
    field("typeId", "Loại phòng", "select", r.typeId, opts("types")),
    field(
      "status",
      "Trạng thái quản lý",
      "select",
      r.status || "AVAILABLE",
      statusOptions,
    ),
    optional(
      field(
        "viewName",
        "Hướng nhìn / Vị trí",
        "select",
        details.viewName || "",
        viewOptions,
      ),
    ),
    optional(field("note", "Ghi chú vận hành (tầng, vị trí...)", "textarea", details.note)),
  ]);
}
