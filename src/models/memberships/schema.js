/** Mapping cột SQL của memberships. TODO TV3 C1: giữ đúng kiểu/độ dài trong database/01_schema.sql. */
module.exports = {
  cards: [
    "Membership",
    "MembershipId",
    {
      customerId: "CustomerId",
      points: "Points",
      isActive: "IsActive",
      issuedAt: "IssuedAt",
    },
  ],
  points: [
    "MembershipPointEntry",
    "InvoiceId",
    {
      cardId: "MembershipId",
      points: "Points",
      createdAt: "CreatedAt",
    },
  ],
};
