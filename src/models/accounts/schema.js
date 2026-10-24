/** Mapping cột SQL của accounts. TODO TV3 C1: giữ đúng kiểu/độ dài trong database/01_schema.sql. */
module.exports = {
  accounts: [
    "Account",
    "AccountId",
    {
      email: "Email",
      passwordHash: "PasswordHash",
      name: "FullName",
      phone: "Phone",
      role: "RoleCode",
      isActive: "IsActive",
      authVersion: "AuthVersion",
      createdAt: "CreatedAt",
    },
  ],
};
