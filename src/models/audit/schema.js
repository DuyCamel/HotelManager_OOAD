/** Mapping cột SQL của audit. TODO TV3 C1: giữ đúng kiểu/độ dài trong database/01_schema.sql. */
module.exports = {
  audit: [
    "AuditEvent",
    "AuditEventId",
    {
      eventAt: "EventAt",
      actorId: "ActorId",
      action: "ActionName",
      objectType: "ObjectType",
      objectId: "ObjectId",
      detail: "Detail",
    },
    true,
  ],
};
