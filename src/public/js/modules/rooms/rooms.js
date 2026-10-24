import fields0 from "../rooms/fields.js";
import fields1 from "../room-types/fields.js";
import fields2 from "../services/fields.js";
import fields3 from "../holiday-rates/fields.js";
const fieldBuilders = {
  rooms: fields0,
  types: fields1,
  services: fields2,
  holidays: fields3,
};
/** UI rooms. TODO TV3: nhiệm vụ cụ thể trong docs/MODULES.md và PHAN_CONG_3_NGUOI.md. */
export default function createModule(ctx) {
  const {
    money,
    E,
    name,
    badge,
    btn,
    field,
    opts,
    actionForm,
    table,
    d,
    page,
    query,
  } = ctx;
  function catalogPanel() {
    let kind = sessionStorage.getItem("catalogTab") || "rooms";
    if (!["rooms", "types", "services", "holidays"].includes(kind))
      kind = "rooms";
    const tabs = `<div class="tabs">${[
      ["rooms", "Phòng"],
      ["types", "Loại & giá phòng"],
      ["services", "Dịch vụ"],
      ["holidays", "Giá lễ"],
    ]
      .map(
        ([k, t]) =>
          `<a class="small ${kind === k ? "primary" : ""}" href="/app/${{ rooms: "rooms", types: "room-types", services: "services", holidays: "holiday-rates" }[k]}">${t}</a>`,
      )
      .join("")}</div>`;
    const rows = d[kind];
    return (
      tabs +
      table(rows, [
        [
          "Mã / Tên",
          (r) => `<strong>${E(r.name)}</strong><small>${E(r.id)}</small>`,
        ],
        [
          "Thông tin",
          (r) =>
            kind === "rooms"
              ? E(name("types", r.typeId))
              : kind === "types"
                ? `${r.capacity} khách · ${r.beds} giường`
                : kind === "services"
                  ? E(r.unit)
                  : `${E(name("types", r.typeId))}<small>${E(r.startDate.slice(0, 10))} → ${E(r.endDate.slice(0, 10))}</small>`,
        ],
        [
          "Giá / Trạng thái",
          (r) =>
            kind === "rooms"
              ? badge(r.status)
              : kind === "types"
                ? money(r.dailyPrice) + "/ ngày"
                : kind === "services"
                  ? money(r.price)
                  : "+" + r.percent + "%",
        ],
        [
          "Thao tác",
          (r) =>
            btn("Chỉnh sửa", "catalog.edit", r.id) +
            (kind !== "types"
              ? btn(
                  kind === "rooms"
                    ? r.status === "DISABLED"
                      ? "Mở"
                      : "Khóa"
                    : r.isActive
                      ? "Ngừng"
                      : "Mở",
                  "catalog.toggle",
                  r.id,
                )
              : ""),
        ],
      ])
    );
  }
  function catalogFields(kind, r = {}) {
    return fieldBuilders[kind](r, field, opts);
  }
  return {
    render() {
      let html = "";
      switch (page) {
        case "catalog":
          html = catalogPanel();
          break;
      }
      return html;
    },
    async act(action, id) {
      const hidden = () => field("id", "", "hidden", id);
      if (action === "catalog.tab") {
        sessionStorage.setItem("catalogTab", id);
        query = "";
        return render();
      }
      if (action === "catalog.new" || action === "catalog.edit") {
        const kind = sessionStorage.getItem("catalogTab") || "rooms";
        return actionForm(
          "Danh mục " +
            {
              rooms: "phòng",
              types: "loại phòng",
              services: "dịch vụ",
              holidays: "giá lễ",
            }[kind],
          catalogFields(
            kind,
            d[kind].find((x) => x.id === id),
          ),
          "catalog.save",
        );
      }
      if (action === "catalog.toggle")
        return actionForm(
          "Đổi trạng thái danh mục",
          [
            hidden(),
            field(
              "kind",
              "",
              "hidden",
              sessionStorage.getItem("catalogTab") || "rooms",
            ),
          ],
          action,
        );
    },
    catalogPanel,
    catalogFields,
  };
}
