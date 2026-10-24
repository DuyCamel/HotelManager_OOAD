/** Mapping cột SQL của housekeeping. TODO TV3 C1: giữ đúng kiểu/độ dài trong database/01_schema.sql. */
module.exports = {
  tasks: [
    "HousekeepingTask",
    "TaskId",
    {
      roomId: "RoomId",
      stayId: "StayId",
      checkoutAt: "CheckoutAt",
      deadlineAt: "DeadlineAt",
      completedAt: "CompletedAt",
      status: "StatusCode",
      assignedTo: "AssignedTo",
    },
  ],
  damages: [
    "DamageReport",
    "DamageReportId",
    {
      roomId: "RoomId",
      taskId: "TaskId",
      description: "Description",
      photoPath: "PhotoPath",
      reportedAt: "ReportedAt",
      reportedBy: "ReportedBy",
    },
  ],
};
