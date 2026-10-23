/** Hồ sơ khách không bắt buộc tài khoản. Thẻ không xóa, không có API chỉnh điểm. */
const v = require("../shared/validation");
const { ensure } = require("../shared/errors");
const { allow } = require("../shared/permissions");
const h = require("./helpers");
module.exports = (repo) => ({
  async save(user, b) {
    allow(user, "customers");
    return repo.transaction(async (tx) => {
      const old = b.id ? await tx.find("customers", b.id) : null;
      ensure(!b.id || old?.isActive, "Hồ sơ không tồn tại hoặc đã lưu trữ.");
      const identityNo = v.text(b.identityNo, "CCCD/Hộ chiếu", 30);
      ensure(
        !(await tx.list("customers")).some(
          (c) => c.id !== old?.id && c.identityNo === identityNo,
        ),
        "Giấy tờ đã thuộc hồ sơ khác.",
        409,
      );
      const row = {
        id: old?.id || v.id("KH"),
        name: v.text(b.name, "Họ tên", 120),
        phone: v.phone(b.phone),
        identityNo,
        address: String(b.address || "").slice(0, 512),
        accountId: old?.accountId || null,
        isActive: true,
        createdAt: old?.createdAt || new Date().toISOString(),
      };
      if (old) await tx.update("customers", old.id, row);
      else await tx.insert("customers", row);
      await h.audit(tx, user, "Lưu hồ sơ", "CUSTOMER", row.id);
      return row;
    });
  },
  async archive(user, b) {
    allow(user, "catalog");
    return repo.transaction(async (tx) => {
      const c = await tx.find("customers", b.id);
      ensure(c, "Không có hồ sơ.", 404);
      ensure(
        !(await tx.list("bookings")).some(
          (x) => x.customerId === c.id && h.active(x),
        ),
        "Khách còn giao dịch dang dở.",
      );
      await tx.update("customers", c.id, { isActive: false });
      await h.audit(tx, user, "Lưu trữ hồ sơ", "CUSTOMER", c.id);
      return { ok: true };
    });
  },
  async issueCard(user, b) {
    allow(user, "cards");
    return repo.transaction(async (tx) => {
      const c = await tx.find("customers", b.customerId);
      ensure(c?.isActive, "Hồ sơ không hợp lệ.");
      ensure(
        !(await tx.list("cards")).some((x) => x.customerId === c.id),
        "Khách đã có thẻ, vui lòng tra cứu.",
        409,
      );
      const row = {
        id: v.id("TV"),
        customerId: c.id,
        points: 0,
        isActive: true,
        issuedAt: new Date().toISOString(),
      };
      await tx.insert("cards", row);
      await h.audit(tx, user, "Cấp thẻ", "MEMBERSHIP", row.id);
      return row;
    });
  },
  async disableCard(user, b) {
    allow(user, "cards");
    return repo.transaction(async (tx) => {
      const card = await tx.find("cards", b.id);
      ensure(card?.isActive, "Thẻ không hoạt động.");
      await tx.update("cards", card.id, { isActive: false });
      await h.audit(tx, user, "Vô hiệu hóa thẻ", "MEMBERSHIP", card.id);
      return { ok: true };
    });
  },
});
