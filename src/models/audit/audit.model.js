/** Filtered audit trail with bounded paging and spreadsheet-safe export. */
const { allow } = require("../../core/auth/rbac");
const { ensure } = require("../../core/errors/AppError");
const v = require("../../core/validation/fields");
const config = require("../../config/env");
const { localDatePart } = require("../_shared/stayRules");

const EXPORT_LIMIT = 10000;

const optionalText = (value, label, max) => {
  if (value === undefined || value === null || value === "") return "";
  ensure(typeof value === "string", `${label} không hợp lệ.`);
  const result = value.trim();
  ensure(result.length <= max, `${label} tối đa ${max} ký tự.`);
  return result;
};
const positiveInteger = (value, fallback, min, max, label) => {
  if (value === undefined || value === null || value === "") return fallback;
  ensure(/^\d+$/.test(String(value)), `${label} không hợp lệ.`);
  const result = Number(value);
  ensure(result >= min && result <= max, `${label} không hợp lệ.`);
  return result;
};
const businessDate = (value) => {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? localDatePart(parsed) : null;
};
const csvCell = (value) => {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
};

function filters(query = {}) {
  const result = {
    q: optionalText(query.q, "Từ khóa", 100),
    actor: optionalText(query.actor, "Người thao tác", 40),
    action: optionalText(query.action, "Hành động", 100),
    objectType: optionalText(query.objectType, "Loại đối tượng", 30),
    from: query.from ? v.calendarDate(query.from, "Từ ngày") : "",
    to: query.to ? v.calendarDate(query.to, "Đến ngày") : "",
  };
  ensure(
    !result.from || !result.to || result.from <= result.to,
    "Từ ngày phải trước hoặc bằng đến ngày.",
  );
  return result;
}

module.exports = (repo) => {
  async function filtered(user, query) {
    allow(user, "admin");
    const selected = filters(query);
    const [events, accounts] = await Promise.all([
      repo.list("audit"),
      repo.list("accounts"),
    ]);
    const actors = new Map(
      accounts.map((account) => [
        String(account.id),
        `${account.name} (${account.email})`,
      ]),
    );
    const rows = events
      .filter((event) => {
        const actor = event.actorId ? String(event.actorId) : "SYSTEM";
        const day = businessDate(event.eventAt);
        if (selected.actor && selected.actor !== actor) return false;
        if (selected.action && selected.action !== event.action) return false;
        if (selected.objectType && selected.objectType !== event.objectType)
          return false;
        if (selected.from && (!day || day < selected.from)) return false;
        if (selected.to && (!day || day > selected.to)) return false;
        if (selected.q) {
          const haystack = [
            event.action,
            event.objectType,
            event.objectId,
            event.detail,
            actors.get(String(event.actorId)),
          ]
            .join(" ")
            .toLocaleLowerCase("vi");
          if (!haystack.includes(selected.q.toLocaleLowerCase("vi")))
            return false;
        }
        return true;
      })
      .sort((a, b) => {
        const byTime = Date.parse(b.eventAt) - Date.parse(a.eventAt);
        return byTime || Number(b.id) - Number(a.id);
      })
      .map((event) => ({
        ...event,
        actorLabel: event.actorId
          ? actors.get(String(event.actorId)) || String(event.actorId)
          : "Hệ thống",
      }));
    return { rows, selected, events, actors };
  }

  return {
    async list(user, query = {}) {
      const result = await filtered(user, query);
      const page = positiveInteger(query.page, 1, 1, 1000000, "Trang");
      const pageSize = positiveInteger(
        query.pageSize,
        25,
        10,
        100,
        "Số dòng mỗi trang",
      );
      const pages = Math.max(1, Math.ceil(result.rows.length / pageSize));
      const currentPage = Math.min(page, pages);
      const actorIds = [
        ...new Set(result.events.map((event) => event.actorId || "SYSTEM")),
      ];
      return {
        generatedAt: new Date().toISOString(),
        timeZone: config.timeZone,
        filters: result.selected,
        options: {
          actors: actorIds
            .map((id) => ({
              id,
              label:
                id === "SYSTEM"
                  ? "Hệ thống"
                  : result.actors.get(String(id)) || String(id),
            }))
            .sort((a, b) => a.label.localeCompare(b.label, "vi")),
          actions: [...new Set(result.events.map((event) => event.action))].sort(
            (a, b) => a.localeCompare(b, "vi"),
          ),
          objectTypes: [
            ...new Set(result.events.map((event) => event.objectType)),
          ].sort(),
        },
        pagination: {
          page: currentPage,
          pageSize,
          pages,
          total: result.rows.length,
        },
        rows: result.rows.slice(
          (currentPage - 1) * pageSize,
          currentPage * pageSize,
        ),
      };
    },
    async csv(user, query = {}) {
      const result = await filtered(user, query);
      const limited = result.rows.slice(0, EXPORT_LIMIT);
      const rows = [
        [
          "Thời gian UTC",
          `Ngày ${config.timeZone}`,
          "Người thao tác",
          "Hành động",
          "Loại đối tượng",
          "Mã đối tượng",
          "Chi tiết",
        ],
        ...limited.map((event) => [
          event.eventAt,
          businessDate(event.eventAt),
          event.actorLabel,
          event.action,
          event.objectType,
          event.objectId,
          event.detail,
        ]),
      ];
      if (result.rows.length > EXPORT_LIMIT)
        rows.push([
          "",
          "",
          "",
          "",
          "",
          "",
          `Đã giới hạn ${EXPORT_LIMIT}/${result.rows.length} bản ghi.`,
        ]);
      const suffix = [result.selected.from, result.selected.to]
        .filter(Boolean)
        .join("-");
      return {
        filename: `nhat-ky${suffix ? `-${suffix}` : ""}.csv`,
        content:
          "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n"),
      };
    },
  };
};
