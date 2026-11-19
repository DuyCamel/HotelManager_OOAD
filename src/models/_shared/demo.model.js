/**
 * TASK-BAN-GIAO (TODO) | Phụ trách: TV3 | Mã việc: C1, C5, C6
 * Đây là việc còn lại/nghiệm thu, không phải mô tả tính năng đã hoàn tất.
 * Đồng bộ interface truy vấn mới với SQL adapter; giữ hàng đợi ghi và rollback trạng thái khi nghiệp vụ thất bại.
 * Đối chiếu tổng hóa đơn/thanh toán/điểm với SQL khi nghiệm thu B6; JSON demo không thay việc chạy SQL thật.
 * Chi tiết, phụ thuộc và tiêu chí xong: docs/PHAN_CONG_3_NGUOI.md.
 */
/** Repository demo có hàng đợi ghi, clone trước thay đổi và đổi tên file nguyên tử. Không dùng làm CSDL nhiều máy. */
const fs = require("node:fs/promises");
const path = require("node:path");
const config = require("../../config/env");
const { defs } = require("./definitions");
const seed = require("./demo.seed");
const { ensure } = require("../../core/errors/AppError");
let state;
let tail = Promise.resolve();
const copy = (v) => structuredClone(v);
async function save(d) {
  await fs.mkdir(path.dirname(config.demoFile), { recursive: true });
  const temp = config.demoFile + ".tmp";
  await fs.writeFile(temp, JSON.stringify(d), { mode: 0o600 });
  await fs.rename(temp, config.demoFile);
}
function client(d) {
  const ensureUnique = (entity, row, current = null) => {
    if (entity === "paymentIntents" && row.status === "PENDING")
      ensure(
        !d.paymentIntents.some(
          (item) => item !== current && item.status === "PENDING" &&
            item.kind === row.kind &&
            (row.kind === "DEPOSIT"
              ? item.bookingId === row.bookingId
              : item.stayId === row.stayId),
        ),
        "A pending payment intent already exists for this target.",
        409,
      );
    if (entity === "sepayReceipts")
      ensure(
        !d.sepayReceipts.some(
          (item) => item !== current && (
            (row.paymentId != null && item.paymentId === row.paymentId) ||
            (row.intentId != null && row.outcome === "APPLIED" &&
              item.outcome === "APPLIED" && item.intentId === row.intentId)
          ),
        ),
        "This payment or intent already has an applied receipt.",
        409,
      );
  };
  const paidInvoice = (invoiceId) =>
    invoiceId &&
    d.invoices.find(
      (invoice) =>
        String(invoice.id) === String(invoiceId) && invoice.status === "PAID",
    );
  const ensureMutable = (entity, row, changes = null) => {
    if (entity === "invoices")
      ensure(row.status !== "PAID", "Hóa đơn đã thanh toán là bất biến.", 409);
    if (["lines", "payments", "usage"].includes(entity))
      ensure(
        !paidInvoice(row.invoiceId),
        "Chi tiết của hóa đơn đã thanh toán là bất biến.",
        409,
      );
    ensure(
      !["points", "audit"].includes(entity),
      "Sổ điểm và nhật ký chỉ được phép ghi thêm.",
      409,
    );
    if (entity === "cards" && changes && Object.hasOwn(changes, "points"))
      ensure(
        Number(changes.points) === Number(row.points),
        "Điểm chỉ được cập nhật khi hoàn tất hóa đơn.",
        409,
      );
  };
  return {
    async list(k) {
      ensure(defs[k], "Dữ liệu không hợp lệ.");
      return copy(d[k]);
    },
    async find(k, id) {
      return copy(d[k].find((x) => String(x.id) === String(id)) || null);
    },
    async insert(k, row) {
      const auto = defs[k][3];
      row = copy(row);
      if (["lines", "payments", "usage"].includes(k))
        ensureMutable(k, row);
      if (auto)
        row.id = d[k].reduce((m, x) => Math.max(m, Number(x.id) || 0), 0) + 1;
      ensure(
        !d[k].some((x) => String(x.id) === String(row.id)),
        "Mã đã tồn tại.",
        409,
      );
      ensureUnique(k, row);
      d[k].push(row);
      return copy(row);
    },
    async update(k, id, changes) {
      const r = d[k].find((x) => String(x.id) === String(id));
      ensure(r, "Không tìm thấy dữ liệu.", 404);
      ensureMutable(k, r, changes);
      ensureUnique(k, { ...r, ...changes }, r);
      Object.assign(r, copy(changes));
    },
    async finalizeInvoice(id) {
      const inv = d.invoices.find((x) => String(x.id) === String(id));
      ensure(
        inv && ["DRAFT", "PAID"].includes(inv.status),
        "Hóa đơn không thể hoàn tất.",
      );
      if (inv.status === "DRAFT") inv.status = "PAID";
      const stay = d.stays.find((x) => x.id === inv.stayId);
      const booking = stay && d.bookings.find((x) => x.id === stay.bookingId);
      const card = d.cards.find(
        (c) =>
          c.customerId === (booking?.customerId || inv.customerId) && c.isActive,
      );
      if (card && !d.points.some((p) => String(p.id) === String(id))) {
        const points = Math.floor(
          (inv.roomCharge + inv.serviceCharge + inv.surcharge - inv.discount) /
            10000,
        );
        card.points += points;
        d.points.push({ id, cardId: card.id, points, createdAt: inv.issuedAt });
      }
    },
  };
}
async function locked(fn) {
  const before = tail;
  let done;
  tail = new Promise((r) => (done = r));
  await before;
  try {
    return await fn();
  } finally {
    done();
  }
}
module.exports = {
  mode: "demo",
  async init() {
    try {
      state = JSON.parse(await fs.readFile(config.demoFile, "utf8"));
      ensure(
        state.meta?.version === 2,
        "Dữ liệu demo cũ không tương thích. Đổi DEMO_DATA_FILE để tạo bản mới.",
      );
      let migrated = false;
      for (const entity of ["paymentIntents", "sepayReceipts"])
        if (state[entity] === undefined) {
          state[entity] = [];
          migrated = true;
        } else {
          ensure(Array.isArray(state[entity]), "Invalid demo payment history.");
        }
      for (const type of state.types || [])
        if (!Array.isArray(type.serviceConfig)) {
          type.serviceConfig = (state.services || [])
            .filter((service) => service.isActive)
            .map((service, index) => ({
              serviceId: service.id,
              included: index < 2,
            }));
          migrated = true;
        }
      const setting = state.settings?.[0] || {};
      for (const invoice of state.invoices || []) {
        const customer = state.customers?.find(
          (item) => item.id === invoice.customerId,
        );
        const roomHistory = state.history
          ?.filter((item) => item.stayId === invoice.stayId)
          .sort((left, right) =>
            String(right.fromAt).localeCompare(String(left.fromAt)),
          )[0];
        const room = state.rooms?.find(
          (item) => item.id === roomHistory?.roomId,
        );
        const payment = state.payments?.find(
          (item) => item.invoiceId === invoice.id,
        );
        const snapshots = {
          customerName: invoice.customerName || customer?.name || null,
          customerIdentity:
            invoice.customerIdentity || customer?.identityNo || null,
          customerPhone: invoice.customerPhone || customer?.phone || null,
          roomName: invoice.roomName || room?.name || null,
          hotelName: invoice.hotelName || setting.hotelName || null,
          hotelAddress: invoice.hotelAddress || setting.address || null,
          hotelHotline: invoice.hotelHotline || setting.hotline || null,
          paymentReference:
            invoice.paymentReference || payment?.externalReference || null,
        };
        if (
          Object.entries(snapshots).some(
            ([key, value]) => invoice[key] !== value,
          )
        ) {
          Object.assign(invoice, snapshots);
          migrated = true;
        }
      }
      if (migrated) await save(state);
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
      state = await seed();
      await save(state);
    }
  },
  async list(k) {
    await tail;
    return client(state).list(k);
  },
  async find(k, id) {
    await tail;
    return client(state).find(k, id);
  },
  async transaction(work) {
    return locked(async () => {
      const draft = copy(state);
      const result = await work(client(draft));
      await save(draft);
      state = draft;
      return result;
    });
  },
  async snapshot() {
    await tail;
    return copy(state);
  },
  async restore(data) {
    data = copy(data);
    if (data?.meta?.version === 2) {
      data.paymentIntents ??= [];
      data.sepayReceipts ??= [];
    }
    ensure(
      data?.meta?.version === 2 &&
        Object.keys(defs).every((k) => Array.isArray(data[k])),
      "Bản sao không hợp lệ.",
    );
    ensure(
      data.accounts.filter((a) => a.role === "MANAGER" && a.isActive).length ===
        1,
      "Bản sao cần đúng một Quản lý.",
    );
    await locked(async () => {
      ensure(
        !state.paymentIntents.length && !state.sepayReceipts.length,
        "Cannot restore demo data after payment intents or receipts exist.",
        409,
      );
      await save(data);
      state = copy(data);
    });
  },
  async close() {},
};
