/** Hồ sơ khách không bắt buộc tài khoản. Thẻ không xóa, không có API chỉnh điểm. */
const path = require("path");
const fs = require("fs");
const config = require("../../config/env");
const v = require("../../core/validation/fields");
const { ensure } = require("../../core/errors/AppError");
const { allow, has } = require("../../core/auth/rbac");
const h = require("../_shared/stayRules");

const requestsFile = path.join(
  config.root,
  "data",
  ".membership_disable_requests.json",
);

function readDisableRequests() {
  try {
    if (fs.existsSync(requestsFile)) {
      return JSON.parse(fs.readFileSync(requestsFile, "utf8"));
    }
  } catch {
    // fallback
  }
  return {};
}

function writeDisableRequests(map) {
  try {
    fs.mkdirSync(path.dirname(requestsFile), { recursive: true });
    fs.writeFileSync(requestsFile, JSON.stringify(map, null, 2), "utf8");
  } catch {
    // fallback
  }
}

const factory = (repo) => ({
  async data(user) {
    let cards;
    if (has(user, "cards")) cards = await repo.list("cards");
    else {
      allow(user, "self");
      const customerIds = new Set(
        (await repo.list("customers"))
          .filter((x) => x.accountId === user.id)
          .map((x) => x.id),
      );
      cards = (await repo.list("cards")).filter((x) =>
        customerIds.has(x.customerId),
      );
    }
    const requests = readDisableRequests();
    cards = cards.map((c) => ({
      ...c,
      disableRequest:
        requests[c.id] && requests[c.id].status === "PENDING"
          ? requests[c.id]
          : null,
    }));
    const cardIds = new Set(cards.map((x) => x.id));
    const points = (await repo.list("points"))
      .filter((x) => cardIds.has(x.cardId))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    return { cards, points };
  },
  async issueCard(user, b) {
    allow(user, "cards");
    const customerId = v.text(b.customerId, "Mã khách hàng", 20);
    return repo.transaction(async (tx) => {
      const c = await tx.find("customers", customerId);
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
  async requestDisable(user, b) {
    allow(user, "cards");
    const id = v.text(b.id, "Mã thẻ", 20);
    const reason = v.text(
      b.reason || "Lễ tân yêu cầu vô hiệu hóa thẻ",
      "Lý do",
      255,
    );
    return repo.transaction(async (tx) => {
      const card = await tx.find("cards", id);
      ensure(card?.isActive, "Thẻ không hoạt động.");
      const requests = readDisableRequests();
      ensure(
        !requests[card.id] || requests[card.id].status !== "PENDING",
        "Thẻ này đã có yêu cầu vô hiệu hóa đang chờ Admin duyệt.",
      );
      requests[card.id] = {
        cardId: card.id,
        requestedBy: user.name || user.email || user.id,
        requesterRole: user.role,
        requesterId: user.id,
        requestedAt: new Date().toISOString(),
        reason,
        status: "PENDING",
      };
      writeDisableRequests(requests);
      await h.audit(tx, user, "Yêu cầu vô hiệu hóa thẻ", "MEMBERSHIP", card.id);
      return { ok: true, status: "PENDING" };
    });
  },
  async approveDisable(user, b) {
    ensure(
      ["ADMIN", "MANAGER"].includes(user?.role),
      "Chỉ Admin hoặc Quản lý mới có quyền phê duyệt vô hiệu hóa thẻ.",
      403,
    );
    const id = v.text(b.id, "Mã thẻ", 20);
    return repo.transaction(async (tx) => {
      const card = await tx.find("cards", id);
      ensure(card?.isActive, "Thẻ không hoạt động.");
      await tx.update("cards", card.id, { isActive: false });
      const requests = readDisableRequests();
      if (requests[card.id]) {
        requests[card.id].status = "APPROVED";
        requests[card.id].approvedBy = user.name || user.email || user.id;
        requests[card.id].approvedAt = new Date().toISOString();
        writeDisableRequests(requests);
      }
      await h.audit(tx, user, "Duyệt vô hiệu hóa thẻ", "MEMBERSHIP", card.id);
      return { ok: true };
    });
  },
  async rejectDisable(user, b) {
    ensure(
      ["ADMIN", "MANAGER"].includes(user?.role),
      "Chỉ Admin hoặc Quản lý mới có quyền từ chối yêu cầu vô hiệu hóa thẻ.",
      403,
    );
    const id = v.text(b.id, "Mã thẻ", 20);
    const requests = readDisableRequests();
    ensure(
      requests[id] && requests[id].status === "PENDING",
      "Không có yêu cầu chờ duyệt cho thẻ này.",
    );
    requests[id].status = "REJECTED";
    requests[id].rejectedBy = user.name || user.email || user.id;
    requests[id].rejectedAt = new Date().toISOString();
    writeDisableRequests(requests);
    await repo.transaction(async (tx) => {
      await h.audit(tx, user, "Từ chối vô hiệu hóa thẻ", "MEMBERSHIP", id);
    });
    return { ok: true };
  },
  async reactivateCard(user, b) {
    ensure(
      ["ADMIN", "MANAGER"].includes(user?.role),
      "Chỉ Admin hoặc Quản lý mới có quyền mở lại thẻ thành viên.",
      403,
    );
    const id = v.text(b.id, "Mã thẻ", 20);
    return repo.transaction(async (tx) => {
      const card = await tx.find("cards", id);
      ensure(card, "Không tìm thấy thẻ.");
      ensure(!card.isActive, "Thẻ này hiện đang hoạt động, không cần mở lại.");
      await tx.update("cards", card.id, { isActive: true });
      const requests = readDisableRequests();
      if (requests[card.id]) {
        delete requests[card.id];
        writeDisableRequests(requests);
      }
      await h.audit(tx, user, "Mở lại thẻ thành viên", "MEMBERSHIP", card.id);
      return { ok: true, message: "Đã mở lại thẻ thành viên thành công." };
    });
  },
  async disableCard(user, b) {
    allow(user, "cards");
    ensure(
      ["ADMIN", "MANAGER"].includes(user?.role),
      "Lễ tân không có quyền vô hiệu hóa thẻ trực tiếp mà cần gửi yêu cầu để Admin phê duyệt.",
      403,
    );
    const id = v.text(b.id, "Mã thẻ", 20);
    return repo.transaction(async (tx) => {
      const card = await tx.find("cards", id);
      ensure(card?.isActive, "Thẻ không hoạt động.");
      await tx.update("cards", card.id, { isActive: false });
      const requests = readDisableRequests();
      if (requests[card.id]) {
        requests[card.id].status = "APPROVED";
        requests[card.id].approvedBy = user.name || user.email || user.id;
        requests[card.id].approvedAt = new Date().toISOString();
        writeDisableRequests(requests);
      }
      await h.audit(tx, user, "Vô hiệu hóa thẻ", "MEMBERSHIP", card.id);
      return { ok: true };
    });
  },
});

factory.readDisableRequests = readDisableRequests;
module.exports = factory;
