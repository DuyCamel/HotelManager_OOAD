/** Form giá lễ native: ngày đầy đủ cho một lần, MM-DD cho lịch hằng năm. */
export default function fields(r = {}, field, opts) {
  const kind = "holidays";
  const scheduleType = r.scheduleType || (r.startMonthDay ? "ANNUAL" : "ONE_OFF");
  const f = [
    field("kind", "", "hidden", kind),
    field("id", "", "hidden", r.id || ""),
  ];
  return f.concat([
    field("name", "Tên đợt lễ", "text", r.name),
    field("typeId", "Loại phòng", "select", r.typeId, opts("types")),
    field(
      "scheduleType",
      "Kiểu áp dụng",
      "select",
      scheduleType,
      [
        ["ONE_OFF", "Một lần - ngày đầy đủ"],
        ["ANNUAL", "Lặp hằng năm - tháng/ngày"],
      ],
    ),
    field("startDate", "Ngày bắt đầu", "date", r.startDate?.slice(0, 10)),
    field("endDate", "Ngày kết thúc", "date", r.endDate?.slice(0, 10)),
    field("startMonthDay", "Bắt đầu hằng năm (MM-DD)", "text", r.startMonthDay),
    field("endMonthDay", "Kết thúc hằng năm (MM-DD)", "text", r.endMonthDay),
    field("percent", "Tăng giá (%)", "number", r.percent ?? 10),
  ]);
}
