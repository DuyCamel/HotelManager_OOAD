/** Admin/Quản lý quản trị tài khoản thường; chỉ Quản lý được chuyển quyền cao nhất. */
const v = require("../../core/validation/fields");
const { ensure } = require("../../core/errors/AppError");
const { allow, has, grants, labels } = require("../../core/auth/rbac");
const passwords = require("../../core/auth/passwords");
const { audit } = require("../_shared/stayRules");

const assignableRoles = ["ADMIN", "RECEPTIONIST", "HOUSEKEEPER"];
const permissionLabels = {
  accounts: "Quản lý tài khoản",
  "accounts.assign": "Đổi vai trò nhân viên",
  admin: "Nhật ký hệ thống, sao lưu/khôi phục và chuyển quyền Quản lý",
  reports: "Báo cáo và thống kê",
  catalog: "Danh mục phòng và dịch vụ",
  "services.read": "Xem bảng giá dịch vụ",
  config: "Cấu hình vận hành và thanh toán",
  bookings: "Đặt phòng",
  customers: "Hồ sơ khách hàng",
  stays: "Lưu trú",
  usage: "Dịch vụ phát sinh",
  cards: "Thẻ thành viên",
  invoices: "Hóa đơn",
  board: "Sơ đồ phòng",
  clean: "Buồng phòng",
  self: "Cổng thông tin cá nhân",
};

