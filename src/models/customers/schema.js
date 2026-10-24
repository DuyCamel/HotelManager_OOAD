/** Mapping cột SQL của customers. TODO TV3 C1: giữ đúng kiểu/độ dài trong database/01_schema.sql. */
module.exports = {
  customers: [
    "Customer",
    "CustomerId",
    {
      name: "FullName",
      phone: "Phone",
      identityNo: "IdentityNo",
      address: "Address",
      accountId: "AccountId",
      isActive: "IsActive",
      createdAt: "CreatedAt",
    },
  ],
};
