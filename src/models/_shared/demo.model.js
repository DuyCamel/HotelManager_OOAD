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
      if (auto)
        row.id = d[k].reduce((m, x) => Math.max(m, Number(x.id) || 0), 0) + 1;
      ensure(
        !d[k].some((x) => String(x.id) === String(row.id)),
        "Mã đã tồn tại.",
        409,
      );
      d[k].push(row);
      return copy(row);
    },
    async update(k, id, changes) {
      const r = d[k].find((x) => String(x.id) === String(id));
      ensure(r, "Không tìm thấy dữ liệu.", 404);
      Object.assign(r, copy(changes));
    },
    async finalizeInvoice(id) {
      const inv = d.invoices.find((x) => x.id === id);
      ensure(inv && inv.status === "DRAFT", "Hóa đơn đã hoàn tất.");
      inv.status = "PAID";
      const card = d.cards.find(
        (c) => c.customerId === inv.customerId && c.isActive,
      );
      if (card) {
        ensure(
          !d.points.some((p) => p.id === id),
          "Hóa đơn đã được cộng điểm.",
        );
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
    ensure(
      data.meta?.version === 2 &&
        Object.keys(defs).every((k) => Array.isArray(data[k])),
      "Bản sao không hợp lệ.",
    );
    ensure(
      data.accounts.filter((a) => a.role === "ADMIN" && a.isActive).length ===
        1,
      "Bản sao cần đúng một Admin.",
    );
    await locked(async () => {
      await save(data);
      state = copy(data);
    });
  },
  async close() {},
};