module.exports = (repo) => ({
  async overview(user) {
    allow(user, "accounts");
    const hierarchy = ["MANAGER", "ADMIN", "RECEPTIONIST", "HOUSEKEEPER", "CUSTOMER"];
    const visibleRoles = hierarchy.filter(
      (role) => grants[role] && (user.role === "MANAGER" || role !== "MANAGER"),
    );
    return {
      viewerId: user.id,
      capabilities: {
        createStaff: true,
        assignRoles: has(user, "accounts.assign"),
        transferAdmin: has(user, "admin"),
      },
      roles: visibleRoles.map((role) => ({
        code: role,
        label: labels[role],
        permissions: grants[role].map(
          (permission) => permissionLabels[permission] || permission,
        ),
      })),
    };
  },
  async create(user, b) {
    allow(user, "accounts");
    const role = v.text(b.role, "Vai trò", 20);
    ensure(assignableRoles.includes(role), "Chỉ tạo tài khoản nhân viên.");
    const password = v.password(b.password);
    ensure(password.length >= 8, "Mật khẩu tối thiểu 8 ký tự.");
    const email = v.email(b.email),
      phone = v.phone(b.phone),
      passwordHash = await passwords.hash(password);
    const convertCustomer = b.convertCustomer === true || b.convertCustomer === "true";
    return repo.transaction(async (tx) => {
      const allAccounts = await tx.list("accounts");
      const existingEmail = allAccounts.find(
        (a) => String(a.email).toLowerCase() === email,
      );
      const existingPhone = allAccounts.find((a) => a.phone === phone);

      // 1. Conflict with STAFF account (never convert staff in create)
      const staffConflict = [existingEmail, existingPhone].find(
        (a) => a && a.role !== "CUSTOMER",
      );
      if (staffConflict) {
        const isEmailConflict = staffConflict === existingEmail;
        const fieldName = isEmailConflict ? "Email" : "Số điện thoại";
        const val = isEmailConflict ? email : phone;
        ensure(
          false,
          `${fieldName} '${val}' đã thuộc tài khoản nhân sự ${labels[staffConflict.role] || staffConflict.role} '${staffConflict.name}'. Vui lòng dùng ${fieldName.toLowerCase()} khác.`,
          409,
        );
      }

      // 2. Conflict with CUSTOMER account - ask or convert
      const customerConflict = [existingEmail, existingPhone].find(
        (a) => a && a.role === "CUSTOMER",
      );
      if (customerConflict) {
        if (!convertCustomer) {
          ensure(
            false,
            `Thông tin này đang gắn với tài khoản Khách hàng '${customerConflict.name}'. Bạn có muốn chuyển đổi tài khoản khách này thành nhân viên không? Hãy xác nhận chuyển đổi hoặc nhập email/SĐT khác.`,
            409,
          );
        }
        ensure(
          user.role === "MANAGER",
          "Chỉ Quản lý mới có quyền chuyển đổi tài khoản khách hàng thành nhân sự.",
          403,
        );

        ensure(
          !allAccounts.some(
            (x) => x.id !== customerConflict.id && String(x.email).toLowerCase() === email,
          ),
          `Email '${email}' đã được sử dụng bởi tài khoản khác.`,
          409,
        );
        ensure(
          !allAccounts.some(
            (x) => x.id !== customerConflict.id && x.phone === phone,
          ),
          `Số điện thoại '${phone}' đã được sử dụng bởi tài khoản khác.`,
          409,
        );

        await tx.update("accounts", customerConflict.id, {
          role,
          name: v.text(b.name, "Họ tên", 120),
          email,
          phone,
          passwordHash,
          authVersion: Number(customerConflict.authVersion || 0) + 1,
        });

        const allCustomers = await tx.list("customers");
        const custRecord = allCustomers.find((c) => c.accountId === customerConflict.id);
        if (custRecord) {
          await tx.update("customers", custRecord.id, {
            name: v.text(b.name, "Họ tên", 120),
            phone,
          });
        }

        await audit(
          tx,
          user,
          "Chuyển đổi khách hàng thành nhân viên",
          "ACCOUNT",
          customerConflict.id,
          `Từ CUSTOMER sang ${role}`,
        );

        const updated = await tx.find("accounts", customerConflict.id);
        return v.safeAccount(updated);
      }

      // 3. Conflict with walk-in guest in customers table
      const allCustomers = await tx.list("customers");
      const existingCust = allCustomers.find(
        (c) => c.phone === phone && !c.accountId,
      );
      if (existingCust) {
        ensure(
          false,
          `Số điện thoại '${phone}' đã được lưu trong hồ sơ khách lưu trú '${existingCust.name}'. Vui lòng dùng số điện thoại khác cho nhân viên.`,
          409,
        );
      }

      const account = {
        id: v.id("TK"),
        email,
        name: v.text(b.name, "Họ tên", 120),
        phone,
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
        user.role === "MANAGER" || a.role !== "MANAGER",
        "Admin không được sửa tài khoản Quản lý.",
        403,
      );
      const email = v.email(b.email);
      const phone = v.phone(b.phone);
      const allAccounts = await tx.list("accounts");
      const existingEmail = allAccounts.find(
        (x) => x.id !== a.id && String(x.email).toLowerCase() === email,
      );
      if (existingEmail) {
        const isCust = existingEmail.role === "CUSTOMER";
        ensure(
          false,
          isCust
            ? `Email '${email}' đã thuộc tài khoản Khách hàng '${existingEmail.name}'.`
            : `Email '${email}' đã thuộc tài khoản nhân sự ${labels[existingEmail.role] || existingEmail.role} '${existingEmail.name}'.`,
          409,
        );
      }

      const existingPhone = allAccounts.find(
        (x) => x.id !== a.id && x.phone === phone,
      );
      if (existingPhone) {
        const isCust = existingPhone.role === "CUSTOMER";
        ensure(
          false,
          isCust
            ? `Số điện thoại '${phone}' đã thuộc tài khoản Khách hàng '${existingPhone.name}'.`
            : `Số điện thoại '${phone}' đã thuộc tài khoản nhân sự ${labels[existingPhone.role] || existingPhone.role} '${existingPhone.name}'.`,
          409,
        );
      }

      const allCustomers = await tx.list("customers");
      const existingCust = allCustomers.find(
        (c) => c.phone === phone && c.accountId !== a.id,
      );
      if (existingCust) {
        ensure(
          false,
          `Số điện thoại '${phone}' đã được lưu trong hồ sơ khách hàng '${existingCust.name}'.`,
          409,
        );
      }

      const changes = {
        email,
        name: v.text(b.name, "Họ tên", 120),
        phone,
      };
      await tx.update("accounts", a.id, changes);
      if (a.role === "CUSTOMER") {
        const customer = (await tx.list("customers")).find(
          (row) => row.accountId === a.id,
        );
        if (customer)
          await tx.update("customers", customer.id, {
            name: changes.name,
            phone: changes.phone,
          });
      }
      await audit(tx, user, "Sửa tài khoản", "ACCOUNT", a.id);
      return { ok: true };
    });
  },
  async toggle(user, b) {
    allow(user, "accounts");
    return repo.transaction(async (tx) => {
      const a = await tx.find("accounts", b.id);
      ensure(a, "Không tìm thấy tài khoản.", 404);
      ensure(a.role !== "MANAGER", "Không thể khóa tài khoản Quản lý.", 403);
      ensure(
        a.id !== user.id,
        "Không thể khóa tài khoản đang đăng nhập.",
        409,
      );
      await tx.update("accounts", a.id, {
        isActive: !a.isActive,
        authVersion: Number(a.authVersion) + 1,
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
    allow(user, "accounts.assign");
    const role = v.text(b.role, "Vai trò", 20);
    ensure(assignableRoles.includes(role), "Vai trò không hợp lệ.");
    return repo.transaction(async (tx) => {
      const a = await tx.find("accounts", b.id);
      ensure(a, "Không tìm thấy tài khoản.", 404);
      ensure(
        a.isActive && a.role !== "MANAGER",
        "Không thể phân quyền tài khoản này.",
      );
      ensure(a.id !== user.id, "Không thể tự thay đổi vai trò.", 409);
      await tx.update("accounts", a.id, {
        role,
        authVersion: Number(a.authVersion) + 1,
      });
      await audit(tx, user, "Phân quyền", "ACCOUNT", a.id, `Từ ${a.role} sang ${role}`);
      return { ok: true };
    });
  },
});
