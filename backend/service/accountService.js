/**
 * TASK-BAN-GIAO (TODO) | Phụ trách: TV1 | Mã việc: A1
 * Đây là việc còn lại/nghiệm thu, không phải mô tả tính năng đã hoàn tất.
 * Hỗ trợ dữ liệu hai nhóm Nhân viên/Khách hàng; tab Khách hàng không có phân quyền.
 * Nghiệm thu Admin/Quản lý, khóa tài khoản và thu hồi phiên; không cấp quyền Admin qua role().
 * Chi tiết, phụ thuộc và tiêu chí xong: docs/PHAN_CONG_3_NGUOI.md.
 */
/** Quản lý chỉ xem/sửa/khóa/mở tài khoản thường; tạo nhân viên, phân quyền, chuyển Admin chỉ Admin. */
const v = require("../shared/validation");
const { ensure } = require("../shared/errors");
const { allow } = require("../shared/permissions");
const passwords = require("../shared/passwords");
const { audit } = require("./helpers");
module.exports = (repo) => ({
  async create(user, b) {
    allow(user, "admin");
    const role = v.text(b.role, "Vai trò", 20);
    ensure(
      ["MANAGER", "RECEPTIONIST", "HOUSEKEEPER"].includes(role),
      "Chỉ tạo tài khoản nhân viên.",
    );
    const password = v.password(b.password);
    ensure(password.length >= 8, "Mật khẩu tối thiểu 8 ký tự.");
    const email = v.email(b.email),
      passwordHash = await passwords.hash(password);
    return repo.transaction(async (tx) => {
      ensure(
        !(await tx.list("accounts")).some((a) => a.email === email),
        "Email đã tồn tại.",
        409,
      );
      const account = {
        id: v.id("TK"),
        email,
        name: v.text(b.name, "Họ tên", 120),
        phone: v.phone(b.phone),
        passwordHash,
        role,
        isActive: true,
        authVersion: 0,
        createdAt: new Date().toISOString(),
      };
      await tx.insert("accounts", account);
      await audit(tx, user, "Tạo nhân viên", "ACCOUNT", account.id);
      return v.safeAccount(account);
    });
  },
  async update(user, b) {
    allow(user, "accounts");
    return repo.transaction(async (tx) => {
      const a = await tx.find("accounts", b.id);
      ensure(a, "Không tìm thấy tài khoản.", 404);
      ensure(
        user.role === "ADMIN" || a.role !== "ADMIN",
        "Quản lý không được sửa tài khoản Admin.",
        403,
      );
      const email = v.email(b.email);
      ensure(
        !(await tx.list("accounts")).some(
          (x) => x.id !== a.id && x.email === email,
        ),
        "Email đã tồn tại.",
        409,
      );
      await tx.update("accounts", a.id, {
        email,
        name: v.text(b.name, "Họ tên", 120),
        phone: v.phone(b.phone),
      });
      await audit(tx, user, "Sửa tài khoản", "ACCOUNT", a.id);
      return { ok: true };
    });
  },
  async toggle(user, b) {
    allow(user, "accounts");
    return repo.transaction(async (tx) => {
      const a = await tx.find("accounts", b.id);
      ensure(
        a && a.role !== "ADMIN" && a.id !== user.id,
        "Không khóa Admin hoặc tài khoản đang đăng nhập.",
      );
      await tx.update("accounts", a.id, {
        isActive: !a.isActive,
        authVersion: a.authVersion + 1,
      });
      await audit(
        tx,
        user,
        a.isActive ? "Khóa tài khoản" : "Khôi phục tài khoản",
        "ACCOUNT",
        a.id,
      );
      return { ok: true };
    });
  },
  async role(user, b) {
    allow(user, "admin");
    ensure(
      ["MANAGER", "RECEPTIONIST", "HOUSEKEEPER"].includes(b.role),
      "Vai trò không hợp lệ.",
    );
    return repo.transaction(async (tx) => {
      const a = await tx.find("accounts", b.id);
      ensure(
        a && a.isActive && !["ADMIN", "CUSTOMER"].includes(a.role),
        "Không thể phân quyền tài khoản này.",
      );
      await tx.update("accounts", a.id, {
        role: b.role,
        authVersion: a.authVersion + 1,
      });
      await audit(tx, user, "Phân quyền", "ACCOUNT", a.id, b.role);
      return { ok: true };
    });
  },
});
