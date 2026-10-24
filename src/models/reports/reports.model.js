/** Dữ liệu reports. TODO TV3 C4: truy vấn lọc/phân trang và nghiệp vụ còn lại trong docs/MODULES.md. */
const { allow } = require("../../core/auth/rbac");
module.exports = (repo) => ({
  async list(user) {
    allow(user, "reports");
    return Object.fromEntries(
      await Promise.all(
        ["invoices", "rooms", "types"].map(async (key) => [
          key,
          await repo.list(key),
        ]),
      ),
    );
  },
});
