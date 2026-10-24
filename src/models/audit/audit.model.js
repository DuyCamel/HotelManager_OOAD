/** Dữ liệu audit. TODO TV1 A3: truy vấn lọc/phân trang và nghiệp vụ còn lại trong docs/MODULES.md. */
const { allow } = require("../../core/auth/rbac");
module.exports = (repo) => ({
  async list(user) {
    allow(user, "admin");
    return Object.fromEntries(
      await Promise.all(
        ["audit"].map(async (key) => [key, await repo.list(key)]),
      ),
    );
  },
});
